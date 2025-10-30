"use client";
import { SessionProvider } from "next-auth/react";

// seperated providers for organization purposes, will be using it in layout.tsx

export function Providers({ children }: { children: React.ReactNode }) {
    return <SessionProvider>{children}</SessionProvider>;
}

