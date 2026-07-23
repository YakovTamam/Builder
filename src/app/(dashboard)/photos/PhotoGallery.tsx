"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PhotoUploader from "../PhotoUploader";

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
  const [stage, setStage] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  // Called once the file has been uploaded to Blob storage: persist the Photo
  // record with the current stage/location metadata.
  async function savePhoto(url: string) {
    setError(null);
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
      setError(data.error ?? "שגיאה בשמירת התמונה");
      return;
    }
    setPhotos((prev) => [data.photo, ...prev]);
    setStage("");
    setLocation("");
    setShowForm(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <select
          value={projectId}
          onChange={(e) => handleProjectChange(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:max-w-xs"
        >
          {projects.map((project) => (
            <option key={project._id} value={project._id}>
              {project.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-white px-4 py-2 text-sm font-medium text-center"
        >
          {showForm ? "ביטול" : "+ הוספת תמונה"}
        </button>
      </div>

      {showForm && projectId && (
        <div className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">שלב (לא חובה)</label>
            <input
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              placeholder="למשל: שלד"
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">מיקום (לא חובה)</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="למשל: בניין A, קומה 3"
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <PhotoUploader projectId={projectId} onUploaded={savePhoto} />
            <p className="mt-2 text-xs text-gray-500">
              התמונה תישמר עם השלב והמיקום שמילאת. אפשר לצלם ישירות מהנייד.
            </p>
          </div>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">טוען תמונות...</p>
      ) : photos.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-gray-500 text-sm">
          אין תמונות עדיין לפרויקט זה.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div key={photo._id} className="rounded-xl overflow-hidden border border-gray-200 bg-white flex flex-col">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.stage ?? "תמונה"} className="w-full aspect-square object-cover" />
              <div className="p-2 flex flex-col gap-1">
                <div className="flex flex-wrap gap-1 text-xs text-gray-500">
                  {photo.stage && <span className="rounded-full bg-white px-2 py-0.5">{photo.stage}</span>}
                  {photo.location && <span className="rounded-full bg-white px-2 py-0.5">{photo.location}</span>}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{photo.uploadedBy?.name ?? ""}</span>
                  <button onClick={() => handleDelete(photo._id)} className="hover:text-red-600">
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
