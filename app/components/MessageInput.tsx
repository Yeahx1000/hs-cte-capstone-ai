"use client";
import { useState } from "react";

function MessageInput() {
    return (
        <div>
            <input type="text" placeholder="Type your message here..." />
            <button>Send</button>
        </div>
    );
}

export default MessageInput;