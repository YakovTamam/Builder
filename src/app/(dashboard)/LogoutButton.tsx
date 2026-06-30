"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className={
        compact
          ? "text-xs text-gray-500 hover:text-gray-900"
          : "rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-center"
      }
    >
      התנתק
    </button>
  );
}
