import { useState, useCallback, useEffect } from "react";
import { Manifest } from "@/lib/manifest";
import { Message, ConversationPhase, ConversationState, OnboardingData, LLMPlanResponse } from "@/types";

// currently using this custom hook initialized before. 
// Reason? I feel it helps to manage state and logic for the chat component in a more organized way. 
// I coould be wrong, but it's the choice I'm going with for now.

const MAX_TURNS = 5; // Max num of turns before moving to review, might be too short but whatever for now.

export const useChat = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [manifestGenerating, setManifestGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [manifest, setManifest] = useState<Manifest | null>(null);
    const [conversationState, setConversationState] = useState<ConversationState>({
        turnCount: 0,
        phase: "brainstorm",
    });

    useEffect(() => {
        const storedState = sessionStorage.getItem("conversationState");
        if (storedState) {
            try {
                const parsed = JSON.parse(storedState);
                setConversationState(parsed);
            } catch {
                // Invalid data, use defaults
            }
        }

        // Load messages from sessionStorage
        const storedMessages = sessionStorage.getItem("messages");
        if (storedMessages) {
            try {
                const parsed = JSON.parse(storedMessages);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setMessages(parsed);
                }
            } catch {
                // Invalid data, use defaults
            }
        }
    }, []);

    useEffect(() => {
        sessionStorage.setItem("conversationState", JSON.stringify(conversationState));
    }, [conversationState]);

    // Save messages to sessionStorage whenever they change
    useEffect(() => {
        if (messages.length > 0) {
            sessionStorage.setItem("messages", JSON.stringify(messages));
        }
    }, [messages]);

    const sendMessage = useCallback(async (content: string, onboardingData?: OnboardingData): Promise<void> => {
        if (!content.trim()) return;

        // Prevent sending messages if we're in review or complete phase, 
        // might change this if user wants to add more context, it kind of stops and asks to review abruptly.
        if (conversationState.phase === "review" || conversationState.phase === "complete") {
            return;
        }

        const userMessage: Message = { role: "user", content };
        setMessages((prev) => [...prev, userMessage]);
        setLoading(true);
        setError(null);

        try {
            // Build conversation context
            const conversationContext = messages.map((m) => ({
                role: m.role,
                content: m.content,
            }));

            // Add onboarding data.
            let messageContent = content;
            if (onboardingData && messages.length === 0 && onboardingData.name) {
                const pathwayInfo = onboardingData.ctePathway
                    ? `They have selected the CTE pathway: ${onboardingData.ctePathway}.`
                    : "";
                messageContent = `The student's name is ${onboardingData.name}. They are a high school student. ${pathwayInfo} ${content}`;
            } else if (messages.length === 0) {
                // First message - assumes it's a high school student
                messageContent = `You are talking to a high school student. ${content}`;
            }

            // Calling the chat API (for conversation)
            const response = await fetch("/api/llm/plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: messageContent,
                    conversation: conversationContext,
                    turnCount: conversationState.turnCount,
                    phase: conversationState.phase,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to get response");
            }

            const data = await response.json() as LLMPlanResponse;

            // Checking for conversation phase changed (moved to review etc, based on turn count)
            const newPhase = (data.phase as ConversationPhase) || conversationState.phase;
            const newTurnCount = data.turnCount !== undefined ? data.turnCount : conversationState.turnCount + 1;

            setConversationState((prev) => ({
                turnCount: newTurnCount,
                phase: newPhase,
            }));

            // If we get a manifest back, store it
            if (data.manifest && data.manifest.title && data.manifest.ctePathway) {
                setManifest(data.manifest);
                sessionStorage.setItem("manifest", JSON.stringify(data.manifest));
            } else if (data.title && data.ctePathway && data.objectives && data.deliverables && data.timeline && data.assessment && data.resources) {
                // Direct manifest response
                const manifest: Manifest = {
                    title: data.title,
                    ctePathway: data.ctePathway,
                    objectives: data.objectives,
                    deliverables: data.deliverables,
                    timeline: data.timeline,
                    assessment: data.assessment,
                    resources: data.resources,
                    ...(data.content && { content: data.content }),
                };
                setManifest(manifest);
                sessionStorage.setItem("manifest", JSON.stringify(manifest));
            }

            // Add assistant response to messages
            const assistantMessage: Message = {
                role: "assistant",
                content: data.response || "I'm here to help you plan your capstone project. Let's continue our conversation!",
                suggested_replies: data.suggested_replies || undefined,
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    }, [messages, conversationState]);

    const generateManifest = useCallback(async (onboardingData?: OnboardingData): Promise<Manifest | null> => {
        setManifestGenerating(true);
        setError(null);

        try {
            // Build full conversation summary
            const conversationSummary = messages
                .map((m) => `${m.role}: ${m.content}`)
                .join("\n");

            // Include onboarding data, especially CTE pathway, in the manifest generation
            let manifestPrompt = `Generate a complete capstone project manifest based on this conversation:\n\n${conversationSummary}`;

            if (onboardingData?.ctePathway) {
                manifestPrompt = `The student has selected the CTE pathway: ${onboardingData.ctePathway}. ${manifestPrompt}`;
            }

            const response = await fetch("/api/llm/plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: manifestPrompt,
                    generateManifest: true,
                    onboardingData,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to generate manifest");
            }

            const data = await response.json() as LLMPlanResponse;

            // Ensure CTE pathway from onboarding is included if not in generated manifest
            const manifest: Manifest = data as Manifest;
            if (onboardingData?.ctePathway && (!manifest.ctePathway || manifest.ctePathway !== onboardingData.ctePathway)) {
                manifest.ctePathway = onboardingData.ctePathway;
            }

            setManifest(manifest);
            sessionStorage.setItem("manifest", JSON.stringify(manifest));
            return manifest;
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
            return null;
        } finally {
            setManifestGenerating(false);
        }
    }, [messages]);

    return {
        messages,
        loading,
        manifestGenerating,
        error,
        manifest,
        sendMessage,
        generateManifest,
        conversationState,
    };
};