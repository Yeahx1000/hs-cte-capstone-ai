import { useState } from "react";

// TODO: I may not even use this hook, completely filler for now, just want to initiate the folder in git

interface Message {
    role: "user" | "assistant";
    content: string;
}

export const useChat = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    return { messages, loading, error };
}