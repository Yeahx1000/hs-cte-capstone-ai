import { ConversationPhase } from "@/types";

/**
 * Get fallback suggestion chips based on conversation phase and context
 */

// These are SUPER BASIC (and admittedly awkwardly placed) suggestions for now just for an MVP to show something. 
// not really useful but for now it's a placeholder.

export function getFallbackSuggestions(
    phase: ConversationPhase,
    turnCount: number,
    _ctePathway?: string
): string[] {
    if (phase === "review" || phase === "complete") {
        return [];
    }

    // Early phase
    if (turnCount <= 1) {
        return [
            "I'm interested in helping my community",
            "I want to explore a career I'm passionate about",
            "I have an idea for a project that solves a real problem",
            "I'm not sure yet, can you help me brainstorm?",
        ];
    }

    // Mid phase 
    if (turnCount <= 3) {
        return [
            "I want to create a product or service",
            "I plan to work with a local business or organization",
            "I'd like to document my process and progress",
            "I want to get feedback from professionals",
        ];
    }

    // Later phase 
    return [
        "I'm ready to finalize my plan",
        "Let me add more details first",
        "Can you help me refine my timeline?",
        "I want to review what we have so far",
    ];
}

