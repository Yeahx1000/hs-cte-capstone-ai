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

    // CTE Pathway Alignment (non-negotiable)
    sections.push("PATHWAY ALIGNMENT");
    sections.push(`CTE Pathway: ${manifest.ctePathway || "Not specified"}`);
    sections.push("Note: This capstone is the final course in a 2-3 course CTE sequence. A grade of C- or better marks a CTE Pathway Completer.");
    sections.push(""); // Empty line

    // Project Proposal
    sections.push("PROJECT PROPOSAL (Teacher-Approved)");
    if (manifest.projectProposal) {
        if (manifest.projectProposal.problemOpportunity) {
            sections.push(`Problem/Opportunity: ${manifest.projectProposal.problemOpportunity}`);
        }
        if (manifest.projectProposal.industryContext) {
            sections.push(`Industry Context: ${manifest.projectProposal.industryContext}`);
        }
        if (manifest.projectProposal.endUser) {
            sections.push(`End User: ${manifest.projectProposal.endUser}`);
        }
        if (manifest.projectProposal.successCriteria && manifest.projectProposal.successCriteria.length > 0) {
            sections.push("Success Criteria:");
            manifest.projectProposal.successCriteria.forEach((criteria) => {
                sections.push(`• ${criteria}`);
            });
        }
        if (manifest.projectProposal.mentor) {
            sections.push(`Mentor: ${manifest.projectProposal.mentor}`);
        }
        sections.push("Must map to CTE Model Curriculum Standards for the pathway + Career Ready Practices (communication, teamwork, problem solving).");
    } else {
        sections.push("Problem/Opportunity: [To be completed]");
        sections.push("Industry Context: [To be completed]");
        sections.push("End User: [To be completed]");
        sections.push("Success Criteria: [To be completed]");
        sections.push("Timeline: [See Timeline section below]");
        sections.push("Mentor: [If applicable]");
    }
    sections.push(""); // Empty line

    // Work-Based Learning Component
    sections.push("WORK-BASED LEARNING COMPONENT");
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
            sections.push(`Activity Type: ${activityLabels[manifest.workBasedLearning.activityType] || manifest.workBasedLearning.activityType}`);
        }
        if (manifest.workBasedLearning.hours) {
            sections.push(`Hours: ${manifest.workBasedLearning.hours}`);
        }
        if (manifest.workBasedLearning.description) {
            sections.push(`Description: ${manifest.workBasedLearning.description}`);
        }
        if (manifest.workBasedLearning.artifacts && manifest.workBasedLearning.artifacts.length > 0) {
            sections.push("Artifacts:");
            manifest.workBasedLearning.artifacts.forEach((artifact) => {
                sections.push(`• ${artifact}`);
            });
        }
    } else {
        sections.push("At least one capstone-level WBL activity required (e.g., professional interview, job-shadow, internship, youth apprenticeship, or on-the-job training).");
        sections.push("Activity Type: [To be completed]");
        sections.push("Hours: [To be documented]");
        sections.push("Artifacts: [To be collected]");
    }
    sections.push(""); // Empty line

    // Objectives
    sections.push("OBJECTIVES");
    if (manifest.objectives && manifest.objectives.length > 0) {
        manifest.objectives.forEach((obj) => {
            sections.push(`• ${obj}`);
        });
    } else {
        sections.push("No objectives specified");
    }
    sections.push(""); // Empty line

    // Deliverables (Enhanced)
    sections.push("DELIVERABLES (Product + Process Bundle)");
    if (manifest.deliverablesDetail) {
        if (manifest.deliverablesDetail.technicalProduct) {
            sections.push(`Technical Product: ${manifest.deliverablesDetail.technicalProduct}`);
        }
        if (manifest.deliverablesDetail.processEvidence && manifest.deliverablesDetail.processEvidence.length > 0) {
            sections.push("Process Evidence:");
            manifest.deliverablesDetail.processEvidence.forEach((evidence) => {
                sections.push(`• ${evidence}`);
            });
        }
        if (manifest.deliverablesDetail.industryFeedback) {
            sections.push(`Industry Feedback: ${manifest.deliverablesDetail.industryFeedback}`);
        }
        if (manifest.deliverablesDetail.standardsMap && manifest.deliverablesDetail.standardsMap.length > 0) {
            sections.push("Standards Map:");
            manifest.deliverablesDetail.standardsMap.forEach((standard) => {
                sections.push(`• ${standard}`);
            });
        }
    }
    if (manifest.deliverables && manifest.deliverables.length > 0) {
        sections.push("Additional Deliverables:");
        manifest.deliverables.forEach((del) => {
            sections.push(`• ${del}`);
        });
    }
    sections.push(""); // Empty line

    // Timeline
    sections.push("TIMELINE");
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

    // Public Presentation
    sections.push("PUBLIC PRESENTATION");
    if (manifest.publicPresentation) {
        sections.push(`Duration: ${manifest.publicPresentation.duration || "8-10 minutes"}`);
        sections.push("Defense to a panel (teacher + industry/college rep) with Q&A and rubric.");
        if (manifest.publicPresentation.panelMembers && manifest.publicPresentation.panelMembers.length > 0) {
            sections.push("Panel Members:");
            manifest.publicPresentation.panelMembers.forEach((member) => {
                sections.push(`• ${member}`);
            });
        }
        if (manifest.publicPresentation.rubricCriteria && manifest.publicPresentation.rubricCriteria.length > 0) {
            sections.push("Panel Rubric Criteria:");
            manifest.publicPresentation.rubricCriteria.forEach((criteria) => {
                sections.push(`• ${criteria}`);
            });
        }
    } else {
        sections.push("8-10 minute defense to a panel (teacher + industry/college rep) with Q&A and rubric.");
        sections.push("Panel rubric should rate: problem definition, technical accuracy, industry relevance, communication, professionalism.");
    }
    sections.push(""); // Empty line

    // Reflection & Postsecondary Plan
    sections.push("REFLECTION & POSTSECONDARY PLAN");
    if (manifest.reflectionPostsecondary) {
        if (manifest.reflectionPostsecondary.reflection) {
            sections.push(`Reflection: ${manifest.reflectionPostsecondary.reflection}`);
        }
        sections.push("Updated Postsecondary Plan:");
        if (manifest.reflectionPostsecondary.coursework && manifest.reflectionPostsecondary.coursework.length > 0) {
            sections.push("Coursework:");
            manifest.reflectionPostsecondary.coursework.forEach((course) => {
                sections.push(`• ${course}`);
            });
        }
        if (manifest.reflectionPostsecondary.training && manifest.reflectionPostsecondary.training.length > 0) {
            sections.push("Training:");
            manifest.reflectionPostsecondary.training.forEach((training) => {
                sections.push(`• ${training}`);
            });
        }
        if (manifest.reflectionPostsecondary.credentials && manifest.reflectionPostsecondary.credentials.length > 0) {
            sections.push("Credentials:");
            manifest.reflectionPostsecondary.credentials.forEach((cred) => {
                sections.push(`• ${cred}`);
            });
        }
        if (manifest.reflectionPostsecondary.apprenticeship && manifest.reflectionPostsecondary.apprenticeship.length > 0) {
            sections.push("Apprenticeship:");
            manifest.reflectionPostsecondary.apprenticeship.forEach((app) => {
                sections.push(`• ${app}`);
            });
        }
        if (manifest.reflectionPostsecondary.collegeMajor && manifest.reflectionPostsecondary.collegeMajor.length > 0) {
            sections.push("College Major:");
            manifest.reflectionPostsecondary.collegeMajor.forEach((major) => {
                sections.push(`• ${major}`);
            });
        }
    } else {
        sections.push("1-2 page reflection + updated plan (coursework, training, credential, apprenticeship, college major).");
        sections.push("This helps demonstrate pathway completion and ties to counseling artifacts.");
    }
    sections.push(""); // Empty line

    // Rubric
    sections.push("RUBRIC (4 Domains × 4 Levels)");
    if (manifest.rubric) {
        if (manifest.rubric.technicalQuality && manifest.rubric.technicalQuality.length > 0) {
            sections.push("Technical Quality (meets pathway standards):");
            manifest.rubric.technicalQuality.forEach((item) => {
                sections.push(`• ${item}`);
            });
        }
        if (manifest.rubric.workBasedIntegration && manifest.rubric.workBasedIntegration.length > 0) {
            sections.push("Work-Based Integration (uses real feedback/data):");
            manifest.rubric.workBasedIntegration.forEach((item) => {
                sections.push(`• ${item}`);
            });
        }
        if (manifest.rubric.communicationProfessionalism && manifest.rubric.communicationProfessionalism.length > 0) {
            sections.push("Communication/Professionalism (panel, docs):");
            manifest.rubric.communicationProfessionalism.forEach((item) => {
                sections.push(`• ${item}`);
            });
        }
        if (manifest.rubric.reflectionNextSteps && manifest.rubric.reflectionNextSteps.length > 0) {
            sections.push("Reflection/Next Steps (concrete postsecondary plan):");
            manifest.rubric.reflectionNextSteps.forEach((item) => {
                sections.push(`• ${item}`);
            });
        }
    } else {
        sections.push("Technical Quality (meets pathway standards)");
        sections.push("Work-Based Integration (uses real feedback/data)");
        sections.push("Communication/Professionalism (panel, docs)");
        sections.push("Reflection/Next Steps (concrete postsecondary plan)");
        sections.push("Align descriptors to your specific pathway's standards so scoring doubles as standards evidence.");
    }
    sections.push(""); // Empty line

    // Assessment
    sections.push("ASSESSMENT CRITERIA");
    if (manifest.assessment && manifest.assessment.length > 0) {
        manifest.assessment.forEach((ass) => {
            sections.push(`• ${ass}`);
        });
    } else {
        sections.push("No assessment criteria specified");
    }
    sections.push(""); // Empty line

    // Resources
    sections.push("RESOURCES");
    if (manifest.resources && manifest.resources.length > 0) {
        manifest.resources.forEach((res) => {
            sections.push(`• ${res}`);
        });
    } else {
        sections.push("No resources specified");
    }
    sections.push(""); // Empty line

    // Documentation Checklist
    sections.push("DOCUMENTATION CHECKLIST (For School Records)");
    sections.push("□ Roster of capstone students with final grades (C- or better = completer)");
    sections.push("□ Artifacts list (proposal, WBL evidence, product, reflection)");
    sections.push("□ Panel rubrics + industry participation log");
    sections.push("□ SIS coding that flags the capstone course correctly for pathway completion reporting");

    return sections.join("\n");
}
