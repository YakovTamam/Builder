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
  const [uploading, setUploading] = useState(false);

  const MAX_FILE_SIZE = 5 * 1024 * 1024;

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

  async function uploadDataUrl(dataUrl: string) {
    setError(null);
    setUploading(true);
    try {
      const res = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, taskId, url: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "שגיאה בהעלאת תמונה");
        return;
      }
      setPhotos((prev) => [data.photo, ...prev]);
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("יש לבחור קובץ תמונה בלבד");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("התמונה גדולה מדי (מקסימום 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        uploadDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
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
    <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-3">
      <h2 className="text-lg font-medium">תמונות מהמשימה</h2>

      {loading ? (
        <p className="text-sm text-gray-500">טוען תמונות...</p>
      ) : photos.length === 0 ? (
        <p className="text-sm text-gray-500">אין תמונות עדיין.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((photo) => (
            <div key={photo._id} className="relative rounded-lg overflow-hidden border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="w-full aspect-square object-cover" />
              <button
                onClick={() => handleDelete(photo._id)}
                className="absolute top-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white hover:bg-red-700/90"
              >
                מחק
              </button>
            </div>
          ))}
        </div>
      )}

      {canUpload && (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="task-photo-upload"
            className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-sm text-gray-600 hover:border-emerald-400 hover:bg-emerald-50 transition-colors cursor-pointer ${
              uploading ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <span className="text-2xl">📷</span>
            <span>{uploading ? "מעלה תמונה..." : "לחץ להעלאת תמונה ממכשיר"}</span>
            <input
              id="task-photo-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
          </label>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="או הדבק כתובת תמונה (URL)"
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={submitting || !url.trim()}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {submitting ? "מוסיף..." : "הוסף"}
            </button>
          </form>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
