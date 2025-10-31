"use client";
import MessageHistory from "@/components/MessageHistory";
import MessageInput from "@/components/MessageInput";
import { ChatProps, ConversationState } from "@/types";

interface ChatWithStateProps extends ChatProps {
    conversationState?: ConversationState;
}

function Chat({ messages, loading, onSendMessage, conversationState }: ChatWithStateProps) {
    const isInputDisabled = loading ||
        conversationState?.phase === "review" ||
        conversationState?.phase === "complete";

    return (
        <div className="flex flex-col w-full max-w-2xl h-full min-h-0">
            <div className="flex-1 min-h-0 mb-4 overflow-hidden">
                <MessageHistory messages={messages} loading={loading} />
            </div>
            <div className="shrink-0 min-h-[80px]">
                <MessageInput
                    onSend={onSendMessage}
                    disabled={isInputDisabled}
                    phase={conversationState?.phase}
                />
            </div>
        </div>
    );
}

export default Chat;