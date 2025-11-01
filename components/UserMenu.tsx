"use client";

import { signOut } from "next-auth/react";
import { UserMenuProps } from "@/types";

export default function UserMenu({ user }: UserMenuProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        {user.name && (
          <p className="text-sm font-light text-gray-900 dark:text-gray-100">
            {user.name}
          </p>
        )}
        {user.email && (
          <p className="text-xs text-gray-500 dark:text-gray-400 font-light">
            {user.email}
          </p>
        )}
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="cursor-pointer px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-[#2A2A2A] active:bg-gray-100 dark:active:bg-[#333333] transition-all"
      >
        Sign out
      </button>
    </div>
  );
}

