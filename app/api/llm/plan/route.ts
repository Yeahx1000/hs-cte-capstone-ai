import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletion } from "openai/resources/chat/completions";
import { LLMPlanRequest, LLMPlanResponse, CapstonePlanData } from "@/types";

// nodejs runtime for longer timeout limits and better compatibility with OpenAI API
export const runtime = "nodejs";

/*
This route is the main entry point for the LLM plan and chat conversation.
It is responsible for:
- Generating capstone plan data based on the conversation
- Moving to review phase if the student has asked more than 5 questions
- Returning the capstone plan data to the client
*/

// ==========================================================
// Capstone Plan Data System Prompt (passed to LLM at different stages)
// ==========================================================

const CAPSTONE_PLAN_DATA_SYSTEM_PROMPT = [
    "under no circumstance should you return explicit content or language, no images, no links, no code, no nothing that is not related to the conversation or the capstone project planning.",
    "You are a helpful assistant/guidance counselor for High School CTE pathway capstone planning.",
    "Based on the conversation, generate a complete capstone project plan data in JSON format that includes all required CTE framework components.",
    "The conversation will be career focused, finding their interests and skills, and helping guide them towards a career path they are interested in, then helping them plan their capstone project.",
    "CRITICAL: You MUST populate all framework fields when possible from the conversation. This comprehensive capstone framework includes:",
    "- projectProposal: problem/opportunity, industry context, end user, success criteria, mentor",
    "- workBasedLearning: activity type (professional-interview, job-shadow, internship, youth-apprenticeship, on-the-job-training), hours, description, artifacts",
    "- deliverablesDetail: technical product, process evidence, industry feedback, standards map",
    "- publicPresentation: duration, panel members, rubric criteria",
    "- reflectionPostsecondary: reflection, coursework, training, credentials, apprenticeship, collegeMajor",
    "- rubric: technicalQuality, workBasedIntegration, communicationProfessionalism, reflectionNextSteps",
    "If information is missing from the conversation, still include the field structure but with reasonable defaults or empty arrays where appropriate.",
    "Return ONLY valid JSON with this structure:",
    "IMPORTANT: answers should be brief, one sentence length if possible, concise, conversational and on point, don't be too verbose, remember these are for high school students, so keep it simple and easy to understand.",
    "Be mindful of Turns - you are allowed to ask up to 5 questions before moving to review. If you ask more than 5 questions, you will be moved to review. don't ask more than 5 questions total.",
    JSON.stringify({
        title: "string",
        ctePathway: "string",
        objectives: ["string"],
        deliverables: ["string"],
        timeline: [{ phase: "string", weeks: 0, tasks: ["string"] }],
        assessment: ["string"],
        resources: ["string"],
        projectProposal: {
            problemOpportunity: "string",
            industryContext: "string",
            endUser: "string",
            successCriteria: ["string"],
            mentor: "string"
        },
        workBasedLearning: {
            activityType: "professional-interview | job-shadow | internship | youth-apprenticeship | on-the-job-training | other",
            hours: 0,
            description: "string",
            artifacts: ["string"]
        },
        deliverablesDetail: {
            technicalProduct: "string",
            processEvidence: ["string"],
            industryFeedback: "string",
            standardsMap: ["string"]
        },
        publicPresentation: {
            duration: "string",
            panelMembers: ["string"],
            rubricCriteria: ["string"]
        },
        reflectionPostsecondary: {
            reflection: "string",
            coursework: ["string"],
            training: ["string"],
            credentials: ["string"],
            apprenticeship: ["string"],
            collegeMajor: ["string"]
        },
        rubric: {
            technicalQuality: ["string"],
            workBasedIntegration: ["string"],
            communicationProfessionalism: ["string"],
            reflectionNextSteps: ["string"]
        },
        content: {
            docText: "string - formatted text content for Google Docs",
            csvData: [["Header1", "Header2"], ["Row1Col1", "Row1Col2"]],
            slideOutline: [{ title: "string", content: ["string"] }],
        },
    }),
].join("\n");


const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 55000, // 55 seconds timeout (Node.js functions have 60s limit on Pro)
    maxRetries: 2, // Retry up to 2 times on transient failures
});

const MAX_TURNS = 5; // Maximum number of assistant responses before moving to review

// Helper function to create OpenAI request with timeout
async function createChatCompletionWithTimeout(
    params: Parameters<typeof openai.chat.completions.create>[0],
    timeoutMs: number = 55000
): Promise<ChatCompletion> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await Promise.race([
            openai.chat.completions.create(params) as Promise<ChatCompletion>,
            new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error("OpenAI request timeout")), timeoutMs);
            }),
        ]);
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (controller.signal.aborted || (error instanceof Error && error.message.includes("timeout"))) {
            throw new Error("OpenAI request timeout");
        }
        throw error;
    }
}

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const body = await request.json() as LLMPlanRequest;
        const { message, conversation, generateManifest, turnCount = 0, phase = "brainstorm", onboardingData } = body;

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

        // Hard server cutoff - if we've reached max turns or are in review phase, force capstone plan data generation
        const currentTurnCount = typeof turnCount === "number" ? turnCount : 0;
        const currentPhase = phase || "brainstorm";

        if (currentPhase === "review" || currentPhase === "complete") {
            // Force capstone plan data generation if we're already in review phase
            // This ensures we don't continue chatting once review is triggered
            const conversationSummary = conversation && Array.isArray(conversation)
                ? conversation.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join("\n")
                : message;

            const system = CAPSTONE_PLAN_DATA_SYSTEM_PROMPT

            const response = await createChatCompletionWithTimeout({
                model: "gpt-4o-mini",
                temperature: 0,
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: `Generate a complete capstone project plan data based on this conversation:\n\n${conversationSummary}` },
                ],
                response_format: { type: "json_object" },
            });

            const content = response.choices[0]?.message?.content ?? "{}";
            let parsed: CapstonePlanData;
            try {
                const temp = JSON.parse(content);
                if (typeof temp !== "object" || temp === null || Array.isArray(temp)) {
                    return NextResponse.json({ error: "Invalid capstone plan data format" }, { status: 502 });
                }
                parsed = temp as CapstonePlanData;
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
            } as LLMPlanResponse);
        }

        // Hard cutoff: if turnCount >= MAX_TURNS, generate capstone plan data and return it
        if (currentTurnCount >= MAX_TURNS && currentPhase === "brainstorm") {
            // Generate capstone plan data immediately at cutoff to eliminate the extra round-trip
            const conversationSummary = conversation && Array.isArray(conversation)
                ? conversation.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join("\n")
                : message;

            const system = CAPSTONE_PLAN_DATA_SYSTEM_PROMPT

            const response = await createChatCompletionWithTimeout({
                model: "gpt-4o-mini",
                temperature: 0,
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: `Generate a complete capstone project plan data based on this conversation:\n\n${conversationSummary}` },
                ],
                response_format: { type: "json_object" },
            });

            const content = response.choices[0]?.message?.content ?? "{}";
            let parsed: CapstonePlanData;
            try {
                const temp = JSON.parse(content);
                if (typeof temp !== "object" || temp === null || Array.isArray(temp)) {
                    return NextResponse.json({ error: "Invalid capstone plan data format" }, { status: 502 });
                }
                parsed = temp as CapstonePlanData;
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
            } as LLMPlanResponse);
        }

        // Build conversation history for context
        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

        if (generateManifest) {
            // Capstone plan data generation mode - return structured JSON with content for Google Docs, Sheets, and Slides
            const system = CAPSTONE_PLAN_DATA_SYSTEM_PROMPT

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

            const response = await createChatCompletionWithTimeout({
                model: "gpt-4o-mini",
                temperature: 0,
                messages,
                response_format: { type: "json_object" },
            });

            const content = response.choices[0]?.message?.content ?? "{}";
            let parsed: CapstonePlanData;
            try {
                const temp = JSON.parse(content);
                if (typeof temp !== "object" || temp === null || Array.isArray(temp)) {
                    return NextResponse.json({ error: "Invalid capstone plan data format" }, { status: 502 });
                }
                parsed = temp as CapstonePlanData;
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
                "CRITICAL: You must guide students to provide information for comprehensive CTE capstone framework requirements:",
                "1. Project Proposal: Ask about the problem/opportunity they want to address, industry context, who will use/benefit from their project, success criteria, and if they have a mentor.",
                "2. Work-Based Learning: Ask what WBL activity they plan (professional interview, job shadow, internship, apprenticeship, on-the-job training), how many hours, and what artifacts they'll collect.",
                "3. Deliverables: Ask about the specific technical product they'll create, what process evidence they'll document (research log, design notes, iterations), and how they'll get industry feedback.",
                "4. Public Presentation: Ask about their panel presentation plans and who might be on the panel (industry rep, college rep, teacher).",
                "5. Reflection & Postsecondary: Ask about their plans after high school (college major, training programs, credentials, apprenticeships).",
                "Try to gather at least 2-3 of these framework elements during your questions before finalizing.",
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

            const response = await createChatCompletionWithTimeout({
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

            // Check if the response contains a capstone plan data-like structure
            let capstonePlanData: CapstonePlanData | null = null;
            try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]) as Partial<CapstonePlanData>;
                    if (parsed.title && parsed.ctePathway) {
                        capstonePlanData = parsed as CapstonePlanData;
                    }
                }
            } catch {
                // Not JSON, continue with text response
            }

            return NextResponse.json({
                response: content,
                capstonePlanData: capstonePlanData,
                phase: newPhase,
                turnCount: newTurnCount,
            });
        }
    } catch (error) {
        console.error("OpenAI API error:", error);

        // Handle specific error types
        if (error instanceof Error) {
            // Timeout errors
            if (error.message.includes("timeout") || error.message.includes("Timeout")) {
                return NextResponse.json(
                    { error: "Request timed out. Please try again." },
                    { status: 504 } // Gateway Timeout
                );
            }

            // Rate limit errors
            if (error.message.includes("rate_limit") || error.message.includes("429")) {
                return NextResponse.json(
                    { error: "Too many requests. Please try again in a moment." },
                    { status: 429 }
                );
            }

            // Network errors
            if (error.message.includes("network") || error.message.includes("ECONNREFUSED")) {
                return NextResponse.json(
                    { error: "Network error. Please check your connection and try again." },
                    { status: 502 }
                );
            }
        }

        // Check if it's an OpenAI API error
        if (error && typeof error === "object" && "status" in error) {
            const status = (error as { status?: number }).status;
            if (status === 429) {
                return NextResponse.json(
                    { error: "Rate limit exceeded. Please try again in a moment." },
                    { status: 429 }
                );
            }
            if (status === 503) {
                return NextResponse.json(
                    { error: "Service temporarily unavailable. Please try again." },
                    { status: 503 }
                );
            }
        }

        return NextResponse.json(
            { error: "Failed to get response from OpenAI. Please try again." },
            { status: 500 }
        );
    }
}