import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-950 text-zinc-100 px-6 text-center">
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
  );
}
