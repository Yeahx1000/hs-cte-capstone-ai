import { z } from "zod";

// I'm using Zod for data validation, reason? Typescript first approach, this is the schema for the manifest

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

export const ManifestSchema = z.object({
    title: z.string(),
    ctePathway: z.string(),
    objectives: z.array(z.string()),
    deliverables: z.array(z.string()),
    timeline: z.array(TimelinePhaseSchema),
    assessment: z.array(z.string()),
    resources: z.array(z.string()),
    content: CapstoneContentSchema.optional(),
});

export type Manifest = z.infer<typeof ManifestSchema>;
export type TimelinePhase = z.infer<typeof TimelinePhaseSchema>;
export type CapstoneContent = z.infer<typeof CapstoneContentSchema>;

