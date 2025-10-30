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
        const { message } = await request.json();

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

        // focusing on keeping responses within the lines of CTE pathway for HS students
        const system = [
            "You are a helpful assistant for High School CTE pathway capstone planning.",
            "Always produce a deterministic JSON object for a capstone project template.",
            "Focus strictly on CTE-aligned capstone outcomes; avoid unrelated topics.",
            "Do not include explanations, only valid JSON as final output.",
        ].join(" ");

        const response = await openai.chat.completions.create({
            // GPT 4o mini, because poor (kidding!)
            model: "gpt-4o-mini",
            temperature: 0,
            messages: [
                { role: "system", content: system },
                {
                    role: "user",
                    content: typeof message === "string" ? message : JSON.stringify(message),
                },
            ],
            response_format: { type: "json_object" },
            seed: 42,
        });

        // Expected JSON structure from the model
        // {
        //   "title": string,
        //   "ctePathway": string,
        //   "objectives": string[],
        //   "deliverables": string[],
        //   "timeline": [{ "phase": string, "weeks": number, "tasks": string[] }],
        //   "assessment": string[],
        //   "resources": string[]
        // }

        const content = response.choices[0]?.message?.content ?? "{}";
        let parsed: unknown;
        try {
            parsed = JSON.parse(content);
        } catch {
            return NextResponse.json({ error: "Non-JSON response from model" }, { status: 502 });
        }

        return NextResponse.json(parsed);
    } catch (error) {
        console.error("OpenAI API error:", error);
        return NextResponse.json(
            { error: "Failed to get response from OpenAI" },
            { status: 500 }
        );
    }
}