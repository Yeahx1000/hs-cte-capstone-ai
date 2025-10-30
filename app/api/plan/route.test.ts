import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";

// This is a ONLY a filler test
// I'll expand on this later as I figure out data to be collected from frontend

vi.mock("openai", () => {
    class ChatCompletionsMock {
        create = vi.fn().mockResolvedValue({
            choices: [
                {
                    message: {
                        content: JSON.stringify({
                            title: "CTE Capstone: Web Development Portfolio",
                            ctePathway: "Information Technology - Web Development",
                            objectives: [
                                "Demonstrate proficiency in HTML, CSS, JS",
                                "Deploy a responsive website",
                            ],
                            deliverables: [
                                "Project proposal",
                                "Source code repository",
                                "Deployed website URL",
                            ],
                            timeline: [
                                { phase: "Planning", weeks: 2, tasks: ["Proposal", "Milestones"] },
                                { phase: "Build", weeks: 6, tasks: ["Implement", "Test"] },
                                { phase: "Present", weeks: 1, tasks: ["Demo", "Reflection"] },
                            ],
                            assessment: ["Rubric-based evaluation", "Peer review"],
                            resources: ["MDN", "School lab", "Mentor"]
                        })
                    }
                }
            ]
        });
    }

    class OpenAIMock {
        chat = { completions: new ChatCompletionsMock() };
        constructor(_: { apiKey?: string }) { }
    }

    return { default: OpenAIMock };
});

describe("POST /api/plan", () => {
    beforeEach(() => {
        process.env.OPENAI_API_KEY = "sk-test";
    });

    it("returns deterministic JSON template", async () => {
        const req = {
            json: async () => ({ message: "Create a capstone for web dev" })
        } as unknown as Request;

        const res = await POST(req);
        expect(res.status).toBe(200);
        const body = await res.json();

        expect(body).toHaveProperty("title");
        expect(body).toHaveProperty("ctePathway");
        expect(Array.isArray(body.objectives)).toBe(true);
        expect(Array.isArray(body.deliverables)).toBe(true);
        expect(Array.isArray(body.timeline)).toBe(true);
        expect(Array.isArray(body.assessment)).toBe(true);
        expect(Array.isArray(body.resources)).toBe(true);
    });

    it("validates missing message", async () => {
        const req = { json: async () => ({}) } as unknown as Request;
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it("errors when OPENAI_API_KEY is missing", async () => {
        delete process.env.OPENAI_API_KEY;
        const req = { json: async () => ({ message: "x" }) } as unknown as Request;
        const res = await POST(req);
        expect(res.status).toBe(500);
    });
});


