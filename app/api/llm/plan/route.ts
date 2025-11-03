import { NextResponse } from "next/server";
import OpenAI from "openai";
import { LLMPlanRequest, LLMPlanResponse, CapstoneManifest } from "@/types";
import { ManifestSchema } from "@/lib/manifest";

// edge runtime (this route only) for reduced latency and improved performance
export const runtime = "edge";

/*
This route is the main entry point for the LLM plan and chat conversation.
It is responsible for:
- Generating a manifest based on the conversation
- Moving to review phase if the student has asked more than 5 questions
- Returning the manifest to the client
*/

// ==========================================================
// Manifest System Prompt (passed to LLM at different stages)
// ==========================================================

const MANIFEST_SYSTEM_PROMPT = [
    "under no circumstance should you return explicit content or language, no images, no links, no code, no nothing that is not related to the conversation or the capstone project planning.",
    "You are a helpful assistant/guidance counselor for High School CTE pathway capstone planning.",
    "Based on the conversation, generate a complete capstone project manifest in JSON format that includes all required CTE framework components.",
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
});

const MAX_TURNS = 5; // Maximum number of assistant responses before moving to review

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

        // Hard server cutoff - if we've reached max turns or are in review phase, force manifest generation
        const currentTurnCount = typeof turnCount === "number" ? turnCount : 0;
        const currentPhase = phase || "brainstorm";

        if (currentPhase === "review" || currentPhase === "complete") {
            // Force manifest generation if we're already in review phase
            // This ensures we don't continue chatting once review is triggered
            const conversationSummary = conversation && Array.isArray(conversation)
                ? conversation.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join("\n")
                : message;

            const system = MANIFEST_SYSTEM_PROMPT

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
            let parsed: CapstoneManifest;
            try {
                const temp = JSON.parse(content);
                if (typeof temp !== "object" || temp === null || Array.isArray(temp)) {
                    return NextResponse.json({ error: "Invalid manifest format" }, { status: 502 });
                }
                parsed = temp as CapstoneManifest;
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

        // Hard cutoff: if turnCount >= MAX_TURNS, generate manifest and return it
        if (currentTurnCount >= MAX_TURNS && currentPhase === "brainstorm") {
            // Generate manifest immediately at cutoff to eliminate the extra round-trip
            const conversationSummary = conversation && Array.isArray(conversation)
                ? conversation.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join("\n")
                : message;

            const system = MANIFEST_SYSTEM_PROMPT

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
            let parsed: CapstoneManifest;
            try {
                const temp = JSON.parse(content);
                if (typeof temp !== "object" || temp === null || Array.isArray(temp)) {
                    return NextResponse.json({ error: "Invalid manifest format" }, { status: 502 });
                }
                parsed = temp as CapstoneManifest;
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
            // Manifest generation mode - return structured JSON with content for Google Docs, Sheets, and Slides
            const system = MANIFEST_SYSTEM_PROMPT

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
            let parsed: unknown;
            try {
                parsed = JSON.parse(content);
            } catch {
                return NextResponse.json({ error: "Non-JSON response from model" }, { status: 502 });
            }

            // Validate with Zod schema
            let validated: CapstoneManifest;
            try {
                validated = ManifestSchema.parse(parsed) as CapstoneManifest;
            } catch (err) {
                console.error("Manifest validation failed:", err);
                return NextResponse.json(
                    { error: "Invalid manifest format from model", details: err instanceof Error ? err.message : "Validation failed" },
                    { status: 502 }
                );
            }

            // Ensure CTE pathway from onboarding is included if provided
            if (onboardingData?.ctePathway && (!validated.ctePathway || validated.ctePathway !== onboardingData.ctePathway)) {
                validated.ctePathway = onboardingData.ctePathway;
            }

            return NextResponse.json(validated);
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
            let manifest: CapstoneManifest | null = null;
            try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]) as Partial<CapstoneManifest>;
                    if (parsed.title && parsed.ctePathway) {
                        manifest = parsed as CapstoneManifest;
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