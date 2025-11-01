import { NextResponse } from "next/server";
import { google } from "googleapis";
import { CapstoneManifest } from "@/types";
import { OAuth2Client } from "google-auth-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Capstone creation route

// This route handles the creation of the capstone files in Google Drive, 
// it creates the files in Google Drive, and returns the links to the files.

export async function POST(request: Request) {
    try {
        const { manifest, studentName } = await request.json();

        // Get the user's access token from Authorization header, not service account
        const authHeader = request.headers.get("Authorization");
        const userAccessToken = authHeader?.replace("Bearer ", "");

        if (!userAccessToken) {
            return NextResponse.json(
                { error: "User authentication required. Please log in again." },
                { status: 401 }
            );
        }

        if (!manifest || !manifest.title || !manifest.content) {
            return NextResponse.json(
                { error: "Manifest with title and content is required" },
                { status: 400 }
            );
        }

        const typedManifest = manifest as CapstoneManifest;
        const folderName = `CTE Capstone – ${studentName || "Student"}`;

        // Initialize Google Auth using USER'S token (not service account)
        const auth = new OAuth2Client();
        auth.setCredentials({ access_token: userAccessToken });

        const drive = google.drive({ version: "v3", auth });
        const docs = google.docs({ version: "v1", auth });

        // Step 1: Create Drive folder in USER'S Drive
        const folderResponse = await drive.files.create({
            requestBody: {
                name: folderName,
                mimeType: "application/vnd.google-apps.folder",
            },
            fields: "id, name, webViewLink",
        });

        const folderId = folderResponse.data.id;
        if (!folderId) {
            throw new Error("Failed to create folder");
        }

        const results: Record<string, { id: string; link: string; name: string }> = {};

        // Step 2: Create Google Doc using Drive API (works for service accounts, avoid capstone creation fail issue)
        const docResponse = await drive.files.create({
            requestBody: {
                name: `${typedManifest.title} - Project Plan`,
                mimeType: "application/vnd.google-apps.document",
                parents: [folderId], // Create directly in folder
            },
            fields: "id, name, webViewLink",
        });

        const docId = docResponse.data.id;
        if (!docId) {
            throw new Error("Failed to create document");
        }

        // Insert text content using batchUpdate
        const docText = typedManifest.content.docText || formatManifestAsText(typedManifest);
        const paragraphs = docText.split("\n").filter((line) => line.trim());

        const insertTextRequests = paragraphs.map((paragraph, index) => ({
            insertText: {
                location: {
                    index: index * 100, // Approximate index for each paragraph
                },
                text: paragraph + "\n",
            },
        }));

        // Actually, let's use a simpler approach, insert all text at once
        await docs.documents.batchUpdate({
            documentId: docId,
            requestBody: {
                requests: [
                    {
                        insertText: {
                            location: { index: 1 },
                            text: docText,
                        },
                    },
                ],
            },
        });

        // Get doc share link
        const docFile = await drive.files.get({
            fileId: docId,
            fields: "webViewLink",
        });

        results.doc = {
            id: docId,
            link: docFile.data.webViewLink || `https://docs.google.com/document/d/${docId}/edit`,
            name: `${typedManifest.title} - Project Plan`,
        };

        // Get folder share link
        const folderFile = await drive.files.get({
            fileId: folderId,
            fields: "webViewLink",
        });

        return NextResponse.json({
            success: true,
            folderId,
            folderLink: folderFile.data.webViewLink || `https://drive.google.com/drive/folders/${folderId}`,
            files: {
                doc: results.doc,  // Only return the doc
            },
        });
    } catch (error) {
        console.error("Capstone creation error:", error);
        return NextResponse.json(
            { error: "Failed to create capstone files", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}

// Helper functions to format manifest as content
function formatManifestAsText(manifest: CapstoneManifest): string {
    return `# ${manifest.title}

        ## CTE Pathway
        ${manifest.ctePathway}

        ## Objectives
        ${manifest.objectives.map((obj) => `• ${obj}`).join("\n")}

        ## Deliverables
        ${manifest.deliverables.map((del) => `• ${del}`).join("\n")}

        ## Timeline
        ${manifest.timeline.map((phase) => `
        ### ${phase.phase} (${phase.weeks} weeks)
        ${phase.tasks.map((task) => `• ${task}`).join("\n")}
        `).join("\n")}

        ## Assessment
        ${manifest.assessment.map((ass) => `• ${ass}`).join("\n")}

        ## Resources
        ${manifest.resources.map((res) => `• ${res}`).join("\n")}
    `;
}
