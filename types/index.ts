export interface Message {
    role: "user" | "assistant";
    content: string;
    suggested_replies?: string[];
}

export type ConversationPhase = "brainstorm" | "review" | "complete";

export interface ConversationState {
    turnCount: number;
    phase: ConversationPhase;
}

export interface User {
    name?: string | null;
    email?: string | null;
    image?: string | null;
}

export interface ChatProps {
    messages: Message[];
    loading?: boolean;
    onSendMessage: (message: string) => void;
}

export interface MessageHistoryProps {
    messages: Message[];
    loading?: boolean;
}

export interface MessageInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    phase?: ConversationPhase;
}

export interface UserMenuProps {
    user: User;
}

export interface OnboardingProps {
    user: User;
}

export interface CapstoneContent {
    docText: string;
    csvData: string[][];
    slideOutline: Array<{ title: string; content: string[] }>;
}

// CA Capstone Framework Types
export interface ProjectProposal {
    problemOpportunity?: string;
    industryContext?: string;
    endUser?: string;
    successCriteria?: string[];
    mentor?: string;
}

export interface WorkBasedLearning {
    activityType?: "professional-interview" | "job-shadow" | "internship" | "youth-apprenticeship" | "on-the-job-training" | "other";
    hours?: number;
    description?: string;
    artifacts?: string[];
}

export interface DeliverablesDetail {
    technicalProduct?: string;
    processEvidence?: string[];
    industryFeedback?: string;
    standardsMap?: string[];
}

export interface PublicPresentation {
    duration?: string;
    panelMembers?: string[];
    rubricCriteria?: string[];
}

export interface ReflectionPostsecondary {
    reflection?: string;
    coursework?: string[];
    training?: string[];
    credentials?: string[];
    apprenticeship?: string[];
    collegeMajor?: string[];
}

export interface CapstoneRubric {
    technicalQuality?: string[];
    workBasedIntegration?: string[];
    communicationProfessionalism?: string[];
    reflectionNextSteps?: string[];
}

export interface CapstonePlanData {
    title: string;
    ctePathway: string;
    objectives: string[];
    deliverables: string[];
    timeline: Array<{ phase: string; weeks: number; tasks: string[] }>;
    assessment: string[];
    resources: string[];
    content: CapstoneContent;
    // CA Framework extensions (optional for backward compatibility)
    projectProposal?: ProjectProposal;
    workBasedLearning?: WorkBasedLearning;
    deliverablesDetail?: DeliverablesDetail;
    publicPresentation?: PublicPresentation;
    reflectionPostsecondary?: ReflectionPostsecondary;
    rubric?: CapstoneRubric;
}

export interface OnboardingData {
    name: string;
    ctePathway: string;
}

// API Request Types
export interface LLMPlanRequest {
    message: string;
    conversation?: Array<{ role: string; content: string }>;
    generateCapstonePlanData?: boolean;
    turnCount?: number;
    phase?: ConversationPhase;
    onboardingData?: OnboardingData;
}

export interface CapstoneCreateRequest {
    capstonePlanData: CapstonePlanData;
    studentName?: string;
}

// API Response Types
export interface LLMPlanResponse {
    response?: string;
    capstonePlanData?: CapstonePlanData;
    phase: ConversationPhase;
    turnCount: number;
    suggested_replies?: string[];
    // CapstonePlanData fields (when generateCapstonePlanData is true)
    title?: string;
    ctePathway?: string;
    objectives?: string[];
    deliverables?: string[];
    timeline?: Array<{ phase: string; weeks: number; tasks: string[] }>;
    assessment?: string[];
    resources?: string[];
    projectProposal?: ProjectProposal;
    workBasedLearning?: WorkBasedLearning;
    deliverablesDetail?: DeliverablesDetail;
    publicPresentation?: PublicPresentation;
    reflectionPostsecondary?: ReflectionPostsecondary;
    rubric?: CapstoneRubric;
    content?: CapstoneContent;
}

export interface CapstoneCreateResponse {
    success: boolean;
    folderId: string;
    folderLink: string;
    files: {
        doc: {
            id: string;
            link: string;
            name: string;
        };
    };
}
