"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB — matches the server token limit.

// Takes a photo from the device camera / gallery, uploads it straight to Vercel
// Blob (client upload, so large field photos aren't capped by the serverless
// body limit), and hands the resulting public URL back to the parent. The
// parent decides what to do with the URL (e.g. create a Photo record).
export default function PhotoUploader({
  projectId,
  onUploaded,
  disabled = false,
  label = "צלם או העלה תמונה",
}: {
  projectId: string;
  onUploaded: (url: string) => void | Promise<void>;
  disabled?: boolean;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("יש לבחור קובץ תמונה בלבד");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("התמונה גדולה מדי (מקסימום 15MB)");
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const result = await upload(`photos/${projectId}/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/photos/upload",
        clientPayload: JSON.stringify({ projectId }),
        onUploadProgress: (p) => setProgress(p.percentage),
      });
      await onUploaded(result.url);
    } catch (err) {
      setError((err as Error)?.message || "העלאת התמונה נכשלה");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  const busy = uploading || disabled;

  return (
    <div className="flex flex-col gap-2">
      <label
        className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-3 py-5 text-sm text-gray-600 transition-colors hover:border-emerald-400 hover:bg-emerald-50 ${
          busy ? "pointer-events-none opacity-60" : "cursor-pointer"
        }`}
      >
        <span className="text-2xl" aria-hidden>
          📷
        </span>
        <span>{uploading ? `מעלה... ${progress}%` : label}</span>
        {uploading && (
          <span className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-gray-200">
            <span
              className="block h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          disabled={busy}
          className="hidden"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
