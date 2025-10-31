"use client";
import { useState, useRef, useEffect } from "react";
import { MessageInputProps } from "@/types";

function MessageInput({ onSend, disabled = false, phase }: MessageInputProps) {
    const [message, setMessage] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const prevDisabledRef = useRef(disabled);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [message]);

    // auto focusing back into textarea when LLM responds, QOL feature.
    useEffect(() => {
        if (prevDisabledRef.current === true && disabled === false && textareaRef.current) {
            textareaRef.current.focus();
        }
        prevDisabledRef.current = disabled;
    }, [disabled]);

    const handleSend = () => {
        if (message.trim() && !disabled) {
            onSend(message);
            setMessage("");
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
            }
        }
    };

    return (
        <div className="w-full">
            <div className="flex items-end gap-3 bg-white dark:bg-[#171717] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-2 focus-within:border-gray-300 dark:focus-within:border-gray-700 transition-colors">
                <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                        phase === "review" || phase === "complete"
                            ? "Ready to review your capstone plan..."
                            : "Message Capstone AI..."
                    }
                    rows={1}
                    disabled={disabled}
                    className="flex-1 resize-none bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm py-2 px-3 max-h-32 overflow-y-auto leading-6 disabled:opacity-50"
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                />
                <button
                    onClick={handleSend}
                    disabled={!message.trim() || disabled}
                    className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                    Send
                </button>
            </div>
        </div>
    );
}

export default MessageInput;