import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";

vi.mock("openai", () => {
    const mockCreate = vi.fn().mockResolvedValue({
        choices: [{
            message: { content: JSON.stringify({ title: "Test Capstone", ctePathway: "IT", objectives: [], deliverables: [], timeline: [], assessment: [], resources: [], content: { docText: "", csvData: [], slideOutline: [] } }) }
        }]
    });
    return {
        default: class {
            chat = { completions: { create: mockCreate } };
            constructor(_: { apiKey?: string }) { }
        }
    };
});

describe("POST /api/llm/plan", () => {
    beforeEach(() => {
        process.env.OPENAI_API_KEY = "sk-test";
    });

    it("validates missing message", async () => {
        const req = { json: async () => ({}) } as unknown as Request;
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it("requires OPENAI_API_KEY", async () => {
        delete process.env.OPENAI_API_KEY;
        const req = { json: async () => ({ message: "test" }) } as unknown as Request;
        const res = await POST(req);
        expect(res.status).toBe(500);
    });
});


