"use client";
import MessageHistory from "@/components/MessageHistory";
import MessageInput from "@/components/MessageInput";
import { ChatProps } from "@/types";

function Chat({ messages, loading, onSendMessage }: ChatProps) {
    return (
        <div className="flex flex-col w-full max-w-2xl">
            <div className="flex-1 mb-4">
                <MessageHistory messages={messages} loading={loading} />
            </div>
            <MessageInput onSend={onSendMessage} disabled={loading} />
        </div>
    );
}

export default Chat;