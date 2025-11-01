"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import UserMenu from "./UserMenu";
import { OnboardingProps } from "@/types";
import { cteCareers } from "@/lib/data/cte-careers";

export default function Onboarding({ user }: OnboardingProps) {
  const router = useRouter();
  const [name, setName] = useState<string>("");
  const [ctePathway, setCtePathway] = useState<string>("");
  const [namePlaceholder, setNamePlaceholder] = useState<string>("");
  const [ctePlaceholder, setCtePlaceholder] = useState<string>("");
  const [showCteField, setShowCteField] = useState<boolean>(false);

  // Track if CTE placeholder has been animated
  const hasAnimatedCtePlaceholder = useRef<boolean>(false);
  const namePlaceholderText = "Hello, may I ask your name?";

  // Initial typing animation effect
  useEffect(() => {
    let nameIndex = 0;
    let nameInterval: NodeJS.Timeout | null = null;

    // Typing out name placeholder animation
    nameInterval = setInterval(() => {
      if (nameIndex <= namePlaceholderText.length) {
        setNamePlaceholder(nameIndex < namePlaceholderText.length
          ? namePlaceholderText.slice(0, nameIndex) + '▋'
          : namePlaceholderText);
        nameIndex++;
      } else {
        clearInterval(nameInterval!);
      }
    }, 20);

    return () => {
      // Cleanup intervals if component unmounts
      if (nameInterval) clearInterval(nameInterval);
    };
  }, []);

  // Debounce effect to allow user to type their name before showing CTE field, half second delay
  useEffect(() => {
    if (name.trim().length > 0) {
      const timer = setTimeout(() => {
        setShowCteField(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [name]);

  // Typing out CTE placeholder animation
  useEffect(() => {
    if (showCteField) {
      const userName = name.trim() || '👋';
      const fullText = `Nice to meet you ${userName}, what's your CTE pathway?`;

      // If this is the first time showing, animate it
      if (!hasAnimatedCtePlaceholder.current) {
        let cteIndex = 0;
        const cteInterval = setInterval(() => {
          if (cteIndex <= fullText.length) {
            setCtePlaceholder(cteIndex < fullText.length
              ? fullText.slice(0, cteIndex) + '▋'
              : fullText);
            cteIndex++;
          } else {
            hasAnimatedCtePlaceholder.current = true;
            clearInterval(cteInterval);
          }
        }, 20);

        return () => clearInterval(cteInterval);
      } else {
        // If placeholder already exists, just update it without animation
        setCtePlaceholder(fullText);
      }
    }
  }, [showCteField, name]);

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
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#1A1A1A]">
      {/* Header */}
      <div className="w-full px-6 py-4">
        <div className="flex justify-end max-w-7xl mx-auto">
          <UserMenu user={user} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <div className="w-full max-w-2xl flex flex-col items-center">
          <h1 className="text-6xl font-light text-gray-900 dark:text-white mb-4 text-center tracking-tight">
            Capris
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 text-center font-light">
            Plan your CTE Pathway Capstone Project with AI assistance
          </p>

          {/* Form */}
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
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 transition-all"
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
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 transition-all appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4L6 8L10 4' stroke='%23999999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 1rem center',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="">{ctePlaceholder || "What's your CTE pathway?"}</option>
                  {cteCareers.map((career) => (
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

