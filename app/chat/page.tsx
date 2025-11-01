"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Chat from "@/components/Chat";
import UserMenu from "@/components/UserMenu";
import { useChat } from "@/lib/hooks/useChat";

// FIXME: this page is a bit of a mess, handling of manifest generation is slow and clunky, needs major optimization.

export default function ChatPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const { messages, loading, error, manifest, sendMessage, conversationState, generateManifest } = useChat();
    const [onboardingData, setOnboardingData] = useState<any>(null);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [manifestGenerating, setManifestGenerating] = useState(false);

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
    }, [router]);

    // Auto-generate manifest when phase becomes "review" and manifest doesn't exist
    useEffect(() => {
        if (conversationState?.phase === "review" && !manifest && !manifestGenerating && !loading && messages.length > 0) {
            const storedManifest = sessionStorage.getItem("manifest");
            if (!storedManifest) {
                setManifestGenerating(true);
                generateManifest()
                    .then(() => {
                        setManifestGenerating(false);
                    })
                    .catch(() => {
                        setManifestGenerating(false);
                    });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationState?.phase, manifest, manifestGenerating, loading, messages.length]);

    useEffect(() => {
        if (conversationState?.phase === "review") {
            router.prefetch("/review");
        }
    }, [conversationState?.phase, router]);

    // Display a helpful first message in the UI until user sends a message. Working on this for now, something that can guide the students first prompt.

    const handleSendMessage = (content: string) => {
        sendMessage(content, onboardingData);
    };

    const handleReviewClick = async () => {
        // Always regenerate manifest to ensure fresh data with onboarding CTE pathway
        if (messages.length > 0) {
            setReviewLoading(true);
            try {
                // Clear old manifest to force regeneration
                sessionStorage.removeItem("manifest");
                const generated = await generateManifest(onboardingData);
                if (generated) {
                    // Small delay to ensure sessionStorage is written
                    await new Promise(resolve => setTimeout(resolve, 100));
                    router.push("/review");
                } else {
                    alert("Failed to generate capstone plan. Please try again.");
                }
            } catch (err) {
                alert("Failed to generate capstone plan. Please try again.");
            } finally {
                setReviewLoading(false);
            }
        } else {
            // No messages, just navigate - review page will handle it
            router.push("/review");
        }
    };

    if (!session?.user) {
        return null; // Will redirect via middleware
    }

    // Show the onboarding tip UI message until a message is sent
    const showOnboardingMessage = messages.length === 0;

    return (
        <div className="flex flex-col h-screen bg-white dark:bg-[#171717] overflow-hidden">
            <div className="w-full max-w-7xl mx-auto px-4 py-4 shrink-0">
                <div className="flex justify-end mb-4">
                    <UserMenu user={session.user} />
                </div>
            </div>

            <div className="flex-1 flex items-start justify-center max-w-7xl mx-auto w-full px-4 pb-4 gap-8 overflow-hidden min-h-0">
                <div className="flex-1 max-w-2xl h-full flex flex-col min-h-0">
                    <div className="mb-6 shrink-0">
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            Plan Your Capstone
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                            Chat with AI to plan your CTE Pathway capstone project
                        </p>
                    </div>
                    {showOnboardingMessage && (
                        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-800 dark:text-gray-200 transition-opacity shrink-0">
                            Tell Capris what you think could be a cool career or what you'd like to do for work if you could have any job.
                        </div>
                    )}
                    <div className="flex-1 min-h-0 flex flex-col">
                        <Chat
                            messages={messages}
                            loading={loading}
                            onSendMessage={handleSendMessage}
                            conversationState={conversationState}
                        />
                    </div>
                    {conversationState?.phase === "review" && !loading && (
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg shrink-0">
                            <p className="text-sm text-gray-800 dark:text-gray-200 mb-3">
                                Ready to review your capstone plan?
                            </p>
                            <button
                                onClick={handleReviewClick}
                                disabled={reviewLoading || manifestGenerating}
                                className="w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {reviewLoading || manifestGenerating
                                    ? "Generating Plan..."
                                    : "Review Your Capstone Plan"}
                            </button>
                        </div>
                    )}
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg shrink-0">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
