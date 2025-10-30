"use client";

import { signOut } from "next-auth/react";
import { UserMenuProps } from "@/types";

export default function UserMenu({ user }: UserMenuProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        {user.name && (
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {user.name}
          </p>
        )}
        {user.email && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {user.email}
          </p>
        )}
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-[#1E1E1E] transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}

