// Import Manifest type for use in other interfaces
import type { Manifest } from "@/lib/manifest";

// Re-exporting Manifest types (from lib/manifest.ts)
export type { Manifest, TimelinePhase } from "@/lib/manifest";

/* 
--------------------------------
Explanation for above if confusing to look at:
1. importing type from manifest.ts here, 
2. then re-exporting to give access to other files. (so bringing in, then sending out again)
--------------------------------
*/

// Split the types from project and added here to keep it clean and organized. 
// Easier to manage and update I believe.

// Chat types
export interface Message {
    role: "user" | "assistant";
    content: string;
}

// Conversation state types
export type ConversationPhase = "brainstorm" | "review" | "complete";

export interface ConversationState {
    turnCount: number;
    phase: ConversationPhase;
}

// User types (from NextAuth)
export interface User {
    name?: string | null;
    email?: string | null;
    image?: string | null;
}

// Component prop types
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

export interface SummaryCardProps {
    manifest: Manifest | null;
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
