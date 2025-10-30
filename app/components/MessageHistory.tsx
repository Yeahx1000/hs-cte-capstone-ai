"use client";

function MessageHistory() {
    return (
        <div className="min-h-[400px] flex items-center justify-center">
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

export default MessageHistory;