"use client";
import { signIn } from "next-auth/react";
import BlackHoleBackground from "@/components/BlackHoleBackground";

export default function LoginPage() {
    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-[#191919] relative overflow-hidden">
            <BlackHoleBackground />
            <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full px-6 py-8 relative z-10">
                <div className="w-full space-y-8">
                    <div className="text-center">
                        <h1 className="text-6xl font-light text-gray-900 dark:text-white mb-4">
                            Capris
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400 font-light">
                            Your CTE Capstone Project Assistant
                        </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-[#2A2A2A] rounded-2xl border border-gray-200 dark:border-gray-700 p-8 space-y-6">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-light">
                                Sign in with your Google account to get started.
                            </p>
                        </div>

                        <button
                            onClick={() => signIn("google", { callbackUrl: "/" })}
                            className="cursor-pointer w-full px-4 py-3 bg-white dark:bg-[#1A1A1A] border border-gray-300 dark:border-gray-700 rounded-xl font-medium text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#2A2A2A] active:bg-gray-100 dark:active:bg-[#333333] transition-all flex items-center justify-center gap-3"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            Sign in with Google
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

