"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { CapstonePlanData } from "@/lib/capstonePlanData";
import { CapstoneCreateResponse, OnboardingData } from "@/types";

interface ExtendedSession extends Session {
    accessToken?: string;
}

// This is the review overlay component. was formerlly it's own page, but changed for (possibly better?) UX..?

interface ReviewOverlayProps {
    capstonePlanData: CapstonePlanData;
    isOpen: boolean;
    onClose: () => void;
    onCapstonePlanDataUpdate?: (capstonePlanData: CapstonePlanData) => void;
}

interface SuccessModalData {
    folderLink: string;
    docLink: string;
}

export default function ReviewOverlay({ capstonePlanData: initialCapstonePlanData, isOpen, onClose: _onClose, onCapstonePlanDataUpdate }: ReviewOverlayProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const [capstonePlanData, setCapstonePlanData] = useState<CapstonePlanData>(initialCapstonePlanData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [studentName, setStudentName] = useState<string>("Student");
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successData, setSuccessData] = useState<SuccessModalData | null>(null);

    // Update capstone plan data when initialCapstonePlanData changes
    useEffect(() => {
        setCapstonePlanData(initialCapstonePlanData);
    }, [initialCapstonePlanData]);

    // Get student name from onboarding data
    useEffect(() => {
        const onboardingDataStr = sessionStorage.getItem("onboarding");
        if (onboardingDataStr) {
            try {
                const onboardingData = JSON.parse(onboardingDataStr) as OnboardingData;
                if (onboardingData?.name) {
                    setStudentName(onboardingData.name);
                }
            } catch {
                // Invalid onboarding data
            }
        }
    }, []);

    // Prevent body scroll when overlay is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    const handleEdit = <K extends keyof CapstonePlanData>(field: K, value: CapstonePlanData[K]): void => {
        if (!capstonePlanData) return;
        const updated = { ...capstonePlanData, [field]: value };
        setCapstonePlanData(updated);
        onCapstonePlanDataUpdate?.(updated);
    };

    const handleSave = () => {
        if (!capstonePlanData) return;
        sessionStorage.setItem("capstonePlanData", JSON.stringify(capstonePlanData));
        onCapstonePlanDataUpdate?.(capstonePlanData);
    };

    const handleCreateInDrive = async (): Promise<void> => {
        if (!capstonePlanData || !session?.user) return;

        setLoading(true);
        setError(null);

        try {
            // Save capstone plan data first
            sessionStorage.setItem("capstonePlanData", JSON.stringify(capstonePlanData));
            onCapstonePlanDataUpdate?.(capstonePlanData);

            // Create capstone files in Google Drive
            const response = await fetch("/api/capstone/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${(session as ExtendedSession)?.accessToken ?? ""}`,
                },
                body: JSON.stringify({
                    capstonePlanData,
                    studentName: studentName,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json() as { error?: string };
                throw new Error(errorData.error || "Failed to create capstone files in Drive");
            }

            const data = await response.json() as CapstoneCreateResponse;

            // Show success modal with links to all created files
            setSuccessData({
                folderLink: data.folderLink,
                docLink: data.files.doc?.link || "",
            });
            setShowSuccessModal(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !session?.user) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            // onClick={onClose} // disabled for now to prevent accidental closing
            />

            {/* Overlay Content */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
                <div
                    className="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-[#E8F0EB] dark:border-[#2F3A30] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8F0EB] dark:border-[#2F3A30] shrink-0">
                        <div>
                            <h1 className="text-3xl font-light text-gray-900 dark:text-white">
                                Review Your Capstone Project
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-light mt-1">
                                Review and make any final edits before creating in Google Drive
                            </p>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-6">
                        <div className="space-y-6">
                            {/* Project Title Section */}
                            <div className="bg-[#FAFCFB] dark:bg-[#2A2A2A] rounded-2xl border border-[#E8F0EB] dark:border-[#2F3A30] p-6">
                                <h2 className="text-xl font-light text-gray-900 dark:text-gray-100 mb-4">
                                    PROJECT TITLE
                                </h2>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={capstonePlanData.title}
                                        onChange={(e) => handleEdit("title", e.target.value)}
                                        className="w-full px-4 py-3 pr-20 text-lg font-light border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#C8D9CE] dark:focus:border-[#3A453C] focus:ring-1 focus:ring-[#D9E5DD] dark:focus:ring-[#2A352C] transition-all"
                                        placeholder="Enter project title"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">
                                        ✓ Editable
                                    </span>
                                </div>
                            </div>

                            {/* CTE Pathway Section */}
                            <div className="bg-[#FAFCFB] dark:bg-[#2A2A2A] rounded-2xl border border-[#E8F0EB] dark:border-[#2F3A30] p-6">
                                <h2 className="text-xl font-light text-gray-900 dark:text-gray-100 mb-4">
                                    PATHWAY ALIGNMENT
                                </h2>
                                <div>
                                    <label className="block text-sm font-light text-gray-600 dark:text-gray-400 mb-2">
                                        CTE Pathway:
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={capstonePlanData.ctePathway}
                                            onChange={(e) => handleEdit("ctePathway", e.target.value)}
                                            className="w-full px-4 py-3 pr-20 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#C8D9CE] dark:focus:border-[#3A453C] focus:ring-1 focus:ring-[#D9E5DD] dark:focus:ring-[#2A352C] transition-all"
                                            placeholder="Enter CTE pathway"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">
                                            ✓ Editable
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-light">
                                    Note: This capstone is the final course in a 2-3 course CTE sequence. A grade of C- or better marks a CTE Pathway Completer.
                                </p>
                            </div>

                            {/* Objectives Section */}
                            <div className="bg-[#FAFCFB] dark:bg-[#2A2A2A] rounded-2xl border border-[#E8F0EB] dark:border-[#2F3A30] p-6">
                                <h2 className="text-xl font-light text-gray-900 dark:text-gray-100 mb-4">
                                    OBJECTIVES
                                </h2>
                                <div className="space-y-3">
                                    {capstonePlanData.objectives.map((obj, idx) => (
                                        <div key={idx} className="relative flex items-center gap-3">
                                            <span className="text-gray-600 dark:text-gray-400 text-lg">•</span>
                                            <input
                                                type="text"
                                                value={obj}
                                                onChange={(e) => {
                                                    const newObjectives = [...capstonePlanData.objectives];
                                                    newObjectives[idx] = e.target.value;
                                                    handleEdit("objectives", newObjectives);
                                                }}
                                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#C8D9CE] dark:focus:border-[#3A453C] focus:ring-1 focus:ring-[#D9E5DD] dark:focus:ring-[#2A352C] transition-all"
                                                placeholder="Enter objective"
                                            />
                                            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap font-light">
                                                ✓ Editable
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Deliverables Section */}
                            <div className="bg-[#FAFCFB] dark:bg-[#2A2A2A] rounded-2xl border border-[#E8F0EB] dark:border-[#2F3A30] p-6">
                                <h2 className="text-xl font-light text-gray-900 dark:text-gray-100 mb-4">
                                    DELIVERABLES (Product + Process Bundle)
                                </h2>
                                <div className="space-y-3">
                                    {capstonePlanData.deliverables.map((del, idx) => (
                                        <div key={idx} className="relative flex items-center gap-3">
                                            <span className="text-gray-600 dark:text-gray-400 text-lg">•</span>
                                            <input
                                                type="text"
                                                value={del}
                                                onChange={(e) => {
                                                    const newDeliverables = [...capstonePlanData.deliverables];
                                                    newDeliverables[idx] = e.target.value;
                                                    handleEdit("deliverables", newDeliverables);
                                                }}
                                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#C8D9CE] dark:focus:border-[#3A453C] focus:ring-1 focus:ring-[#D9E5DD] dark:focus:ring-[#2A352C] transition-all"
                                                placeholder="Enter deliverable"
                                            />
                                            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap font-light">
                                                ✓ Editable
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Timeline Section */}
                            <div className="bg-[#FAFCFB] dark:bg-[#2A2A2A] rounded-2xl border border-[#E8F0EB] dark:border-[#2F3A30] p-6">
                                <h2 className="text-xl font-light text-gray-900 dark:text-gray-100 mb-4">
                                    TIMELINE
                                </h2>
                                <div className="space-y-6">
                                    {capstonePlanData.timeline.map((phase, phaseIdx) => (
                                        <div key={phaseIdx} className="border border-[#E0E8E3] dark:border-[#2F3A30] rounded-2xl p-5 bg-white dark:bg-[#1A1A1A]">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="flex-1 relative">
                                                    <label className="block text-xs font-light text-gray-500 dark:text-gray-400 mb-1">
                                                        Phase Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={phase.phase}
                                                        onChange={(e) => {
                                                            const newTimeline = [...capstonePlanData.timeline];
                                                            newTimeline[phaseIdx] = { ...phase, phase: e.target.value };
                                                            handleEdit("timeline", newTimeline);
                                                        }}
                                                        placeholder="Enter phase name"
                                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#C8D9CE] dark:focus:border-[#3A453C] focus:ring-1 focus:ring-[#D9E5DD] dark:focus:ring-[#2A352C] transition-all"
                                                    />
                                                </div>
                                                <div className="w-24 relative">
                                                    <label className="block text-xs font-light text-gray-500 dark:text-gray-400 mb-1">
                                                        Duration
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={phase.weeks}
                                                            onChange={(e) => {
                                                                const newTimeline = [...capstonePlanData.timeline];
                                                                newTimeline[phaseIdx] = { ...phase, weeks: parseInt(e.target.value) || 0 };
                                                                handleEdit("timeline", newTimeline);
                                                            }}
                                                            placeholder="0"
                                                            className="w-full px-4 py-2 pr-8 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#C8D9CE] dark:focus:border-[#3A453C] focus:ring-1 focus:ring-[#D9E5DD] dark:focus:ring-[#2A352C] transition-all"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400 font-light">
                                                            weeks
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="ml-2 border-l border-[#E0E8E3] dark:border-[#2F3A30] pl-4 space-y-2">
                                                <label className="block text-xs font-light text-gray-500 dark:text-gray-400 mb-2">
                                                    Tasks:
                                                </label>
                                                {phase.tasks.map((task, taskIdx) => (
                                                    <div key={taskIdx} className="relative flex items-center gap-3">
                                                        <span className="text-gray-600 dark:text-gray-400">  •</span>
                                                        <input
                                                            type="text"
                                                            value={task}
                                                            onChange={(e) => {
                                                                const newTimeline = [...capstonePlanData.timeline];
                                                                const newTasks = [...phase.tasks];
                                                                newTasks[taskIdx] = e.target.value;
                                                                newTimeline[phaseIdx] = { ...phase, tasks: newTasks };
                                                                handleEdit("timeline", newTimeline);
                                                            }}
                                                            placeholder="Enter task"
                                                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#C8D9CE] dark:focus:border-[#3A453C] focus:ring-1 focus:ring-[#D9E5DD] dark:focus:ring-[#2A352C] transition-all"
                                                        />
                                                        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap font-light">
                                                            ✓ Editable
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="px-6 py-4 border-t border-[#E8F0EB] dark:border-[#2F3A30] shrink-0 flex gap-4">
                        <button
                            onClick={handleSave}
                            className="cursor-pointer px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:bg-[#FAFCFB] dark:hover:bg-[#1E1E1E] active:bg-[#F5F7F6] dark:active:bg-[#242424] transition-all"
                        >
                            Save Changes
                        </button>
                        <button
                            onClick={handleCreateInDrive}
                            disabled={loading}
                            className="cursor-pointer flex-1 px-6 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 active:bg-gray-950 dark:active:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? "Creating..." : "Create in Drive"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && successData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                    // onClick={() => setShowSuccessModal(false)} // disabled for now to prevent accidental closing
                    />

                    {/* Modal */}
                    <div className="relative bg-white dark:bg-[#1A1A1A] rounded-2xl border border-[#E8F0EB] dark:border-[#2F3A30] w-full max-w-md shadow-2xl">
                        <div className="flex justify-center pt-8 pb-4">
                            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>
                        <div className="px-6 pb-6 text-center">
                            <h2 className="text-2xl font-light text-gray-900 dark:text-white mb-2">
                                Success!
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 font-light">
                                Successfully created capstone files in Google Drive
                            </p>
                            <div className="space-y-3 mb-6">
                                <a
                                    href={successData.folderLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block px-4 py-3 bg-[#FAFCFB] dark:bg-[#2A2A2A] border border-[#E8F0EB] dark:border-[#2F3A30] rounded-xl hover:bg-[#F0F4F2] dark:hover:bg-[#343434] transition-colors text-left"
                                >
                                    <div className="flex items-center gap-2 text-sm">
                                        <svg className="w-4 h-4 text-gray-600 dark:text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                        </svg>
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">Folder</span>
                                    </div>
                                </a>
                                {successData.docLink && (
                                    <a
                                        href={successData.docLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block px-4 py-3 bg-[#FAFCFB] dark:bg-[#2A2A2A] border border-[#E8F0EB] dark:border-[#2F3A30] rounded-xl hover:bg-[#F0F4F2] dark:hover:bg-[#343434] transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-2 text-sm">
                                            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span className="text-gray-700 dark:text-gray-300 font-medium">Document</span>
                                        </div>
                                    </a>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    router.push("/");
                                }}
                                className="w-full px-6 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 active:bg-gray-950 dark:active:bg-gray-300 transition-all"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

