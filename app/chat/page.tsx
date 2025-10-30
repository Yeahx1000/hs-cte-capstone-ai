"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Chat from "@/components/Chat";
import SummaryCard from "@/components/SummaryCard";
import UserMenu from "@/components/UserMenu";
import { useChat } from "@/lib/hooks/useChat";

export default function ChatPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const { messages, loading, error, manifest, sendMessage } = useChat();
    const [onboardingData, setOnboardingData] = useState<any>(null);

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

    // Display a helpful first message in the UI until user sends a message. Working on this for now, something that can guide the students first prompt.

    const handleSendMessage = (content: string) => {
        sendMessage(content, onboardingData);
    };

    if (!session?.user) {
        return null; // Will redirect via middleware
    }

    // Show the onboarding tip UI message until a message is sent
    const showOnboardingMessage = messages.length === 0;

    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-[#171717]">
            <div className="w-full max-w-7xl mx-auto px-4 py-4">
                <div className="flex justify-end mb-4">
                    <UserMenu user={session.user} />
                </div>
            </div>

            <div className="flex-1 flex items-start justify-center max-w-7xl mx-auto w-full px-4 py-8 gap-8">
                <div className="flex-1 max-w-2xl">
                    <div className="mb-6">
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            Plan Your Capstone
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                            Chat with AI to plan your CTE Pathway capstone project
                        </p>
                    </div>
                    {showOnboardingMessage && (
                        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-800 dark:text-blue-200 transition-opacity">
                            Tell Capris what you think could be a cool career or what you'd like to do for work if you could have any job.
                        </div>
                    )}
                    <Chat
                        messages={messages}
                        loading={loading}
                        onSendMessage={handleSendMessage}
                    />
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}
                </div>
                {/* 
                <div className="w-80 shrink-0">
                    <div className="sticky top-8">
                        <SummaryCard manifest={manifest} />
                    </div>
                </div> */}
            </div>
        </div>
    );
}
