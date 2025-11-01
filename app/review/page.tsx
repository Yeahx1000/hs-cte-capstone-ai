"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Manifest } from "@/lib/manifest";
import UserMenu from "@/components/UserMenu";

export default function ReviewPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [manifest, setManifest] = useState<Manifest | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [studentName, setStudentName] = useState<string>("Student");

    useEffect(() => {
        let redirectTimeout: NodeJS.Timeout | null = null;
        let cancelled = false;

        const initializeManifest = async () => {
            // Get onboarding data to ensure CTE pathway is included
            const onboardingDataStr = sessionStorage.getItem("onboarding");
            let onboardingData: any = null;
            if (onboardingDataStr) {
                try {
                    onboardingData = JSON.parse(onboardingDataStr);
                    // Set student name from onboarding data
                    if (onboardingData?.name) {
                        setStudentName(onboardingData.name);
                    }
                } catch {
                    // Invalid onboarding data
                }
            }

            // First check if manifest already exists (generated when clicking Review)
            const storedManifest = sessionStorage.getItem("manifest");
            if (storedManifest) {
                try {
                    const parsed = JSON.parse(storedManifest);
                    // Validate manifest has required fields
                    if (parsed && parsed.title && parsed.ctePathway) {
                        // Ensure CTE pathway matches onboarding if provided
                        if (onboardingData?.ctePathway && parsed.ctePathway !== onboardingData.ctePathway) {
                            parsed.ctePathway = onboardingData.ctePathway;
                            sessionStorage.setItem("manifest", JSON.stringify(parsed));
                        }
                        setManifest(parsed);
                        return;
                    }
                } catch {
                    // Invalid manifest, will generate new one
                }
            }

            // If no valid manifest, try to generate from conversation
            const messages = sessionStorage.getItem("messages");
            if (messages) {
                try {
                    const parsedMessages = JSON.parse(messages);
                    if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
                        setLoading(true);
                        setError(null);

                        // Generate manifest from conversation with onboarding data
                        const conversationSummary = parsedMessages
                            .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
                            .join("\n");

                        // Include onboarding CTE pathway in the prompt
                        let manifestPrompt = `Generate a complete capstone project manifest based on this conversation:\n\n${conversationSummary}`;
                        if (onboardingData?.ctePathway) {
                            manifestPrompt = `The student has selected the CTE pathway: ${onboardingData.ctePathway}. ${manifestPrompt}`;
                        }

                        const response = await fetch("/api/llm/plan", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                message: manifestPrompt,
                                generateManifest: true,
                                onboardingData,
                            }),
                        });

                        if (cancelled) return;

                        if (response.ok) {
                            const data = await response.json();

                            // Ensure CTE pathway from onboarding is included if not in generated manifest
                            if (onboardingData?.ctePathway && (!data.ctePathway || data.ctePathway !== onboardingData.ctePathway)) {
                                data.ctePathway = onboardingData.ctePathway;
                            }

                            if (data && data.title && data.ctePathway) {
                                setManifest(data);
                                sessionStorage.setItem("manifest", JSON.stringify(data));
                                setLoading(false);
                                return;
                            } else {
                                setError("Generated manifest is missing required fields");
                            }
                        } else {
                            const errorData = await response.json().catch(() => ({}));
                            setError(errorData.error || "Failed to generate manifest");
                        }
                        setLoading(false);
                    } else {
                        setError("No conversation messages found");
                    }
                } catch (err) {
                    if (cancelled) return;
                    console.error("Failed to generate manifest:", err);
                    setError(err instanceof Error ? err.message : "An error occurred");
                    setLoading(false);
                }
            } else {
                setError("No conversation found");
            }

            // Wait a bit before redirecting to give user feedback
            if (!cancelled) {
                redirectTimeout = setTimeout(() => {
                    if (!cancelled) {
                        router.push("/");
                    }
                }, 2000);
            }
        };

        initializeManifest();

        // Cleanup function returned directly from useEffect
        return () => {
            cancelled = true;
            if (redirectTimeout) {
                clearTimeout(redirectTimeout);
            }
        };
    }, [router]);

    const handleEdit = (field: keyof Manifest, value: any) => {
        if (!manifest) return;
        setManifest({ ...manifest, [field]: value });
    };

    const handleSave = () => {
        if (!manifest) return;
        sessionStorage.setItem("manifest", JSON.stringify(manifest));
    };

    const handleCreateInDrive = async () => {
        if (!manifest || !session?.user) return;

        setLoading(true);
        setError(null);

        try {
            // Save manifest first
            sessionStorage.setItem("manifest", JSON.stringify(manifest));

            // Create capstone files in Google Drive
            const response = await fetch("/api/capstone/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // Pass the user's access token
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

    if (!manifest) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center max-w-md px-4">
                    <p className="text-gray-500 dark:text-gray-400 mb-2">
                        {loading ? "Generating your capstone plan..." : error ? "Failed to load plan" : "Loading..."}
                    </p>
                    {loading && (
                        <div className="mt-4 flex justify-center gap-1">
                            <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                            <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                            <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                        </div>
                    )}
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            <p className="text-xs text-red-500 dark:text-red-400 mt-2">Redirecting to homepage...</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (!session?.user) {
        return null; // Will redirect via middleware
    }

    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-[#171717]">
            <div className="w-full max-w-4xl mx-auto px-4 py-4">
                <div className="flex justify-end mb-4">
                    <UserMenu user={session.user} />
                </div>
            </div>

            <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Review Your Capstone Project
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Review and make any final edits before creating in Google Drive
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Project Title
                        </label>
                        <input
                            type="text"
                            value={manifest.title}
                            onChange={(e) => handleEdit("title", e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-gray-500"
                        />
                    </div>

                    <div className="bg-gray-50 dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            CTE Pathway
                        </label>
                        <input
                            type="text"
                            value={manifest.ctePathway}
                            onChange={(e) => handleEdit("ctePathway", e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-gray-500"
                        />
                    </div>

                    <div className="bg-gray-50 dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Objectives
                        </label>
                        <div className="space-y-2">
                            {manifest.objectives.map((obj, idx) => (
                                <input
                                    key={idx}
                                    type="text"
                                    value={obj}
                                    onChange={(e) => {
                                        const newObjectives = [...manifest.objectives];
                                        newObjectives[idx] = e.target.value;
                                        handleEdit("objectives", newObjectives);
                                    }}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-gray-500"
                                />
                            ))}
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Deliverables
                        </label>
                        <div className="space-y-2">
                            {manifest.deliverables.map((del, idx) => (
                                <input
                                    key={idx}
                                    type="text"
                                    value={del}
                                    onChange={(e) => {
                                        const newDeliverables = [...manifest.deliverables];
                                        newDeliverables[idx] = e.target.value;
                                        handleEdit("deliverables", newDeliverables);
                                    }}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-gray-500"
                                />
                            ))}
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Timeline
                        </label>
                        <div className="space-y-4">
                            {manifest.timeline.map((phase, phaseIdx) => (
                                <div key={phaseIdx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                        <input
                                            type="text"
                                            value={phase.phase}
                                            onChange={(e) => {
                                                const newTimeline = [...manifest.timeline];
                                                newTimeline[phaseIdx] = { ...phase, phase: e.target.value };
                                                handleEdit("timeline", newTimeline);
                                            }}
                                            placeholder="Phase name"
                                            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-gray-500"
                                        />
                                        <input
                                            type="number"
                                            value={phase.weeks}
                                            onChange={(e) => {
                                                const newTimeline = [...manifest.timeline];
                                                newTimeline[phaseIdx] = { ...phase, weeks: parseInt(e.target.value) || 0 };
                                                handleEdit("timeline", newTimeline);
                                            }}
                                            placeholder="Weeks"
                                            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-gray-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        {phase.tasks.map((task, taskIdx) => (
                                            <input
                                                key={taskIdx}
                                                type="text"
                                                value={task}
                                                onChange={(e) => {
                                                    const newTimeline = [...manifest.timeline];
                                                    const newTasks = [...phase.tasks];
                                                    newTasks[taskIdx] = e.target.value;
                                                    newTimeline[phaseIdx] = { ...phase, tasks: newTasks };
                                                    handleEdit("timeline", newTimeline);
                                                }}
                                                placeholder="Task"
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-gray-500"
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <button
                            onClick={() => router.back()}
                            className="px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-lg font-medium text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            Back to Chat
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-lg font-medium text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            Save Changes
                        </button>
                        <button
                            onClick={handleCreateInDrive}
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? "Creating..." : "Create in Drive"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

