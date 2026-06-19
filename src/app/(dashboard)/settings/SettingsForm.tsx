"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SettingsValues = {
  logoUrl: string;
  heroLogoWidth: number;
  heroLogoHeight: number;
  footerLogoWidth: number;
  footerLogoHeight: number;
};

export default function SettingsForm({ initial }: { initial: SettingsValues }) {
  const router = useRouter();

  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [heroLogoWidth, setHeroLogoWidth] = useState(initial.heroLogoWidth.toString());
  const [heroLogoHeight, setHeroLogoHeight] = useState(initial.heroLogoHeight.toString());
  const [footerLogoWidth, setFooterLogoWidth] = useState(initial.footerLogoWidth.toString());
  const [footerLogoHeight, setFooterLogoHeight] = useState(initial.footerLogoHeight.toString());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logoUrl,
          heroLogoWidth: Number(heroLogoWidth),
          heroLogoHeight: Number(heroLogoHeight),
          footerLogoWidth: Number(footerLogoWidth),
          footerLogoHeight: Number(footerLogoHeight),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "שגיאה בשמירת ההגדרות");
        return;
      }

      setSuccess(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="logoUrl" className="text-sm text-zinc-300">
          כתובת הלוגו (URL)
        </label>
        <input
          id="logoUrl"
          type="text"
          required
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="/icon.svg"
          className="rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm text-zinc-300">תצוגה מקדימה</p>
        <div className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-zinc-500">הירו (עמוד הבית)</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="תצוגה מקדימה"
              style={{ width: Number(heroLogoWidth) || 0, height: Number(heroLogoHeight) || 0 }}
              className="object-contain"
            />
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-zinc-500">פוטר</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="תצוגה מקדימה"
              style={{ width: Number(footerLogoWidth) || 0, height: Number(footerLogoHeight) || 0 }}
              className="object-contain"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-zinc-300">גודל לוגו בהירו (פיקסלים)</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="heroLogoWidth" className="text-xs text-zinc-400">
              רוחב
            </label>
            <input
              id="heroLogoWidth"
              type="number"
              min={8}
              max={1024}
              value={heroLogoWidth}
              onChange={(e) => setHeroLogoWidth(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="heroLogoHeight" className="text-xs text-zinc-400">
              גובה
            </label>
            <input
              id="heroLogoHeight"
              type="number"
              min={8}
              max={1024}
              value={heroLogoHeight}
              onChange={(e) => setHeroLogoHeight(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-zinc-300">גודל לוגו בפוטר (פיקסלים)</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="footerLogoWidth" className="text-xs text-zinc-400">
              רוחב
            </label>
            <input
              id="footerLogoWidth"
              type="number"
              min={8}
              max={1024}
              value={footerLogoWidth}
              onChange={(e) => setFooterLogoWidth(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="footerLogoHeight" className="text-xs text-zinc-400">
              גובה
            </label>
            <input
              id="footerLogoHeight"
              type="number"
              min={8}
              max={1024}
              value={footerLogoHeight}
              onChange={(e) => setFooterLogoHeight(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-emerald-400">ההגדרות נשמרו בהצלחה</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "שומר..." : "שמור שינויים"}
      </button>
    </form>
  );
}
