"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("למחוק את הפרויקט? פעולה זו אינה הפיכה.")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/projects");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="rounded-lg border border-red-800 text-red-400 px-4 py-2 text-sm hover:bg-red-950 transition-colors disabled:opacity-50"
    >
      {loading ? "מוחק..." : "מחיקת פרויקט"}
    </button>
  );
}
