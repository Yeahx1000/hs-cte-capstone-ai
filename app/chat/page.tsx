"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Chat from "@/components/Chat";
import UserMenu from "@/components/UserMenu";
import ReviewOverlay from "@/components/ReviewOverlay";
import { useChat } from "@/lib/hooks/useChat";
import { CapstonePlanData, CapstonePlanDataSchema } from "@/lib/capstonePlanData";
import { OnboardingData } from "@/types";

export default function ChatPage() {
    const { data: session } = useSession();
    const { messages, loading, error, capstonePlanData, sendMessage, conversationState, generateCapstonePlanData, capstonePlanDataGenerating } = useChat();
    const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [currentCapstonePlanData, setCurrentCapstonePlanData] = useState<CapstonePlanData | null>(null);

    useEffect(() => {
        // Get onboarding data from sessionStorage (optional)
        const data = sessionStorage.getItem("onboarding");
        if (data) {
            try {
                const parsedData = JSON.parse(data) as OnboardingData;
                setOnboardingData(parsedData);
            } catch {
                // Invalid data, just continue without it
            }
        }
    }, []);

    // Update current capstone plan data when capstonePlanData from hook changes
    useEffect(() => {
        if (capstonePlanData) {
            setCurrentCapstonePlanData(capstonePlanData);
        }
    }, [capstonePlanData]);

    // Prefetch capstone plan data when review button is about to appear (attempting to reduce latency)
    useEffect(() => {
        // Start generating capstone plan data in background when we have enough data
        if (conversationState?.phase === "review" && !capstonePlanData && !capstonePlanDataGenerating && !loading && messages.length >= 4) {
            const storedPlanData = sessionStorage.getItem("capstonePlanData");
            // Only prefetch if we don't already have capstone plan data
            if (!storedPlanData) {
                // Don't await - let it run in background
                generateCapstonePlanData(onboardingData ?? undefined).catch(() => {
                    // Silently fail - user can regenerate if needed
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationState?.phase, capstonePlanData, capstonePlanDataGenerating, loading, messages.length]);

    const handleSendMessage = (content: string) => {
        sendMessage(content, onboardingData ?? undefined);
    };

    const handleReviewClick = async (): Promise<void> => {
        if (messages.length > 0) {
            setReviewLoading(true);
            try {
                // Check if capstone plan data was already generated in background
                const storedPlanData = sessionStorage.getItem("capstonePlanData");
                let shouldGenerate = true;

                if (storedPlanData) {
                    try {
                        const parsed = JSON.parse(storedPlanData);
                        const validated = CapstonePlanDataSchema.parse(parsed);
                        // Use existing capstone plan data if it's valid and we're not forced to regenerate
                        if (validated && validated.title && validated.ctePathway) {
                            // If there's already valid capstone plan data, use it
                            // But still ensure CTE pathway matches onboarding
                            if (onboardingData?.ctePathway && validated.ctePathway !== onboardingData.ctePathway) {
                                validated.ctePathway = onboardingData.ctePathway;
                                sessionStorage.setItem("capstonePlanData", JSON.stringify(validated));
                            }
                            setCurrentCapstonePlanData(validated);
                            shouldGenerate = false;
                        }
                    } catch {
                        // Invalid capstone plan data, regenerate
                    }
                }

                if (shouldGenerate) {
                    // Clear old capstone plan data to force regeneration
                    sessionStorage.removeItem("capstonePlanData");
                    const generated = await generateCapstonePlanData(onboardingData ?? undefined);
                    if (!generated) {
                        alert("Failed to generate capstone plan. Please try again.");
                        return;
                    }
                    setCurrentCapstonePlanData(generated);
                }

                // Open overlay with capstone plan data
                setIsReviewOpen(true);
            } catch {
                alert("Failed to generate capstone plan. Please try again.");
            } finally {
                setReviewLoading(false);
            }
        } else {
            // No messages, check if we have stored capstone plan data
            const storedPlanData = sessionStorage.getItem("capstonePlanData");
            if (storedPlanData) {
                try {
                    const parsed = JSON.parse(storedPlanData);
                    const validated = CapstonePlanDataSchema.parse(parsed);
                    if (validated && validated.title && validated.ctePathway) {
                        setCurrentCapstonePlanData(validated);
                        setIsReviewOpen(true);
                        return;
                    }
                } catch {
                    // Invalid capstone plan data
                }
            }
            alert("No conversation found. Please start a conversation first.");
        }
    };

    const handleCapstonePlanDataUpdate = (updatedCapstonePlanData: CapstonePlanData) => {
        setCurrentCapstonePlanData(updatedCapstonePlanData);
        sessionStorage.setItem("capstonePlanData", JSON.stringify(updatedCapstonePlanData));
    };

    if (!session?.user) {
        return null; // Will redirect via middleware
    }

    return (
        <>
            <div className="flex flex-col h-screen bg-white dark:bg-[#1A1A1A] overflow-hidden">
                <div className="w-full px-6 py-4 shrink-0">
                    <div className="flex justify-end max-w-7xl mx-auto">
                        <UserMenu user={session.user} />
                    </div>
                </div>
                <div className="flex-1 flex items-start justify-center max-w-7xl mx-auto w-full px-6 pb-8 gap-8 overflow-hidden min-h-0">
                    <div className="flex-1 max-w-2xl h-full flex flex-col min-h-0">
                        <div className="flex-1 min-h-0 flex flex-col">
                            <Chat
                                messages={messages}
                                loading={loading}
                                onSendMessage={handleSendMessage}
                                conversationState={conversationState}
                                onReviewClick={handleReviewClick}
                                reviewLoading={reviewLoading}
                                capstonePlanDataGenerating={capstonePlanDataGenerating}
                            />
                        </div>
                        {error && (
                            <div className="mt-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl shrink-0">
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {currentCapstonePlanData && (
                <ReviewOverlay
                    capstonePlanData={currentCapstonePlanData}
                    isOpen={isReviewOpen}
                    onClose={() => setIsReviewOpen(false)}
                    onCapstonePlanDataUpdate={handleCapstonePlanDataUpdate}
                />
            )}
        </>
    );
}
