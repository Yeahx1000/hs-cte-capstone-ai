import { useState, useCallback } from "react";
import { Manifest } from "@/lib/manifest";
import { Message } from "@/types";

// currently using this custom hook initialized before. 
// Reason? I feel it helps to manage state and logic for the chat component in a more organized way. 
// I coould be wrong, but it's the choice I'm going with for now.

export const useChat = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [manifest, setManifest] = useState<Manifest | null>(null);

    const sendMessage = useCallback(async (content: string, onboardingData?: any) => {
        if (!content.trim()) return;

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

            // Add onboarding data if available (just name, assuming high school age)
            let messageContent = content;
            if (onboardingData && messages.length === 0 && onboardingData.name) {
                messageContent = `The student's name is ${onboardingData.name}. They are a high school student. ${content}`;
            } else if (messages.length === 0) {
                // First message - assume high school student
                messageContent = `You are talking to a high school student. ${content}`;
            }

            // Call the chat API (for conversation)
            const response = await fetch("/api/llm/plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: messageContent,
                    conversation: conversationContext,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to get response");
            }

            const data = await response.json();

            // If we get a manifest back, store it
            if (data.manifest && data.manifest.title && data.manifest.ctePathway) {
                setManifest(data.manifest);
                sessionStorage.setItem("manifest", JSON.stringify(data.manifest));
            } else if (data.title && data.ctePathway) {
                // Direct manifest response
                setManifest(data);
                sessionStorage.setItem("manifest", JSON.stringify(data));
            }

            // Add assistant response to messages
            const assistantMessage: Message = {
                role: "assistant",
                content: data.response || data.message || "I'm here to help you plan your capstone project. Let's continue our conversation!",
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    }, [messages]);

    const generateManifest = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Build full conversation summary
            const conversationSummary = messages
                .map((m) => `${m.role}: ${m.content}`)
                .join("\n");

            const response = await fetch("/api/llm/plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: `Generate a complete capstone project manifest based on this conversation:\n\n${conversationSummary}`,
                    generateManifest: true,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to generate manifest");
            }

            const data = await response.json();
            setManifest(data);
            sessionStorage.setItem("manifest", JSON.stringify(data));
            return data;
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
            return null;
        } finally {
            setLoading(false);
        }
    }, [messages]);

    return {
        messages,
        loading,
        error,
        manifest,
        sendMessage,
        generateManifest,
    };
};