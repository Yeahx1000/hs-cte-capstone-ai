"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import UserMenu from "./UserMenu";
import { OnboardingProps } from "@/types";
import { cteCareers } from "@/lib/data/cte-careers";
import { useTypingAnimation } from "@/lib/hooks/useTypingAnimation";
import BlackHoleBackground from "./BlackHoleBackground";

export default function Onboarding({ user }: OnboardingProps) {
  const router = useRouter();
  const [name, setName] = useState<string>("");
  const [ctePathway, setCtePathway] = useState<string>("");
  const [showCteField, setShowCteField] = useState<boolean>(false);

  // Typing animations
  const namePlaceholderText = "What's your name?";
  const namePlaceholder = useTypingAnimation(namePlaceholderText, 20, true);

  // CTE placeholder: animate whenever showCteField changes
  const userName = name.trim() || '👋';
  const ctePlaceholderText = `Nice to meet you ${userName}, what's your CTE pathway?`;
  const ctePlaceholder = useTypingAnimation(ctePlaceholderText, 20, showCteField);

  // Debounce effect to allow user to type their name before showing CTE field, half second delay
  useEffect(() => {
    if (name.trim().length > 0) {
      const timer = setTimeout(() => {
        setShowCteField(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [name]);

  const handleContinue = () => {
    if (!name.trim() || !ctePathway) {
      return;
    }

    // Clear previous chat history to start fresh
    sessionStorage.removeItem("messages");
    sessionStorage.removeItem("manifest");
    sessionStorage.removeItem("conversationState");

    const onboardingData = { name, ctePathway };
    sessionStorage.setItem("onboarding", JSON.stringify(onboardingData));
    router.push("/chat");
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#191919] relative overflow-hidden">
      <BlackHoleBackground />
      {/* Header */}
      <div className="w-full px-6 py-4 relative z-10">
        <div className="flex justify-end max-w-7xl mx-auto">
          <UserMenu user={user} />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8 relative z-10">
        <div className="w-full max-w-2xl flex flex-col items-center">
          <h1 className="text-6xl font-light text-gray-900 dark:text-white mb-4 text-center tracking-tight">
            Capris ✌️
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 text-center font-light">
            Helping you plan your CTE Capstone Project.
          </p>

          <div className="w-full space-y-4">
            <div>
              <input
                autoComplete="off"
                id="name"
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={namePlaceholder}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleContinue();
                  }
                }}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#C8D9CE] dark:focus:border-[#3A453C] focus:ring-1 focus:ring-[#D9E5DD] dark:focus:ring-[#2A352C] transition-all"
              />
            </div>

            {showCteField && (
              <div className="transition-opacity duration-300 opacity-0 animate-fade-in">
                <select
                  id="cte-pathway"
                  required
                  value={ctePathway}
                  onChange={(e) => setCtePathway(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleContinue();
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#C8D9CE] dark:focus:border-[#3A453C] focus:ring-1 focus:ring-[#D9E5DD] dark:focus:ring-[#2A352C] transition-all appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4L6 8L10 4' stroke='%23999999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 1rem center',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="">{ctePlaceholder || "What's your CTE pathway?"}</option>
                  {cteCareers.map((
                    career: {
                      id: string,
                      value: string,
                      label: string
                    }) => (
                    <option key={career.id} value={career.value}>
                      {career.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              disabled={!name.trim() || !ctePathway}
              onClick={handleContinue}
              className={`w-full px-4 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-all ${!name.trim() || !ctePathway ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {!name.trim() || !ctePathway ? "Start Planning" : "Let's start planning, shall we?"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

