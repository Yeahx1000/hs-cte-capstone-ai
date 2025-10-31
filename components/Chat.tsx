"use client";
import MessageHistory from "@/components/MessageHistory";
import MessageInput from "@/components/MessageInput";
import { ChatProps } from "@/types";

function Chat({ messages, loading, onSendMessage }: ChatProps) {
    return (
        <div className="flex flex-col w-full max-w-2xl h-full min-h-0">
            <div className="flex-1 min-h-0 mb-4 overflow-hidden">
                <MessageHistory messages={messages} loading={loading} />
            </div>
            <div className="shrink-0 min-h-[80px]">
                <MessageInput onSend={onSendMessage} disabled={loading} />
            </div>
        </div>
    );
}

export default Chat;