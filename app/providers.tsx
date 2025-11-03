"use client";
import { SessionProvider } from "next-auth/react";

// seperated providers for redability purposes (in case we need to add more, it can get unwieldy with nesting)
// will be using it in layout.tsx

export function Providers({ children }: { children: React.ReactNode }) {
    return <SessionProvider>{children}</SessionProvider>;
}

