"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CommentItem = {
  text: string;
  createdAt: string;
  userId?: { name?: string } | string;
};

export default function TaskComments({
  taskId,
  comments,
  canComment,
}: {
  taskId: string;
  comments: CommentItem[];
  canComment: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "שגיאה בשליחת ההערה");
        return;
      }
      setText("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-3">
      <h2 className="text-lg font-medium">תגובות</h2>

      {comments.length === 0 ? (
        <p className="text-sm text-gray-500">אין תגובות עדיין.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {comments
            .slice()
            .reverse()
            .map((comment, idx) => {
              const name = typeof comment.userId === "object" ? comment.userId?.name : undefined;
              return (
                <li key={idx} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-700">{name ?? "משתמש"}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(comment.createdAt).toLocaleString("he-IL")}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{comment.text}</p>
                </li>
              );
            })}
        </ul>
      )}

      {canComment && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="הוסף תגובה..."
            className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="self-start rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "שולח..." : "שלח תגובה"}
          </button>
        </form>
      )}
    </div>
  );
}
