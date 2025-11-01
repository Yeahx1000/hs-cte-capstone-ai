export interface Message {
    role: "user" | "assistant";
    content: string;
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

export interface CapstoneManifest {
    title: string;
    ctePathway: string;
    objectives: string[];
    deliverables: string[];
    timeline: Array<{ phase: string; weeks: number; tasks: string[] }>;
    assessment: string[];
    resources: string[];
    content: CapstoneContent;
}
