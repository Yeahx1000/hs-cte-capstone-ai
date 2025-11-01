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
        const folderName = `CTE Capstone Template – ${studentName || "Student"} - ${typedManifest.ctePathway || "No Pathway Specified"}`;

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
        const { textContent, formattingRequests } = formatManifestAsStructuredContent(typedManifest);

        // Combine insert text request with formatting requests
        const requests: any[] = [
            {
                insertText: {
                    location: { index: 1 },
                    text: textContent,
                },
            },
            ...formattingRequests
        ];

        await docs.documents.batchUpdate({
            documentId: docId,
            requestBody: {
                requests,
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

// Helper function to format manifest with structured content for Google Docs API
function formatManifestAsStructuredContent(manifest: CapstoneManifest): {
    textContent: string;
    formattingRequests: any[]
} {
    const sections: string[] = [];
    const formattingRequests: any[] = [];
    let currentIndex = 1; // Start index for document (1-based)

    // Helper to add text and track index
    const addText = (text: string) => {
        sections.push(text);
        const startIndex = currentIndex;
        currentIndex += text.length;
        return { startIndex, endIndex: currentIndex };
    };

    const addLine = (text: string) => {
        const range = addText(text + "\n");
        return range;
    };

    // Title - will be formatted as large, bold heading
    const titleRange = addLine(manifest.title);
    formattingRequests.push({
        updateTextStyle: {
            range: {
                startIndex: titleRange.startIndex,
                endIndex: titleRange.endIndex - 1, // Exclude newline
            },
            textStyle: {
                bold: true,
                fontSize: {
                    magnitude: 18,
                    unit: "PT",
                },
            },
            fields: "bold,fontSize",
        },
    });
    addLine(""); // Empty line

    // Helper function for section headers
    const addSectionHeader = (header: string) => {
        const range = addLine(header);
        formattingRequests.push({
            updateTextStyle: {
                range: {
                    startIndex: range.startIndex,
                    endIndex: range.endIndex - 1,
                },
                textStyle: {
                    bold: true,
                    fontSize: {
                        magnitude: 14,
                        unit: "PT",
                    },
                },
                fields: "bold,fontSize",
            },
        });
        // Add spacing after header
        addLine("");
    };

    // CTE Pathway Alignment
    addSectionHeader("PATHWAY ALIGNMENT");
    addLine(`CTE Pathway: ${manifest.ctePathway || "Not specified"}`);
    addLine("Note: This capstone is the final course in a 2-3 course CTE sequence. A grade of C- or better marks a CTE Pathway Completer.");
    addLine("");

    // Project Proposal
    addSectionHeader("PROJECT PROPOSAL (Teacher-Approved)");
    if (manifest.projectProposal) {
        if (manifest.projectProposal.problemOpportunity) {
            addLine(`Problem/Opportunity: ${manifest.projectProposal.problemOpportunity}`);
        }
        if (manifest.projectProposal.industryContext) {
            addLine(`Industry Context: ${manifest.projectProposal.industryContext}`);
        }
        if (manifest.projectProposal.endUser) {
            addLine(`End User: ${manifest.projectProposal.endUser}`);
        }
        if (manifest.projectProposal.successCriteria && manifest.projectProposal.successCriteria.length > 0) {
            addLine("Success Criteria:");
            manifest.projectProposal.successCriteria.forEach((criteria) => {
                addLine(`• ${criteria}`);
            });
        }
        if (manifest.projectProposal.mentor) {
            addLine(`Mentor: ${manifest.projectProposal.mentor}`);
        }
        addLine("Must map to CTE Model Curriculum Standards for the pathway + Career Ready Practices (communication, teamwork, problem solving).");
    } else {
        addLine("Problem/Opportunity: [To be completed]");
        addLine("Industry Context: [To be completed]");
        addLine("End User: [To be completed]");
        addLine("Success Criteria: [To be completed]");
        addLine("Timeline: [See Timeline section below]");
        addLine("Mentor: [If applicable]");
    }
    addLine("");

    // Work-Based Learning Component
    addSectionHeader("WORK-BASED LEARNING COMPONENT");
    if (manifest.workBasedLearning) {
        if (manifest.workBasedLearning.activityType) {
            const activityLabels: Record<string, string> = {
                "professional-interview": "Professional Interview",
                "job-shadow": "Job Shadow",
                "internship": "Internship",
                "youth-apprenticeship": "Youth Apprenticeship",
                "on-the-job-training": "On-the-Job Training",
                "other": "Other"
            };
            addLine(`Activity Type: ${activityLabels[manifest.workBasedLearning.activityType] || manifest.workBasedLearning.activityType}`);
        }
        if (manifest.workBasedLearning.hours) {
            addLine(`Hours: ${manifest.workBasedLearning.hours}`);
        }
        if (manifest.workBasedLearning.description) {
            addLine(`Description: ${manifest.workBasedLearning.description}`);
        }
        if (manifest.workBasedLearning.artifacts && manifest.workBasedLearning.artifacts.length > 0) {
            addLine("Artifacts:");
            manifest.workBasedLearning.artifacts.forEach((artifact) => {
                addLine(`• ${artifact}`);
            });
        }
    } else {
        addLine("At least one capstone-level WBL activity required (e.g., professional interview, job-shadow, internship, youth apprenticeship, or on-the-job training).");
        addLine("Activity Type: [To be completed]");
        addLine("Hours: [To be documented]");
        addLine("Artifacts: [To be collected]");
    }
    addLine("");

    // Objectives
    addSectionHeader("OBJECTIVES");
    if (manifest.objectives && manifest.objectives.length > 0) {
        manifest.objectives.forEach((obj) => {
            addLine(`• ${obj}`);
        });
    } else {
        addLine("No objectives specified");
    }
    addLine("");

    // Deliverables
    addSectionHeader("DELIVERABLES (Product + Process Bundle)");
    if (manifest.deliverablesDetail) {
        if (manifest.deliverablesDetail.technicalProduct) {
            addLine(`Technical Product: ${manifest.deliverablesDetail.technicalProduct}`);
        }
        if (manifest.deliverablesDetail.processEvidence && manifest.deliverablesDetail.processEvidence.length > 0) {
            addLine("Process Evidence:");
            manifest.deliverablesDetail.processEvidence.forEach((evidence) => {
                addLine(`• ${evidence}`);
            });
        }
        if (manifest.deliverablesDetail.industryFeedback) {
            addLine(`Industry Feedback: ${manifest.deliverablesDetail.industryFeedback}`);
        }
        if (manifest.deliverablesDetail.standardsMap && manifest.deliverablesDetail.standardsMap.length > 0) {
            addLine("Standards Map:");
            manifest.deliverablesDetail.standardsMap.forEach((standard) => {
                addLine(`• ${standard}`);
            });
        }
    }
    if (manifest.deliverables && manifest.deliverables.length > 0) {
        addLine("Additional Deliverables:");
        manifest.deliverables.forEach((del) => {
            addLine(`• ${del}`);
        });
    }
    addLine("");

    // Timeline
    addSectionHeader("TIMELINE");
    if (manifest.timeline && manifest.timeline.length > 0) {
        manifest.timeline.forEach((phase) => {
            // Phase name with weeks - make it bold
            const phaseText = `${phase.phase} (${phase.weeks} weeks)`;
            const phaseRange = addLine(phaseText);
            formattingRequests.push({
                updateTextStyle: {
                    range: {
                        startIndex: phaseRange.startIndex,
                        endIndex: phaseRange.endIndex - 1,
                    },
                    textStyle: {
                        bold: true,
                    },
                    fields: "bold",
                },
            });
            if (phase.tasks && phase.tasks.length > 0) {
                phase.tasks.forEach((task) => {
                    addLine(`  • ${task}`);
                });
            }
            addLine(""); // Empty line between phases
        });
    } else {
        addLine("No timeline specified");
    }
    addLine("");

    // Public Presentation
    addSectionHeader("PUBLIC PRESENTATION");
    if (manifest.publicPresentation) {
        addLine(`Duration: ${manifest.publicPresentation.duration || "8-10 minutes"}`);
        addLine("Defense to a panel (teacher + industry/college rep) with Q&A and rubric.");
        if (manifest.publicPresentation.panelMembers && manifest.publicPresentation.panelMembers.length > 0) {
            addLine("Panel Members:");
            manifest.publicPresentation.panelMembers.forEach((member) => {
                addLine(`• ${member}`);
            });
        }
        if (manifest.publicPresentation.rubricCriteria && manifest.publicPresentation.rubricCriteria.length > 0) {
            addLine("Panel Rubric Criteria:");
            manifest.publicPresentation.rubricCriteria.forEach((criteria) => {
                addLine(`• ${criteria}`);
            });
        }
    } else {
        addLine("8-10 minute defense to a panel (teacher + industry/college rep) with Q&A and rubric.");
        addLine("Panel rubric should rate: problem definition, technical accuracy, industry relevance, communication, professionalism.");
    }
    addLine("");

    // Reflection & Postsecondary Plan
    addSectionHeader("REFLECTION & POSTSECONDARY PLAN");
    if (manifest.reflectionPostsecondary) {
        if (manifest.reflectionPostsecondary.reflection) {
            addLine(`Reflection: ${manifest.reflectionPostsecondary.reflection}`);
        }
        addLine("Updated Postsecondary Plan:");
        if (manifest.reflectionPostsecondary.coursework && manifest.reflectionPostsecondary.coursework.length > 0) {
            addLine("Coursework:");
            manifest.reflectionPostsecondary.coursework.forEach((course) => {
                addLine(`• ${course}`);
            });
        }
        if (manifest.reflectionPostsecondary.training && manifest.reflectionPostsecondary.training.length > 0) {
            addLine("Training:");
            manifest.reflectionPostsecondary.training.forEach((training) => {
                addLine(`• ${training}`);
            });
        }
        if (manifest.reflectionPostsecondary.credentials && manifest.reflectionPostsecondary.credentials.length > 0) {
            addLine("Credentials:");
            manifest.reflectionPostsecondary.credentials.forEach((cred) => {
                addLine(`• ${cred}`);
            });
        }
        if (manifest.reflectionPostsecondary.apprenticeship && manifest.reflectionPostsecondary.apprenticeship.length > 0) {
            addLine("Apprenticeship:");
            manifest.reflectionPostsecondary.apprenticeship.forEach((app) => {
                addLine(`• ${app}`);
            });
        }
        if (manifest.reflectionPostsecondary.collegeMajor && manifest.reflectionPostsecondary.collegeMajor.length > 0) {
            addLine("College Major:");
            manifest.reflectionPostsecondary.collegeMajor.forEach((major) => {
                addLine(`• ${major}`);
            });
        }
    } else {
        addLine("1-2 page reflection + updated plan (coursework, training, credential, apprenticeship, college major).");
        addLine("This helps demonstrate pathway completion and ties to counseling artifacts.");
    }
    addLine("");

    // Rubric
    addSectionHeader("RUBRIC (4 Domains × 4 Levels)");
    if (manifest.rubric) {
        if (manifest.rubric.technicalQuality && manifest.rubric.technicalQuality.length > 0) {
            addLine("Technical Quality (meets pathway standards):");
            manifest.rubric.technicalQuality.forEach((item) => {
                addLine(`• ${item}`);
            });
        }
        if (manifest.rubric.workBasedIntegration && manifest.rubric.workBasedIntegration.length > 0) {
            addLine("Work-Based Integration (uses real feedback/data):");
            manifest.rubric.workBasedIntegration.forEach((item) => {
                addLine(`• ${item}`);
            });
        }
        if (manifest.rubric.communicationProfessionalism && manifest.rubric.communicationProfessionalism.length > 0) {
            addLine("Communication/Professionalism (panel, docs):");
            manifest.rubric.communicationProfessionalism.forEach((item) => {
                addLine(`• ${item}`);
            });
        }
        if (manifest.rubric.reflectionNextSteps && manifest.rubric.reflectionNextSteps.length > 0) {
            addLine("Reflection/Next Steps (concrete postsecondary plan):");
            manifest.rubric.reflectionNextSteps.forEach((item) => {
                addLine(`• ${item}`);
            });
        }
    } else {
        addLine("Technical Quality (meets pathway standards)");
        addLine("Work-Based Integration (uses real feedback/data)");
        addLine("Communication/Professionalism (panel, docs)");
        addLine("Reflection/Next Steps (concrete postsecondary plan)");
        addLine("Align descriptors to your specific pathway's standards so scoring doubles as standards evidence.");
    }
    addLine("");

    // Assessment
    addSectionHeader("ASSESSMENT CRITERIA");
    if (manifest.assessment && manifest.assessment.length > 0) {
        manifest.assessment.forEach((ass) => {
            addLine(`• ${ass}`);
        });
    } else {
        addLine("No assessment criteria specified");
    }
    addLine("");

    // Resources
    addSectionHeader("RESOURCES");
    if (manifest.resources && manifest.resources.length > 0) {
        manifest.resources.forEach((res) => {
            addLine(`• ${res}`);
        });
    } else {
        addLine("No resources specified");
    }
    addLine("");

    // Documentation Checklist
    addSectionHeader("DOCUMENTATION CHECKLIST (For School Records)");
    addLine("□ Roster of capstone students with final grades (C- or better = completer)");
    addLine("□ Artifacts list (proposal, WBL evidence, product, reflection)");
    addLine("□ Panel rubrics + industry participation log");
    addLine("□ SIS coding that flags the capstone course correctly for pathway completion reporting");

    return {
        textContent: sections.join(""),
        formattingRequests: formattingRequests,
    };
}
