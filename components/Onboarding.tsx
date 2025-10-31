"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import UserMenu from "./UserMenu";
import { OnboardingProps } from "@/types";

export default function Onboarding({ user }: OnboardingProps) {
  const router = useRouter();
  const [name, setName] = useState<string>(user.name || "");

  const handleContinue = () => {
    // Only saving their name if provided, otherwise just go to chat, I might make name required later, but for now, optional.
    const onboardingData = name ? { name } : {};
    sessionStorage.setItem("onboarding", JSON.stringify(onboardingData));
    router.push("/chat");
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#171717]">
      <div className="w-full max-w-4xl mx-auto px-4 py-4">
        <div className="flex justify-end mb-4">
          <UserMenu user={user} />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Capris
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Plan your CTE Pathway Capstone Project with AI assistance
          </p>
        </div>

        <div className="w-full space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Name (required)
            </label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleContinue();
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-gray-500 dark:focus:border-gray-500"
            />
          </div>

          <button
            disabled={!name.trim()}
            onClick={handleContinue}
            className={`w-full px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors ${!name.trim() ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            Start Planning
          </button>
        </div>
      </div>
    </div>
  );
}

