"use client";
import { useEffect, useRef, useState } from "react";
import { MessageHistoryProps } from "@/types";
import { useTypingAnimation } from "@/lib/hooks/useTypingAnimation";

function MessageHistory({ messages, loading }: MessageHistoryProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
    const messagesLengthRef = useRef(messages.length);
    const [initialMessage, setInitialMessage] = useState<string>("Share your dream career or passion, and I'll help you build a project template around it!");

    // Get CTE pathway from onboarding data and build initial message
    useEffect(() => {
        const onboardingDataStr = sessionStorage.getItem("onboarding");
        if (onboardingDataStr) {
            try {
                const onboardingData = JSON.parse(onboardingDataStr);
                if (onboardingData?.ctePathway) {
                    setInitialMessage(`Share your dream career or passion in ${onboardingData.ctePathway}, and I'll help you build a project template around it!`);
                }
            } catch {
                // Invalid onboarding data, use default message
            }
        }
    }, []); // runs on mount only

    // Typing animation for the initial message
    const animatedInitialMessage = useTypingAnimation(initialMessage, 20, messages.length === 0);

    // logic to auto-scroll to bottom on new responses, QOL feature.
    const isNearBottom = () => {
        const container = scrollContainerRef.current;
        if (!container) return true;

        const threshold = 150; // pixels from bottom
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        return distanceFromBottom < threshold;
    };

    const handleScroll = () => {
        if (isNearBottom()) {
            setShouldAutoScroll(true);
        } else {
            setShouldAutoScroll(false);
        }
    };

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const messagesIncreased = messages.length > messagesLengthRef.current;
        messagesLengthRef.current = messages.length;

        if (messagesIncreased || loading) {
            if (shouldAutoScroll || isNearBottom()) {
                requestAnimationFrame(() => {
                    if (container) {
                        container.scrollTop = container.scrollHeight;
                        setShouldAutoScroll(true);
                    }
                });
            }
        }
    }, [messages.length, loading, shouldAutoScroll]);

    if (messages.length === 0) {
        return (
            <div className="h-full min-h-[400px] flex items-center justify-center py-8 px-8">
                <div className="text-center max-w-md">
                    <p className="text-gray-600 dark:text-gray-300 text-xl font-light leading-relaxed mb-4">
                        {animatedInitialMessage}
                    </p>
                    <div className="text-gray-400 dark:text-gray-500 text-sm mb-4 font-light">
                        Message History will appear here
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={scrollContainerRef}
            className="h-full overflow-y-auto px-8 py-8 min-h-[400px]"
            onScroll={handleScroll}
        >
            <div className="flex flex-col gap-4">
                {messages.map((message, idx) => (
                    <div
                        key={idx}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-3xl px-4 py-3 ${message.role === "user"
                                ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
                                : "bg-[#F5F7F6] dark:bg-[#2A2A2A] text-gray-900 dark:text-gray-100 border border-[#E0E8E3] dark:border-[#2F3A30]"
                                }`}
                        >
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-[#F5F7F6] dark:bg-[#2A2A2A] border border-[#E0E8E3] dark:border-[#2F3A30] rounded-3xl px-4 py-3">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MessageHistory;