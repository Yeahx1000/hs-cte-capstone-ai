"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Manifest } from "@/lib/manifest";

interface ReviewOverlayProps {
    manifest: Manifest;
    isOpen: boolean;
    onClose: () => void;
    onManifestUpdate?: (manifest: Manifest) => void;
}

export default function ReviewOverlay({ manifest: initialManifest, isOpen, onClose, onManifestUpdate }: ReviewOverlayProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const [manifest, setManifest] = useState<Manifest>(initialManifest);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [studentName, setStudentName] = useState<string>("Student");

    // Update manifest when initialManifest changes
    useEffect(() => {
        setManifest(initialManifest);
    }, [initialManifest]);

    // Get student name from onboarding data
    useEffect(() => {
        const onboardingDataStr = sessionStorage.getItem("onboarding");
        if (onboardingDataStr) {
            try {
                const onboardingData = JSON.parse(onboardingDataStr);
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

    const handleEdit = (field: keyof Manifest, value: any) => {
        if (!manifest) return;
        const updated = { ...manifest, [field]: value };
        setManifest(updated);
        onManifestUpdate?.(updated);
    };

    const handleSave = () => {
        if (!manifest) return;
        sessionStorage.setItem("manifest", JSON.stringify(manifest));
        onManifestUpdate?.(manifest);
    };

    const handleCreateInDrive = async () => {
        if (!manifest || !session?.user) return;

        setLoading(true);
        setError(null);

        try {
            // Save manifest first
            sessionStorage.setItem("manifest", JSON.stringify(manifest));
            onManifestUpdate?.(manifest);

            // Create capstone files in Google Drive
            const response = await fetch("/api/capstone/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${(session as any).accessToken}`,
                },
                body: JSON.stringify({
                    manifest,
                    studentName: studentName,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to create capstone files in Drive");
            }

            const data = await response.json();

            // Show success with links to all created files
            const fileLinks = [
                `Folder: ${data.folderLink}`,
                data.files.doc ? `Document: ${data.files.doc.link}` : "",
            ]
                .filter(Boolean)
                .join("\n");

            alert(`Successfully created capstone files in Google Drive!\n\n${fileLinks}`);
            router.push("/");
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
                onClick={onClose}
            />

            {/* Overlay Content */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
                <div
                    className="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                        <div>
                            <h1 className="text-3xl font-light text-gray-900 dark:text-white">
                                Review Your Capstone Project
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-light mt-1">
                                Review and make any final edits before creating in Google Drive
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2A2A2A] rounded-lg transition-colors"
                            aria-label="Close"
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-6">
                        <div className="space-y-6">
                            {/* Project Title Section */}
                            <div className="bg-gray-50 dark:bg-[#2A2A2A] rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                                <h2 className="text-xl font-light text-gray-900 dark:text-gray-100 mb-4">
                                    PROJECT TITLE
                                </h2>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={manifest.title}
                                        onChange={(e) => handleEdit("title", e.target.value)}
                                        className="w-full px-4 py-3 pr-20 text-lg font-light border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 transition-all"
                                        placeholder="Enter project title"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">
                                        ✓ Editable
                                    </span>
                                </div>
                            </div>

                            {/* CTE Pathway Section */}
                            <div className="bg-gray-50 dark:bg-[#2A2A2A] rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
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
                                            value={manifest.ctePathway}
                                            onChange={(e) => handleEdit("ctePathway", e.target.value)}
                                            className="w-full px-4 py-3 pr-20 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 transition-all"
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
                            <div className="bg-gray-50 dark:bg-[#2A2A2A] rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                                <h2 className="text-xl font-light text-gray-900 dark:text-gray-100 mb-4">
                                    OBJECTIVES
                                </h2>
                                <div className="space-y-3">
                                    {manifest.objectives.map((obj, idx) => (
                                        <div key={idx} className="relative flex items-center gap-3">
                                            <span className="text-gray-600 dark:text-gray-400 text-lg">•</span>
                                            <input
                                                type="text"
                                                value={obj}
                                                onChange={(e) => {
                                                    const newObjectives = [...manifest.objectives];
                                                    newObjectives[idx] = e.target.value;
                                                    handleEdit("objectives", newObjectives);
                                                }}
                                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 transition-all"
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
                            <div className="bg-gray-50 dark:bg-[#2A2A2A] rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                                <h2 className="text-xl font-light text-gray-900 dark:text-gray-100 mb-4">
                                    DELIVERABLES (Product + Process Bundle)
                                </h2>
                                <div className="space-y-3">
                                    {manifest.deliverables.map((del, idx) => (
                                        <div key={idx} className="relative flex items-center gap-3">
                                            <span className="text-gray-600 dark:text-gray-400 text-lg">•</span>
                                            <input
                                                type="text"
                                                value={del}
                                                onChange={(e) => {
                                                    const newDeliverables = [...manifest.deliverables];
                                                    newDeliverables[idx] = e.target.value;
                                                    handleEdit("deliverables", newDeliverables);
                                                }}
                                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 transition-all"
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
                            <div className="bg-gray-50 dark:bg-[#2A2A2A] rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                                <h2 className="text-xl font-light text-gray-900 dark:text-gray-100 mb-4">
                                    TIMELINE
                                </h2>
                                <div className="space-y-6">
                                    {manifest.timeline.map((phase, phaseIdx) => (
                                        <div key={phaseIdx} className="border border-gray-300 dark:border-gray-700 rounded-2xl p-5 bg-white dark:bg-[#1A1A1A]">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="flex-1 relative">
                                                    <label className="block text-xs font-light text-gray-500 dark:text-gray-400 mb-1">
                                                        Phase Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={phase.phase}
                                                        onChange={(e) => {
                                                            const newTimeline = [...manifest.timeline];
                                                            newTimeline[phaseIdx] = { ...phase, phase: e.target.value };
                                                            handleEdit("timeline", newTimeline);
                                                        }}
                                                        placeholder="Enter phase name"
                                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 transition-all"
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
                                                                const newTimeline = [...manifest.timeline];
                                                                newTimeline[phaseIdx] = { ...phase, weeks: parseInt(e.target.value) || 0 };
                                                                handleEdit("timeline", newTimeline);
                                                            }}
                                                            placeholder="0"
                                                            className="w-full px-4 py-2 pr-8 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 transition-all"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400 font-light">
                                                            weeks
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="ml-2 border-l border-gray-300 dark:border-gray-700 pl-4 space-y-2">
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
                                                                const newTimeline = [...manifest.timeline];
                                                                const newTasks = [...phase.tasks];
                                                                newTasks[taskIdx] = e.target.value;
                                                                newTimeline[phaseIdx] = { ...phase, tasks: newTasks };
                                                                handleEdit("timeline", newTimeline);
                                                            }}
                                                            placeholder="Enter task"
                                                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 transition-all"
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
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0 flex gap-4">
                        <button
                            onClick={handleSave}
                            className="cursor-pointer px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1E1E1E] active:bg-gray-100 dark:active:bg-[#242424] transition-all"
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
        </>
    );
}

