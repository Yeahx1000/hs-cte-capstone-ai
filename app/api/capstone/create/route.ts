import { NextResponse } from "next/server";
import { google } from "googleapis";
import { CapstoneManifest } from "@/types";
import { OAuth2Client } from "google-auth-library";

export const runtime = "nodejs";

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

        if (!manifest || !manifest.title) {
            return NextResponse.json(
                { error: "Manifest with title is required" },
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
        // Always generate full template from manifest data to ensure all user input is included
        const docText = formatManifestAsText(typedManifest);
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

        // Build results using data already returned from files.create calls
        results.doc = {
            id: docId,
            link: docResponse.data.webViewLink || `https://docs.google.com/document/d/${docId}/edit`,
            name: `${typedManifest.title} - Project Plan`,
        };

        return NextResponse.json({
            success: true,
            folderId,
            folderLink: folderResponse.data.webViewLink || `https://drive.google.com/drive/folders/${folderId}`,
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
    const sections: string[] = [];

    // Title
    sections.push(`${manifest.title}`);
    sections.push(""); // Empty line

    // CTE Pathway
    sections.push("CTE Pathway");
    sections.push(manifest.ctePathway || "Not specified");
    sections.push(""); // Empty line

    // Objectives
    sections.push("Objectives");
    if (manifest.objectives && manifest.objectives.length > 0) {
        manifest.objectives.forEach((obj) => {
            sections.push(`• ${obj}`);
        });
    } else {
        sections.push("No objectives specified");
    }
    sections.push(""); // Empty line

    // Deliverables
    sections.push("Deliverables");
    if (manifest.deliverables && manifest.deliverables.length > 0) {
        manifest.deliverables.forEach((del) => {
            sections.push(`• ${del}`);
        });
    } else {
        sections.push("No deliverables specified");
    }
    sections.push(""); // Empty line

    // Timeline
    sections.push("Timeline");
    if (manifest.timeline && manifest.timeline.length > 0) {
        manifest.timeline.forEach((phase) => {
            sections.push(`${phase.phase} (${phase.weeks} weeks)`);
            if (phase.tasks && phase.tasks.length > 0) {
                phase.tasks.forEach((task) => {
                    sections.push(`  • ${task}`);
                });
            }
            sections.push(""); // Empty line between phases
        });
    } else {
        sections.push("No timeline specified");
        sections.push(""); // Empty line
    }

    // Assessment
    sections.push("Assessment");
    if (manifest.assessment && manifest.assessment.length > 0) {
        manifest.assessment.forEach((ass) => {
            sections.push(`• ${ass}`);
        });
    } else {
        sections.push("No assessment criteria specified");
    }
    sections.push(""); // Empty line

    // Resources
    sections.push("Resources");
    if (manifest.resources && manifest.resources.length > 0) {
        manifest.resources.forEach((res) => {
            sections.push(`• ${res}`);
        });
    } else {
        sections.push("No resources specified");
    }

    return sections.join("\n");
}
