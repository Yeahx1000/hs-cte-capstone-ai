"use client";
import { MessageHistoryProps } from "@/types";

function MessageHistory({ messages, loading }: MessageHistoryProps) {
    if (messages.length === 0) {
        return (
            <div className="h-full min-h-[400px] flex items-center justify-center py-8 px-8">
                <div className="text-center">
                    <div className="text-gray-400 dark:text-gray-500 text-sm mb-2">
                        Message History
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Your conversation will appear here
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto px-8 py-8 min-h-[400px]">
            <div className="flex flex-col gap-4">
                {messages.map((message, idx) => (
                    <div
                        key={idx}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === "user"
                                ? "bg-black dark:bg-white text-white dark:text-black"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                }`}
                        >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
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