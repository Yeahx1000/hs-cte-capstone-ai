import MessageHistory from "./MessageHistory";
import MessageInput from "./MessageInput";

function Chat() {
    return (
        <div className="flex flex-col gap-4">
            <MessageHistory />
            <MessageInput />
        </div>
    );
}

export default Chat;