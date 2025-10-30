import MessageHistory from "./MessageHistory";
import MessageInput from "./MessageInput";

function Chat() {
    return (
        <div className="flex flex-col w-full max-w-2xl">
            <div className="flex-1 mb-4">
                <MessageHistory />
            </div>
            <MessageInput />
        </div>
    );
}

export default Chat;