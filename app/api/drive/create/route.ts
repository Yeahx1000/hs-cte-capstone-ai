import { NextResponse } from "next/server";
import { google } from "googleapis";

// TODO: this is only a basic filler template for Google Drive API call, I'll expand on this later also


export async function POST(request: Request) {
    try {
        const { fileName, fileContent } = await request.json();

        if (!fileName || !fileContent) {
            return NextResponse.json(
                { error: "File name and content are required" },
                { status: 400 }
            );
        }

        // Initialize Google Drive API client
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
            },
            scopes: ["https://www.googleapis.com/auth/drive写真"],
        });

        const drive = google.drive({ version: "v3", auth });

        // Create file in Google Drive
        const fileMetadata = {
            name: fileName,
        };

        const media = {
            mimeType: "text/plain",
            body: fileContent,
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