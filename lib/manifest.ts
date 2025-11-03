import { z } from "zod";

// I'm using Zod for data validation. 
// Reason? Typescript first approach, this is the schema for the manifest

export const TimelinePhaseSchema = z.object({
    phase: z.string(),
    weeks: z.number(),
    tasks: z.array(z.string()),
});

export const CapstoneContentSchema = z.object({
    docText: z.string(),
    csvData: z.array(z.array(z.string())),
    slideOutline: z.array(
        z.object({
            title: z.string(),
            content: z.array(z.string()),
        })
    ),
});

// CA Capstone Framework extension schemas
export const ProjectProposalSchema = z.object({
    problemOpportunity: z.string().optional(),
    industryContext: z.string().optional(),
    endUser: z.string().optional(),
    successCriteria: z.array(z.string()).optional(),
    mentor: z.string().optional(),
}).optional();

export const WorkBasedLearningSchema = z.object({
    activityType: z.enum(["professional-interview", "job-shadow", "internship", "youth-apprenticeship", "on-the-job-training", "other"]).optional(),
    hours: z.number().optional(),
    description: z.string().optional(),
    artifacts: z.array(z.string()).optional(),
}).optional();

export const DeliverablesDetailSchema = z.object({
    technicalProduct: z.string().optional(),
    processEvidence: z.array(z.string()).optional(),
    industryFeedback: z.string().optional(),
    standardsMap: z.array(z.string()).optional(),
}).optional();

export const PublicPresentationSchema = z.object({
    duration: z.string().optional(),
    panelMembers: z.array(z.string()).optional(),
    rubricCriteria: z.array(z.string()).optional(),
}).optional();

export const ReflectionPostsecondarySchema = z.object({
    reflection: z.string().optional(),
    coursework: z.array(z.string()).optional(),
    training: z.array(z.string()).optional(),
    credentials: z.array(z.string()).optional(),
    apprenticeship: z.array(z.string()).optional(),
    collegeMajor: z.array(z.string()).optional(),
}).optional();

export const CapstoneRubricSchema = z.object({
    technicalQuality: z.array(z.string()).optional(),
    workBasedIntegration: z.array(z.string()).optional(),
    communicationProfessionalism: z.array(z.string()).optional(),
    reflectionNextSteps: z.array(z.string()).optional(),
}).optional();

export const ManifestSchema = z.object({
    title: z.string(),
    ctePathway: z.string(),
    objectives: z.array(z.string()),
    deliverables: z.array(z.string()),
    timeline: z.array(TimelinePhaseSchema),
    assessment: z.array(z.string()),
    resources: z.array(z.string()),
    content: CapstoneContentSchema.optional(),
    // CA Framework extensions (optional for backward compatibility)
    projectProposal: ProjectProposalSchema,
    workBasedLearning: WorkBasedLearningSchema,
    deliverablesDetail: DeliverablesDetailSchema,
    publicPresentation: PublicPresentationSchema,
    reflectionPostsecondary: ReflectionPostsecondarySchema,
    rubric: CapstoneRubricSchema,
});

export type Manifest = z.infer<typeof ManifestSchema>;
export type TimelinePhase = z.infer<typeof TimelinePhaseSchema>;
export type CapstoneContent = z.infer<typeof CapstoneContentSchema>;

