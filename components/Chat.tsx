"use client";
import MessageHistory from "@/components/MessageHistory";
import MessageInput from "@/components/MessageInput";
import SuggestionChips from "@/components/SuggestionChips";
import { ChatProps, ConversationState } from "@/types";
import { getFallbackSuggestions } from "@/lib/suggestions";

// This is the main chat interface layout.

interface ChatWithStateProps extends ChatProps {
    conversationState?: ConversationState;
    onReviewClick?: () => void;
    reviewLoading?: boolean;
    manifestGenerating?: boolean;
}

function Chat({ messages, loading, onSendMessage, conversationState, onReviewClick, reviewLoading, manifestGenerating }: ChatWithStateProps) {
    const isInputDisabled = loading ||
        conversationState?.phase === "review" ||
        conversationState?.phase === "complete";

    // Get suggestions from last assistant message, or use fallbacks
    const lastAssistantMessage = messages.filter(m => m.role === "assistant").pop();
    const suggestions = lastAssistantMessage?.suggested_replies && lastAssistantMessage.suggested_replies.length > 0
        ? lastAssistantMessage.suggested_replies
        : (conversationState && !isInputDisabled && messages.length > 0 && conversationState.phase !== "review"
            ? getFallbackSuggestions(conversationState.phase, conversationState.turnCount)
            : []);

    const showReviewSection = conversationState?.phase === "review" && !loading && onReviewClick;

    return (
        <div className="flex flex-col w-full max-w-2xl h-full min-h-0">
            <div className="flex-1 min-h-0 mb-4 overflow-hidden">
                <MessageHistory messages={messages} loading={loading} />
            </div>
            {/* Review section or suggestion chips - both appear in the same location */}
            {showReviewSection ? (
                <div className="shrink-0 mb-3 px-2">
                    <div className="p-4 bg-[#FAFCFB] dark:bg-[#2A2A2A] border border-[#E8F0EB] dark:border-[#2F3A30] rounded-2xl">
                        <p className="text-sm text-gray-800 dark:text-gray-200 mb-3 font-light">
                            Ready to review your capstone plan?
                        </p>
                        <button
                            onClick={onReviewClick}
                            disabled={reviewLoading || manifestGenerating}
                            className="cursor-pointer w-full px-6 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 active:bg-gray-950 dark:active:bg-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {/* animation for generating plan text */}
                            {reviewLoading || manifestGenerating ? (
                                <span className="inline-flex items-center justify-center">
                                    {"Generating Plan...".split("").map((char, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-block"
                                            style={{
                                                animation: `wave 1.5s ease-in-out infinite`,
                                                animationDelay: `${idx * 0.05}s`,
                                            }}
                                        >
                                            {char === " " ? "\u00A0" : char}
                                        </span>
                                    ))}
                                </span>
                            ) : (
                                "Review Your Capstone Plan"
                            )}
                        </button>
                    </div>
                </div>
            ) : suggestions.length > 0 && (
                <div className="shrink-0 mb-3 px-2">
                    <SuggestionChips
                        suggestions={suggestions}
                        onSuggestionClick={onSendMessage}
                        disabled={isInputDisabled}
                    />
                </div>
            )}
            <div className="shrink-0 min-h-[80px]">
                <MessageInput
                    onSend={onSendMessage}
                    disabled={isInputDisabled}
                    phase={conversationState?.phase}
                />
            </div>
        </div>
    );
}

export default Chat;