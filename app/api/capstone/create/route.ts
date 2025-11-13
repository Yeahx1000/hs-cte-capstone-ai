import { NextResponse } from "next/server";
import { google } from "googleapis";
import { CapstonePlanData, CapstoneCreateRequest } from "@/types";
import { OAuth2Client } from "google-auth-library";
import type { docs_v1 } from "googleapis";
import { CapstonePlanDataSchema } from "@/lib/capstonePlanData";

export const runtime = "nodejs";

// IMPORTANT!!!: formerly this project had a route /drive/create/route.ts, but I moved it here for consolidation and organization.

// This route handles the creation of the capstone files in Google Drive, 
// It formats the data from capstone plan data as a structured template for the Google Docs API.
// two main parts -> 1. POST request to creat file in drive -> 2. Data Formatting helper function

// ==================================================
// Main function (creates the files in Google Drive)
// ==================================================

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const body = await request.json() as CapstoneCreateRequest;
        const { capstonePlanData, studentName } = body;

        // Get the user's access token from Authorization header, not service account
        const authHeader = request.headers.get("Authorization");
        const userAccessToken = authHeader?.replace("Bearer ", "");

        if (!userAccessToken) {
            return NextResponse.json(
                { error: "User authentication required. Please log in again." },
                { status: 401 }
            );
        }

        if (!capstonePlanData) {
            return NextResponse.json(
                { error: "Capstone plan data is required" },
                { status: 400 }
            );
        }

        // Validate capstone plan data with Zod schema
        let typedPlanData: CapstonePlanData;
        try {
            typedPlanData = CapstonePlanDataSchema.parse(capstonePlanData) as CapstonePlanData;
        } catch (err) {
            return NextResponse.json(
                { error: "Invalid capstone plan data format", details: err instanceof Error ? err.message : "Validation failed" },
                { status: 400 }
            );
        }
        const folderName = `CTE Capstone Template – ${studentName || "Student"} - ${typedPlanData.ctePathway || "No Pathway Specified"}`;

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
                name: `${typedPlanData.title} - Project Plan`,
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
        // Always generate full template from capstone plan data to ensure all user input is included
        const { textContent, formattingRequests } = formatCapstonePlanDataAsStructuredContent(typedPlanData);

        // Combine insert text request with formatting requests
        const requests: docs_v1.Schema$Request[] = [
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
            name: `${typedPlanData.title} - Project Plan`,
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





// ===========================================
// Helper functions (formatting the document)
// ===========================================

// Helper function to format capstone plan data with structured content for Google Docs API
function formatCapstonePlanDataAsStructuredContent(planData: CapstonePlanData): {
    textContent: string;
    formattingRequests: docs_v1.Schema$Request[]
} {
    const sections: string[] = [];
    const formattingRequests: docs_v1.Schema$Request[] = [];
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
    const titleRange = addLine(planData.title);
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
    addLine(`CTE Pathway: ${planData.ctePathway || "Not specified"}`);
    addLine("Note: This capstone is the final course in a 2-3 course CTE sequence. A grade of C- or better marks a CTE Pathway Completer.");
    addLine("");

    // Project Proposal
    addSectionHeader("PROJECT PROPOSAL (Teacher-Approved)");
    if (planData.projectProposal) {
        if (planData.projectProposal.problemOpportunity) {
            addLine(`Problem/Opportunity: ${planData.projectProposal.problemOpportunity}`);
        }
        if (planData.projectProposal.industryContext) {
            addLine(`Industry Context: ${planData.projectProposal.industryContext}`);
        }
        if (planData.projectProposal.endUser) {
            addLine(`End User: ${planData.projectProposal.endUser}`);
        }
        if (planData.projectProposal.successCriteria && planData.projectProposal.successCriteria.length > 0) {
            addLine("Success Criteria:");
            planData.projectProposal.successCriteria.forEach((criteria) => {
                addLine(`• ${criteria}`);
            });
        }
        if (planData.projectProposal.mentor) {
            addLine(`Mentor: ${planData.projectProposal.mentor}`);
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
    if (planData.workBasedLearning) {
        if (planData.workBasedLearning.activityType) {
            const activityLabels: Record<string, string> = {
                "professional-interview": "Professional Interview",
                "job-shadow": "Job Shadow",
                "internship": "Internship",
                "youth-apprenticeship": "Youth Apprenticeship",
                "on-the-job-training": "On-the-Job Training",
                "other": "Other"
            };
            addLine(`Activity Type: ${activityLabels[planData.workBasedLearning.activityType] || planData.workBasedLearning.activityType}`);
        }
        if (planData.workBasedLearning.hours) {
            addLine(`Hours: ${planData.workBasedLearning.hours}`);
        }
        if (planData.workBasedLearning.description) {
            addLine(`Description: ${planData.workBasedLearning.description}`);
        }
        if (planData.workBasedLearning.artifacts && planData.workBasedLearning.artifacts.length > 0) {
            addLine("Artifacts:");
            planData.workBasedLearning.artifacts.forEach((artifact) => {
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
    if (planData.objectives && planData.objectives.length > 0) {
        planData.objectives.forEach((obj) => {
            addLine(`• ${obj}`);
        });
    } else {
        addLine("No objectives specified");
    }
    addLine("");

    // Deliverables
    addSectionHeader("DELIVERABLES (Product + Process Bundle)");
    if (planData.deliverablesDetail) {
        if (planData.deliverablesDetail.technicalProduct) {
            addLine(`Technical Product: ${planData.deliverablesDetail.technicalProduct}`);
        }
        if (planData.deliverablesDetail.processEvidence && planData.deliverablesDetail.processEvidence.length > 0) {
            addLine("Process Evidence:");
            planData.deliverablesDetail.processEvidence.forEach((evidence) => {
                addLine(`• ${evidence}`);
            });
        }
        if (planData.deliverablesDetail.industryFeedback) {
            addLine(`Industry Feedback: ${planData.deliverablesDetail.industryFeedback}`);
        }
        if (planData.deliverablesDetail.standardsMap && planData.deliverablesDetail.standardsMap.length > 0) {
            addLine("Standards Map:");
            planData.deliverablesDetail.standardsMap.forEach((standard) => {
                addLine(`• ${standard}`);
            });
        }
    }
    if (planData.deliverables && planData.deliverables.length > 0) {
        addLine("Additional Deliverables:");
        planData.deliverables.forEach((del) => {
            addLine(`• ${del}`);
        });
    }
    addLine("");

    // Timeline
    addSectionHeader("TIMELINE");
    if (planData.timeline && planData.timeline.length > 0) {
        planData.timeline.forEach((phase) => {
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
    if (planData.publicPresentation) {
        addLine(`Duration: ${planData.publicPresentation.duration || "8-10 minutes"}`);
        addLine("Defense to a panel (teacher + industry/college rep) with Q&A and rubric.");
        if (planData.publicPresentation.panelMembers && planData.publicPresentation.panelMembers.length > 0) {
            addLine("Panel Members:");
            planData.publicPresentation.panelMembers.forEach((member) => {
                addLine(`• ${member}`);
            });
        }
        if (planData.publicPresentation.rubricCriteria && planData.publicPresentation.rubricCriteria.length > 0) {
            addLine("Panel Rubric Criteria:");
            planData.publicPresentation.rubricCriteria.forEach((criteria) => {
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
    if (planData.reflectionPostsecondary) {
        if (planData.reflectionPostsecondary.reflection) {
            addLine(`Reflection: ${planData.reflectionPostsecondary.reflection}`);
        }
        addLine("Updated Postsecondary Plan:");
        if (planData.reflectionPostsecondary.coursework && planData.reflectionPostsecondary.coursework.length > 0) {
            addLine("Coursework:");
            planData.reflectionPostsecondary.coursework.forEach((course) => {
                addLine(`• ${course}`);
            });
        }
        if (planData.reflectionPostsecondary.training && planData.reflectionPostsecondary.training.length > 0) {
            addLine("Training:");
            planData.reflectionPostsecondary.training.forEach((training) => {
                addLine(`• ${training}`);
            });
        }
        if (planData.reflectionPostsecondary.credentials && planData.reflectionPostsecondary.credentials.length > 0) {
            addLine("Credentials:");
            planData.reflectionPostsecondary.credentials.forEach((cred) => {
                addLine(`• ${cred}`);
            });
        }
        if (planData.reflectionPostsecondary.apprenticeship && planData.reflectionPostsecondary.apprenticeship.length > 0) {
            addLine("Apprenticeship:");
            planData.reflectionPostsecondary.apprenticeship.forEach((app) => {
                addLine(`• ${app}`);
            });
        }
        if (planData.reflectionPostsecondary.collegeMajor && planData.reflectionPostsecondary.collegeMajor.length > 0) {
            addLine("College Major:");
            planData.reflectionPostsecondary.collegeMajor.forEach((major) => {
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
    if (planData.rubric) {
        if (planData.rubric.technicalQuality && planData.rubric.technicalQuality.length > 0) {
            addLine("Technical Quality (meets pathway standards):");
            planData.rubric.technicalQuality.forEach((item) => {
                addLine(`• ${item}`);
            });
        }
        if (planData.rubric.workBasedIntegration && planData.rubric.workBasedIntegration.length > 0) {
            addLine("Work-Based Integration (uses real feedback/data):");
            planData.rubric.workBasedIntegration.forEach((item) => {
                addLine(`• ${item}`);
            });
        }
        if (planData.rubric.communicationProfessionalism && planData.rubric.communicationProfessionalism.length > 0) {
            addLine("Communication/Professionalism (panel, docs):");
            planData.rubric.communicationProfessionalism.forEach((item) => {
                addLine(`• ${item}`);
            });
        }
        if (planData.rubric.reflectionNextSteps && planData.rubric.reflectionNextSteps.length > 0) {
            addLine("Reflection/Next Steps (concrete postsecondary plan):");
            planData.rubric.reflectionNextSteps.forEach((item) => {
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
    if (planData.assessment && planData.assessment.length > 0) {
        planData.assessment.forEach((ass) => {
            addLine(`• ${ass}`);
        });
    } else {
        addLine("No assessment criteria specified");
    }
    addLine("");

    // Resources
    addSectionHeader("RESOURCES");
    if (planData.resources && planData.resources.length > 0) {
        planData.resources.forEach((res) => {
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
