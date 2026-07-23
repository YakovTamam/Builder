"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Lets a user connect (or disconnect) their Telegram so alerts reach them
// directly. Rendered only when the server has Telegram configured.
export default function TelegramLinkCard({ linked }: { linked: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/telegram/link", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "לא ניתן היה ליצור קישור");
        return;
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
      setOpened(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlink() {
    setLoading(true);
    try {
      await fetch("/api/telegram/unlink", { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (linked) {
    return (
      <div className="card flex items-center justify-between gap-3 px-4 py-3">
        <span className="flex items-center gap-2 text-sm text-gray-700">
          <span aria-hidden>💬</span>
          התראות Telegram מחוברות
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            פעיל
          </span>
        </span>
        <button
          type="button"
          onClick={handleUnlink}
          disabled={loading}
          className="text-sm text-gray-500 hover:text-red-600 disabled:opacity-50"
        >
          נתק
        </button>
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-3 border-emerald-200 bg-emerald-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          💬
        </span>
        <div>
          <p className="font-medium text-gray-900">קבל התראות ישירות ל-Telegram</p>
          <p className="text-sm text-gray-600">
            {opened
              ? 'פתחנו את Telegram — לחץ "Start" שם, ואז לחץ "סיימתי" לרענון.'
              : "משימות באיחור, חוסרים בחומרים ותפוגת מסמכים — ישר לנייד, בחינם."}
          </p>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {opened && (
          <button
            type="button"
            onClick={() => router.refresh()}
            className="btn-outline px-4 py-2"
          >
            סיימתי
          </button>
        )}
        <button
          type="button"
          onClick={handleConnect}
          disabled={loading}
          className="btn-primary px-4 py-2"
        >
          {loading ? "..." : opened ? "פתח שוב" : "חבר Telegram"}
        </button>
      </div>
    </div>
  );
}
