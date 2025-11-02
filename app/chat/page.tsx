"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Chat from "@/components/Chat";
import UserMenu from "@/components/UserMenu";
import ReviewOverlay from "@/components/ReviewOverlay";
import { useChat } from "@/lib/hooks/useChat";
import { Manifest } from "@/lib/manifest";

export default function ChatPage() {
    const { data: session } = useSession();
    const { messages, loading, error, manifest, sendMessage, conversationState, generateManifest, manifestGenerating } = useChat();
    const [onboardingData, setOnboardingData] = useState<any>(null);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [currentManifest, setCurrentManifest] = useState<Manifest | null>(null);

    useEffect(() => {
        // Get onboarding data from sessionStorage (optional)
        const data = sessionStorage.getItem("onboarding");
        if (data) {
            try {
                const parsedData = JSON.parse(data);
                setOnboardingData(parsedData);
            } catch {
                // Invalid data, just continue without it
            }
        }
    }, []);

    // Update current manifest when manifest from hook changes
    useEffect(() => {
        if (manifest) {
            setCurrentManifest(manifest);
        }
    }, [manifest]);

    // Prefetch manifest data when review button is about to appear
    useEffect(() => {
        // Start generating manifest in background when we have enough data
        if (conversationState?.phase === "review" && !manifest && !manifestGenerating && !loading && messages.length >= 4) {
            const storedManifest = sessionStorage.getItem("manifest");
            // Only prefetch if we don't already have a manifest
            if (!storedManifest) {
                // Don't await - let it run in background
                generateManifest(onboardingData).catch(() => {
                    // Silently fail - user can regenerate if needed
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationState?.phase, manifest, manifestGenerating, loading, messages.length]);

    const handleSendMessage = (content: string) => {
        sendMessage(content, onboardingData);
    };

    const handleReviewClick = async () => {
        if (messages.length > 0) {
            setReviewLoading(true);
            try {
                // Check if manifest was already generated in background
                const storedManifest = sessionStorage.getItem("manifest");
                let shouldGenerate = true;

                if (storedManifest) {
                    try {
                        const parsed = JSON.parse(storedManifest);
                        // Use existing manifest if it's valid and we're not forced to regenerate
                        if (parsed && parsed.title && parsed.ctePathway) {
                            // If there's already a valid manifest, use it
                            // But still ensure CTE pathway matches onboarding
                            if (onboardingData?.ctePathway && parsed.ctePathway !== onboardingData.ctePathway) {
                                parsed.ctePathway = onboardingData.ctePathway;
                                sessionStorage.setItem("manifest", JSON.stringify(parsed));
                            }
                            setCurrentManifest(parsed);
                            shouldGenerate = false;
                        }
                    } catch {
                        // Invalid manifest, regenerate
                    }
                }

                if (shouldGenerate) {
                    // Clear old manifest to force regeneration
                    sessionStorage.removeItem("manifest");
                    const generated = await generateManifest(onboardingData);
                    if (!generated) {
                        alert("Failed to generate capstone plan. Please try again.");
                        return;
                    }
                    setCurrentManifest(generated);
                }

                // Open overlay with manifest
                setIsReviewOpen(true);
            } catch (err) {
                alert("Failed to generate capstone plan. Please try again.");
            } finally {
                setReviewLoading(false);
            }
        } else {
            // No messages, check if we have a stored manifest
            const storedManifest = sessionStorage.getItem("manifest");
            if (storedManifest) {
                try {
                    const parsed = JSON.parse(storedManifest);
                    if (parsed && parsed.title && parsed.ctePathway) {
                        setCurrentManifest(parsed);
                        setIsReviewOpen(true);
                        return;
                    }
                } catch {
                    // Invalid manifest
                }
            }
            alert("No conversation found. Please start a conversation first.");
        }
    };

    const handleManifestUpdate = (updatedManifest: Manifest) => {
        setCurrentManifest(updatedManifest);
        sessionStorage.setItem("manifest", JSON.stringify(updatedManifest));
    };

    if (!session?.user) {
        return null; // Will redirect via middleware
    }

    return (
        <>
            <div className="flex flex-col h-screen bg-white dark:bg-[#1A1A1A] overflow-hidden">
                {/* Header */}
                <div className="w-full px-6 py-4 shrink-0">
                    <div className="flex justify-end max-w-7xl mx-auto">
                        <UserMenu user={session.user} />
                    </div>
                </div>

                {/* Main Content */}
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
                                manifestGenerating={manifestGenerating}
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

            {/* Review Overlay */}
            {currentManifest && (
                <ReviewOverlay
                    manifest={currentManifest}
                    isOpen={isReviewOpen}
                    onClose={() => setIsReviewOpen(false)}
                    onManifestUpdate={handleManifestUpdate}
                />
            )}
        </>
    );
}
