"use client";

import { useEffect, useState, useCallback } from "react";

type PhotoItem = {
  _id: string;
  url: string;
  uploadedBy?: { name?: string };
};

export default function TaskPhotos({
  taskId,
  projectId,
  canUpload,
}: {
  taskId: string;
  projectId: string;
  canUpload: boolean;
}) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/photos?projectId=${projectId}&taskId=${taskId}`);
      const data = await res.json();
      setPhotos(data.photos ?? []);
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPhotos();
  }, [loadPhotos]);

  async function handleDelete(id: string) {
    setPhotos((prev) => prev.filter((p) => p._id !== id));
    await fetch(`/api/photos/${id}`, { method: "DELETE" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, taskId, url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "שגיאה בהוספת תמונה");
        return;
      }
      setPhotos((prev) => [data.photo, ...prev]);
      setUrl("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3">
      <h2 className="text-lg font-medium">תמונות מהמשימה</h2>

      {loading ? (
        <p className="text-sm text-zinc-400">טוען תמונות...</p>
      ) : photos.length === 0 ? (
        <p className="text-sm text-zinc-400">אין תמונות עדיין.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((photo) => (
            <div key={photo._id} className="relative rounded-lg overflow-hidden border border-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="w-full aspect-square object-cover" />
              <button
                onClick={() => handleDelete(photo._id)}
                className="absolute top-1 left-1 rounded bg-zinc-950/80 px-1.5 py-0.5 text-xs hover:bg-red-900/80"
              >
                מחק
              </button>
            </div>
          ))}
        </div>
      )}

      {canUpload && (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="כתובת תמונה (URL)"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={submitting || !url.trim()}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "מוסיף..." : "הוסף"}
          </button>
        </form>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
