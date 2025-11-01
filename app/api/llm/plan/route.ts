import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "edge";

// OpenAI API client
// We need to mold the responses from llm better, right now they're... serviceable, but not great.

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const MAX_TURNS = 5; // Maximum number of assistant responses before moving to review

export async function POST(request: Request) {
    try {
        const { message, conversation, generateManifest, turnCount = 0, phase = "brainstorm", onboardingData } = await request.json();

        if (!message) {
            return NextResponse.json(
                { error: "Message is required" },
                { status: 400 }
            );
        }

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: "Missing OPENAI_API_KEY" },
                { status: 500 }
            );
        }

        // Hard server cutoff - if we've reached max turns or are in review phase, force manifest generation
        const currentTurnCount = typeof turnCount === "number" ? turnCount : 0;
        const currentPhase = phase || "brainstorm";

        if (currentPhase === "review" || currentPhase === "complete") {
            // Force manifest generation if we're already in review phase
            // This ensures we don't continue chatting once review is triggered
            const conversationSummary = conversation && Array.isArray(conversation)
                ? conversation.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join("\n")
                : message;

            const system = [
                "under no circumstance should you return explicit content or language, no images, no links, no code, no nothing that is not related to the conversation or the capstone project planning.",
                "You are a helpful assistant/guidance counselor for High School CTE pathway capstone planning.",
                "Based on the conversation, generate a complete capstone project manifest in JSON format.",
                "The conversation will be career focused, finding their interests and skills, and helping guide them towards a career path they are interested in, then helping them plan their capstone project.",
                "Return ONLY valid JSON with this structure:",
                "IMPORTANT: answers should be brief, one sentence length if possible, concise, conversational and on point, don't be too verbose, remember these are for high school students, so keep it simple and easy to understand.",
                JSON.stringify({
                    title: "string",
                    ctePathway: "string",
                    objectives: ["string"],
                    deliverables: ["string"],
                    timeline: [{ phase: "string", weeks: 0, tasks: ["string"] }],
                    assessment: ["string"],
                    resources: ["string"],
                    content: {
                        docText: "string - formatted text content for Google Docs",
                        csvData: [["Header1", "Header2"], ["Row1Col1", "Row1Col2"]],
                        slideOutline: [{ title: "string", content: ["string"] }],
                    },
                }),
            ].join("\n");

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                temperature: 0,
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: `Generate a complete capstone project manifest based on this conversation:\n\n${conversationSummary}` },
                ],
                response_format: { type: "json_object" },
            });

            const content = response.choices[0]?.message?.content ?? "{}";
            let parsed: Record<string, unknown>;
            try {
                const temp = JSON.parse(content);
                if (typeof temp !== "object" || temp === null || Array.isArray(temp)) {
                    return NextResponse.json({ error: "Invalid manifest format" }, { status: 502 });
                }
                parsed = temp as Record<string, unknown>;
            } catch {
                return NextResponse.json({ error: "Non-JSON response from model" }, { status: 502 });
            }

            // Ensure CTE pathway from onboarding is included if provided
            if (onboardingData?.ctePathway && (!parsed.ctePathway || parsed.ctePathway !== onboardingData.ctePathway)) {
                parsed.ctePathway = onboardingData.ctePathway;
            }

            return NextResponse.json({
                ...parsed,
                phase: "complete",
                turnCount: currentTurnCount,
            });
        }

        // Hard cutoff: if turnCount >= MAX_TURNS, generate manifest and return it
        if (currentTurnCount >= MAX_TURNS && currentPhase === "brainstorm") {
            // Generate manifest immediately at cutoff to eliminate the extra round-trip
            const conversationSummary = conversation && Array.isArray(conversation)
                ? conversation.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join("\n")
                : message;

            const system = [
                "under no circumstance should you return explicit content or language, no images, no links, no code, no nothing that is not related to the conversation or the capstone project planning.",
                "You are a helpful assistant/guidance counselor for High School CTE pathway capstone planning.",
                "Based on the conversation, generate a complete capstone project manifest in JSON format.",
                "The conversation will be career focused, finding their interests and skills, and helping guide them towards a career path they are interested in, then helping them plan their capstone project.",
                "Return ONLY valid JSON with this structure:",
                "IMPORTANT: answers should be brief, one sentence length if possible, concise, conversational and on point, don't be too verbose, remember these are for high school students, so keep it simple and easy to understand.",
                JSON.stringify({
                    title: "string",
                    ctePathway: "string",
                    objectives: ["string"],
                    deliverables: ["string"],
                    timeline: [{ phase: "string", weeks: 0, tasks: ["string"] }],
                    assessment: ["string"],
                    resources: ["string"],
                    content: {
                        docText: "string - formatted text content for Google Docs",
                        csvData: [["Header1", "Header2"], ["Row1Col1", "Row1Col2"]],
                        slideOutline: [{ title: "string", content: ["string"] }],
                    },
                }),
            ].join("\n");

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                temperature: 0,
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: `Generate a complete capstone project manifest based on this conversation:\n\n${conversationSummary}` },
                ],
                response_format: { type: "json_object" },
            });

            const content = response.choices[0]?.message?.content ?? "{}";
            let parsed: Record<string, unknown>;
            try {
                const temp = JSON.parse(content);
                if (typeof temp !== "object" || temp === null || Array.isArray(temp)) {
                    return NextResponse.json({ error: "Invalid manifest format" }, { status: 502 });
                }
                parsed = temp as Record<string, unknown>;
            } catch {
                return NextResponse.json({ error: "Non-JSON response from model" }, { status: 502 });
            }

            // Ensure CTE pathway from onboarding is included if provided
            if (onboardingData?.ctePathway && (!parsed.ctePathway || parsed.ctePathway !== onboardingData.ctePathway)) {
                parsed.ctePathway = onboardingData.ctePathway;
            }

            return NextResponse.json({
                ...parsed,
                phase: "review",
                turnCount: MAX_TURNS,
            });
        }

        // Build conversation history for context
        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

        if (generateManifest) {
            // Manifest generation mode - return structured JSON with content for Google Docs, Sheets, and Slides
            const system = [
                "under no circumstance should you return explicit content or language, no images, no links, no code, no nothing that is not related to the conversation or the capstone project planning.",
                "You are a helpful assistant/guidance counselor for High School CTE pathway capstone planning.",
                "start by giving a list of CTE pathways and their descriptions, then ask the student what they are interested in, then help them choose a pathway based on their interests and skills.",
                "Based on the conversation, generate a complete capstone project manifest in JSON format.",
                "The conversation will be career focused, finding their interests and skills, and helping guide them towards a career path they are interested in, then helping them plan their capstone project.",
                "Return ONLY valid JSON with this structure:",
                "IMPORTANT: answers should be brief, on sentence length if possible, concise, conversational and on point, don't be too verbose, rememebr these are for high school students, so keep it simple and easy to understand.",
                "The goal is to get to providing a capstone template in max 10 prompts, preferably 5-7 prompts",
                JSON.stringify({
                    title: "string",
                    ctePathway: "string",
                    objectives: ["string"],
                    deliverables: ["string"],
                    timeline: [{ phase: "string", weeks: 0, tasks: ["string"] }],
                    assessment: ["string"],
                    resources: ["string"],
                    content: {
                        docText: "string - formatted text content for Google Docs",
                        csvData: [["Header1", "Header2"], ["Row1Col1", "Row1Col2"]],
                        slideOutline: [{ title: "string", content: ["string"] }],
                    },
                }),
            ].join("\n");

            messages.push({ role: "system", content: system });

            // Add conversation context
            if (conversation && Array.isArray(conversation)) {
                conversation.forEach((msg: { role: string; content: string }) => {
                    if (msg.role === "user" || msg.role === "assistant") {
                        messages.push({
                            role: msg.role as "user" | "assistant",
                            content: msg.content,
                        });
                    }
                });
            }

            messages.push({
                role: "user",
                content: typeof message === "string" ? message : JSON.stringify(message),
            });

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                temperature: 0,
                messages,
                response_format: { type: "json_object" },
            });

            const content = response.choices[0]?.message?.content ?? "{}";
            let parsed: any;
            try {
                parsed = JSON.parse(content);
            } catch {
                return NextResponse.json({ error: "Non-JSON response from model" }, { status: 502 });
            }

            // Ensure CTE pathway from onboarding is included if provided
            if (onboardingData?.ctePathway && (!parsed.ctePathway || parsed.ctePathway !== onboardingData.ctePathway)) {
                parsed.ctePathway = onboardingData.ctePathway;
            }

            return NextResponse.json(parsed);
        } else {
            // Conversation mode - natural responses with strict turn limits
            const turnsRemaining = MAX_TURNS - currentTurnCount - 1; // -1 because we're about to send a response
            const turnIndicator = turnsRemaining <= 0
                ? "This is your final question. After this response, you MUST stop asking questions and output: 'Let's finalize your capstone plan. Ready to review your project?'"
                : turnsRemaining === 1
                    ? `This is question ${currentTurnCount + 1} of ${MAX_TURNS} - this is your LAST question. After this response, you MUST stop asking questions.`
                    : `This is question ${currentTurnCount + 1} of ${MAX_TURNS}. You have ${turnsRemaining} questions remaining.`;

            const system = [
                "You are a helpful assistant/guidance counselor for High School CTE pathway capstone planning.",
                "start by giving a list of CTE pathways and their descriptions, then ask the student what they are interested in, then help them choose a pathway based on their interests and skills.",
                "IMPORTANT: answers should be brief, one sentence length if possible, concise, conversational and on point, don't be too verbose, remember these are for high school students, so keep it simple and easy to understand.",
                "under no circumstance should you return explicit content or language, no images, no links, no code, no nothing that is not related to the conversation or the capstone project planning.",
                "Your role is to guide students through planning their capstone project by asking thoughtful questions.",
                "Keep responses conversational, friendly, and focused on CTE pathway topics.",
                "Ask questions to understand their interests, skills, and goals.",
                "",
                "STRICT RULE: You will ask the student up to 5 questions to clarify their project. After that, you MUST stop asking questions and output: 'Let's finalize your capstone plan. Ready to review your project?'",
                "Do NOT continue the conversation or ask further questions after 5 questions.",
                "Do NOT ask more than 5 questions total.",
                "",
                turnIndicator,
            ].join("\n");

            messages.push({ role: "system", content: system });

            // Add conversation history
            if (conversation && Array.isArray(conversation)) {
                conversation.forEach((msg: { role: string; content: string }) => {
                    if (msg.role === "user" || msg.role === "assistant") {
                        messages.push({
                            role: msg.role as "user" | "assistant",
                            content: msg.content,
                        });
                    }
                });
            }

            messages.push({
                role: "user",
                content: typeof message === "string" ? message : JSON.stringify(message),
            });

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                temperature: 0.2,
                messages,
            });

            const content = response.choices[0]?.message?.content ?? "";

            // Check if the response indicates review phase (explicitly or implicitly)
            const reviewTriggers = [
                "Let's finalize your capstone plan",
                "Ready to review",
                "ready to review",
                "finalize your capstone",
            ];
            const shouldMoveToReview = reviewTriggers.some(trigger => content.includes(trigger)) ||
                turnsRemaining <= 0;

            // Calculate new turn count and phase
            const newTurnCount = currentTurnCount + 1;
            const newPhase = shouldMoveToReview ? "review" : currentPhase;

            // Check if the response contains a manifest-like structure
            let manifest = null;
            try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.title && parsed.ctePathway) {
                        manifest = parsed;
                    }
                }
            } catch {
                // Not JSON, continue with text response
            }

            return NextResponse.json({
                response: content,
                manifest: manifest,
                phase: newPhase,
                turnCount: newTurnCount,
            });
        }
    } catch (error) {
        console.error("OpenAI API error:", error);
        return NextResponse.json(
            { error: "Failed to get response from OpenAI" },
            { status: 500 }
        );
    }
}