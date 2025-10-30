"use client";
import { useState, useRef, useEffect } from "react";

function MessageInput() {
    const [message, setMessage] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [message]);

    return (
        <div className="w-full">
            <div className="flex items-end gap-3 bg-white dark:bg-[#171717] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-2 focus-within:border-gray-300 dark:focus-within:border-gray-700 transition-colors">
                <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Message Capstone AI..."
                    rows={1}
                    className="flex-1 resize-none bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm py-2 px-3 max-h-32 overflow-y-auto leading-6"
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            // handle submit event will be added later
                        }
                    }}
                />
                <button
                    disabled={!message.trim()}
                    className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                    Send
                </button>
            </div>
        </div>
    );
}

export default MessageInput;