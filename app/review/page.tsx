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

    useEffect(() => {
        // Get manifest from sessionStorage or generate it
        const stored = sessionStorage.getItem("manifest");
        if (stored) {
            setManifest(JSON.parse(stored));
        } else {
            // If no manifest, redirect to chat
            router.push("/chat");
        }
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
        if (!manifest) return;

        setLoading(true);
        setError(null);

        try {
            // Save manifest first
            sessionStorage.setItem("manifest", JSON.stringify(manifest));

            // Format manifest for Drive - create folder first, then file
            const folderContent = `# ${manifest.title}

## CTE Pathway
${manifest.ctePathway}

## Objectives
${manifest.objectives.map((obj) => `- ${obj}`).join("\n")}

## Deliverables
${manifest.deliverables.map((del) => `- ${del}`).join("\n")}

## Timeline
${manifest.timeline.map((phase) => `
### ${phase.phase} (${phase.weeks} weeks)
${phase.tasks.map((task) => `- ${task}`).join("\n")}
`).join("\n")}

## Assessment
${manifest.assessment.map((ass) => `- ${ass}`).join("\n")}

## Resources
${manifest.resources.map((res) => `- ${res}`).join("\n")}
`;

            // Create the file in Drive
            const response = await fetch("/api/drive/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileName: `${manifest.title} - Capstone Project.md`,
                    fileContent: folderContent,
                    mimeType: "text/markdown",
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to create file in Drive");
            }

            const data = await response.json();

            // Show success and redirect
            alert(`Successfully created in Google Drive!${data.link ? `\nView: ${data.link}` : ""}`);
            router.push("/chat");
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    if (!manifest) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-gray-500 dark:text-gray-400">Loading...</p>
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

