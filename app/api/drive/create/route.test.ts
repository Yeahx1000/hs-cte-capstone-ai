import { describe, it, expect } from "vitest";

// not actual test, just a filler for now

describe("Drive Create Route", () => {
    it("should create a file in Google Drive", async () => {
        const response = await fetch("/api/drive/create", {
            method: "POST",
            body: JSON.stringify({ fileName: "test.txt", fileContent: "Hello, world!" }),
        });
        expect(response.status).toBe(200);
    });
});