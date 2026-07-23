"use client";

import { useEffect, useState, useCallback } from "react";
import PhotoUploader from "../../PhotoUploader";

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
  const [error, setError] = useState<string | null>(null);

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

  // Persist the Photo record once the file has uploaded to Blob storage.
  async function savePhoto(url: string) {
    setError(null);
    const res = await fetch("/api/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, taskId, url }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "שגיאה בשמירת התמונה");
      return;
    }
    setPhotos((prev) => [data.photo, ...prev]);
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
        <PhotoUploader projectId={projectId} onUploaded={savePhoto} label="צלם או העלה תמונה למשימה" />
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
