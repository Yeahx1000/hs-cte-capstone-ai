import { NextResponse } from "next/server";
import { google } from "googleapis";
import { CapstoneManifest } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// This route handles the creation of the capstone files in Google Drive, 
// it creates the files in Google Drive, and returns the links to the files.
// 


export async function POST(request: Request) {
    try {
        const { manifest, studentName } = await request.json();

        if (!manifest || !manifest.title || !manifest.content) {
            return NextResponse.json(
                { error: "Manifest with title and content is required" },
                { status: 400 }
            );
        }

        if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
            return NextResponse.json(
                { error: "Missing Google service account credentials (GOOGLE_CLIENT_EMAIL/GOOGLE_PRIVATE_KEY)." },
                { status: 500 }
            );
        }

        const typedManifest = manifest as CapstoneManifest;
        const folderName = `CTE Capstone – ${studentName || "Student"}`;

        // Initialize Google Auth
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
            },
            scopes: [
                "https://www.googleapis.com/auth/drive.file",
                "https://www.googleapis.com/auth/documents",
            ],
        });

        const drive = google.drive({ version: "v3", auth });
        const docs = google.docs({ version: "v1", auth });

        // Step 1: Create Drive folder
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

        // Step 2: Create Google Doc with docText
        const docResponse = await docs.documents.create({
            requestBody: {
                title: `${typedManifest.title} - Project Plan`,
            },
        });

        const docId = docResponse.data.documentId;
        if (!docId) {
            throw new Error("Failed to create document");
        }

        // Move doc to folder
        await drive.files.update({
            fileId: docId,
            addParents: folderId,
            fields: "id",
        });

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

        // Actually, let's use a simpler approach - insert all text at once
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

function formatManifestAsCSV(manifest: CapstoneManifest): string[][] {
    const rows: string[][] = [
        ["Phase", "Weeks", "Task"],
    ];

    manifest.timeline.forEach((phase) => {
        phase.tasks.forEach((task, index) => {
            rows.push([
                index === 0 ? phase.phase : "",
                index === 0 ? phase.weeks.toString() : "",
                task,
            ]);
        });
    });

    return rows;
}

function formatManifestAsSlides(manifest: CapstoneManifest): Array<{ title: string; content: string[] }> {
    const slides: Array<{ title: string; content: string[] }> = [
        {
            title: manifest.title,
            content: [`CTE Pathway: ${manifest.ctePathway}`],
        },
        {
            title: "Objectives",
            content: manifest.objectives,
        },
        {
            title: "Deliverables",
            content: manifest.deliverables,
        },
    ];

    manifest.timeline.forEach((phase) => {
        slides.push({
            title: `${phase.phase} (${phase.weeks} weeks)`,
            content: phase.tasks,
        });
    });

    slides.push(
        {
            title: "Assessment",
            content: manifest.assessment,
        },
        {
            title: "Resources",
            content: manifest.resources,
        }
    );

    return slides;
}

