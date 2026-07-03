"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RefreshAlertsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRefresh() {
    setLoading(true);
    try {
      await fetch("/api/alerts/refresh", { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={loading}
      className="self-start rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
    >
      {loading ? "בודק..." : "🔄 רענן התראות"}
    </button>
  );
}
