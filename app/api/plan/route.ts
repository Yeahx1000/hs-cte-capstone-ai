import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TODO: basic filler template for OpenAi API call, I'll need to expand this later

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
    try {
        const { message, conversation, generateManifest } = await request.json();

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

        // Build conversation history for context
        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

        if (generateManifest) {
            // Manifest generation mode - return structured JSON
            const system = [
                "You are a helpful assistant for High School CTE pathway capstone planning.",
                "Based on the conversation, generate a complete capstone project manifest in JSON format.",
                "Return ONLY valid JSON with this structure:",
                JSON.stringify({
                    title: "string",
                    ctePathway: "string",
                    objectives: ["string"],
                    deliverables: ["string"],
                    timeline: [{ phase: "string", weeks: 0, tasks: ["string"] }],
                    assessment: ["string"],
                    resources: ["string"],
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
                seed: 42,
            });

            const content = response.choices[0]?.message?.content ?? "{}";
            let parsed: unknown;
            try {
                parsed = JSON.parse(content);
            } catch {
                return NextResponse.json({ error: "Non-JSON response from model" }, { status: 502 });
            }

            return NextResponse.json(parsed);
        } else {
            // Conversation mode - natural responses
            const system = [
                "You are a helpful assistant for High School CTE pathway capstone planning.",
                "Your role is to guide students through planning their capstone project by asking thoughtful questions.",
                "Keep responses conversational, friendly, and focused on CTE pathway topics.",
                "Ask questions to understand their interests, skills, and goals.",
                "When appropriate, you can generate a structured capstone project manifest, but focus on having a natural conversation first.",
            ].join(" ");

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
                temperature: 0.7,
                messages,
            });

            const content = response.choices[0]?.message?.content ?? "";

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