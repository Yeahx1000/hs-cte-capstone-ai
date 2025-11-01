import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

// Google Drive API client

export async function POST(request: Request) {
    try {
        const { fileName, fileContent, mimeType = "text/plain", folderId } = await request.json();

        if (!fileName || !fileContent) {
            return NextResponse.json(
                { error: "File name and content are required" },
                { status: 400 }
            );
        }

        if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
            return NextResponse.json(
                { error: "Missing Google service account credentials (GOOGLE_CLIENT_EMAIL/GOOGLE_PRIVATE_KEY)." },
                { status: 500 }
            );
        }

        // Init Google Drive API client (Service Account JWT)
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
            },
            scopes: ["https://www.googleapis.com/auth/drive.file"],
        });

        const drive = google.drive({ version: "v3", auth });

        // Create file in Google Drive
        const fileMetadata: Record<string, unknown> = {
            name: fileName,
        };
        if (folderId) {
            fileMetadata.parents = [folderId];
        }

        const media = {
            mimeType,
            body: Buffer.from(fileContent, "utf-8"),
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: "id, name, webViewLink",
        });

        return NextResponse.json({
            success: true,
            fileId: response.data.id,
            fileName: response.data.name,
            link: response.data.webViewLink,
        });
    } catch (error) {
        console.error("Google Drive API error:", error);
        return NextResponse.json(
            { error: "Failed to create file in Google Drive" },
            { status: 500 }
        );
    }
}