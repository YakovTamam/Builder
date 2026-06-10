import Link from "next/link";
import { getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getSiteSettings();

  return (
    <div className="flex flex-1 flex-col bg-zinc-950 text-zinc-100">
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={settings.logoUrl}
          alt="Builder"
          width={settings.heroLogoWidth}
          height={settings.heroLogoHeight}
          style={{ width: settings.heroLogoWidth, height: settings.heroLogoHeight }}
          className="mb-4 object-contain"
        />
        <h1 className="text-4xl font-bold mb-4">Builder</h1>
        <p className="text-zinc-400 max-w-md mb-8">
          מערכת ניהול פרויקטים חכמה לתחום הבנייה — פרויקטים, משימות, תמונות מהשטח, לוגיסטיקה והתראות במקום אחד.
        </p>
        <Link
          href="/login"
          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors px-6 py-3 font-medium"
        >
          כניסה למערכת
        </Link>
      </div>

      <footer className="flex items-center justify-center gap-2 border-t border-zinc-800 py-4 px-6 text-sm text-zinc-500">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={settings.logoUrl}
          alt="Builder"
          width={settings.footerLogoWidth}
          height={settings.footerLogoHeight}
          style={{ width: settings.footerLogoWidth, height: settings.footerLogoHeight }}
          className="object-contain"
        />
        <span>© {new Date().getFullYear()} Builder</span>
      </footer>
    </div>
  );
}
