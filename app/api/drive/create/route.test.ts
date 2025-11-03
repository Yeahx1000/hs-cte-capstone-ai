import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("googleapis", () => ({
    google: {
        drive: vi.fn(() => ({
            files: {
                create: vi.fn().mockResolvedValue({
                    data: {
                        id: "test-file-id",
                        name: "test.txt",
                        webViewLink: "https://drive.google.com/file/d/test-file-id"
                    }
                })
            }
        }))
    },
    auth: {
        GoogleAuth: vi.fn().mockImplementation(() => ({}))
    }
}));

describe("POST /api/drive/create", () => {
    beforeEach(() => {
        process.env.GOOGLE_CLIENT_EMAIL = "test@example.com";
        process.env.GOOGLE_PRIVATE_KEY = "test-key";
    });

    it("validates required fields", async () => {
        const req = { json: async () => ({}) } as unknown as Request;
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it("requires Google credentials", async () => {
        delete process.env.GOOGLE_CLIENT_EMAIL;
        const req = {
            json: async () => ({ fileName: "test.txt", fileContent: "content" })
        } as unknown as Request;
        const res = await POST(req);
        expect(res.status).toBe(500);
    });
});