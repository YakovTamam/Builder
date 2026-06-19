"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type PhotoItem = {
  _id: string;
  url: string;
  stage?: string;
  location?: string;
  tags?: string[];
  createdAt: string;
  uploadedBy?: { name?: string };
};

export default function PhotoGallery({
  projects,
  selectedProjectId,
}: {
  projects: { _id: string; name: string }[];
  selectedProjectId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const projectId = selectedProjectId ?? projects[0]?._id;

  const loadPhotos = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/photos?projectId=${projectId}`);
      const data = await res.json();
      setPhotos(data.photos ?? []);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPhotos();
  }, [loadPhotos]);

  function handleProjectChange(newProjectId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("projectId", newProjectId);
    router.push(`/photos?${params.toString()}`);
  }

  async function handleDelete(id: string) {
    setPhotos((prev) => prev.filter((p) => p._id !== id));
    await fetch(`/api/photos/${id}`, { method: "DELETE" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          url,
          stage: stage || undefined,
          location: location || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "שגיאה בהוספת תמונה");
        return;
      }
      setPhotos((prev) => [data.photo, ...prev]);
      setUrl("");
      setStage("");
      setLocation("");
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <select
          value={projectId}
          onChange={(e) => handleProjectChange(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:max-w-xs"
        >
          {projects.map((project) => (
            <option key={project._id} value={project._id}>
              {project.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors px-4 py-2 text-sm font-medium text-center"
        >
          {showForm ? "ביטול" : "+ הוספת תמונה"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="flex flex-col gap-1 sm:col-span-3">
            <label className="text-sm text-zinc-300">כתובת תמונה (URL)</label>
            <input
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-300">שלב</label>
            <input
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-300">מיקום</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {error && <p className="text-sm text-red-400 sm:col-span-3">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50 sm:col-span-3"
          >
            {submitting ? "מוסיף..." : "הוסף תמונה"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-zinc-400 text-sm">טוען תמונות...</p>
      ) : photos.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-400 text-sm">
          אין תמונות עדיין לפרויקט זה.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div key={photo._id} className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 flex flex-col">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.stage ?? "תמונה"} className="w-full aspect-square object-cover" />
              <div className="p-2 flex flex-col gap-1">
                <div className="flex flex-wrap gap-1 text-xs text-zinc-400">
                  {photo.stage && <span className="rounded-full bg-zinc-800 px-2 py-0.5">{photo.stage}</span>}
                  {photo.location && <span className="rounded-full bg-zinc-800 px-2 py-0.5">{photo.location}</span>}
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>{photo.uploadedBy?.name ?? ""}</span>
                  <button onClick={() => handleDelete(photo._id)} className="hover:text-red-400">
                    מחק
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
