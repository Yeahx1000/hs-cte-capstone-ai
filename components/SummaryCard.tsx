"use client";

import { useRouter } from "next/navigation";
import { SummaryCardProps } from "@/types";

export default function SummaryCard({ manifest }: SummaryCardProps) {
    const router = useRouter();

    if (!manifest) {
        return (
            <div className="w-full bg-gray-50 dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Project Summary
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Your capstone project summary will appear here as you chat with the AI.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full bg-gray-50 dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
            <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Project Summary
                </h3>
                <button
                    onClick={() => {
                        // Save manifest to sessionStorage before navigating
                        if (manifest) {
                            sessionStorage.setItem("manifest", JSON.stringify(manifest));
                        }
                        router.push("/review");
                    }}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                    Review
                </button>
            </div>

            <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                </h4>
                <p className="text-sm text-gray-900 dark:text-gray-100">{manifest.title}</p>
            </div>

            <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CTE Pathway
                </h4>
                <p className="text-sm text-gray-900 dark:text-gray-100">{manifest.ctePathway}</p>
            </div>

            <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Objectives
                </h4>
                <ul className="text-sm text-gray-900 dark:text-gray-100 list-disc list-inside space-y-1">
                    {manifest.objectives.slice(0, 3).map((obj, idx) => (
                        <li key={idx}>{obj}</li>
                    ))}
                    {manifest.objectives.length > 3 && (
                        <li className="text-gray-500 dark:text-gray-400">
                            +{manifest.objectives.length - 3} more
                        </li>
                    )}
                </ul>
            </div>

            <button
                onClick={() => {
                    // Save manifest to sessionStorage before navigating
                    if (manifest) {
                        sessionStorage.setItem("manifest", JSON.stringify(manifest));
                    }
                    router.push("/review");
                }}
                className="w-full px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
                Review & Create in Drive
            </button>
        </div>
    );
}

