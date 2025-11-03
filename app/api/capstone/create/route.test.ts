import { describe, it, expect, vi } from "vitest";
import { POST } from "./route";

vi.mock("googleapis", () => ({
    google: {
        drive: vi.fn(() => ({
            files: {
                create: vi.fn().mockResolvedValue({
                    data: { id: "test-id", name: "Test Folder", webViewLink: "https://drive.google.com" }
                })
            }
        })),
        docs: vi.fn(() => ({
            documents: {
                batchUpdate: vi.fn().mockResolvedValue({})
            }
        }))
    }
}));

vi.mock("google-auth-library", () => ({
    OAuth2Client: vi.fn().mockImplementation(() => ({
        setCredentials: vi.fn()
    }))
}));

describe("POST /api/capstone/create", () => {
    it("requires Authorization header", async () => {
        const req = {
            json: async () => ({ manifest: { title: "Test", ctePathway: "IT", objectives: [], deliverables: [], timeline: [], assessment: [], resources: [], content: { docText: "", csvData: [], slideOutline: [] } } }),
            headers: { get: () => null }
        } as unknown as Request;
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it("validates manifest with title", async () => {
        const req = {
            json: async () => ({}),
            headers: { get: () => "Bearer token" }
        } as unknown as Request;
        const res = await POST(req);
        expect(res.status).toBe(400);
    });
});

