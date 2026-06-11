"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RecoveryForm() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, companyName, name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "שגיאה בשחזור החשבון");
        return;
      }

      setSuccess(
        data.action === "updated"
          ? "המשתמש עודכן למנהל-על עם הסיסמה החדשה. ניתן להתחבר כעת."
          : "נוצר חשבון מנהל-על חדש. ניתן להתחבר כעת.",
      );
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="secret" className="text-sm text-zinc-300">
          קוד שחזור
        </label>
        <input
          id="secret"
          type="password"
          required
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="companyName" className="text-sm text-zinc-300">
          שם החברה
        </label>
        <input
          id="companyName"
          type="text"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-zinc-500">חברה קיימת בשם זה תשמש, אחרת תיווצר חברה חדשה.</p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm text-zinc-300">
          שם מלא
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm text-zinc-300">
          אימייל
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-zinc-500">אם קיים משתמש עם אימייל זה, הוא יהפוך למנהל-על וסיסמתו תתעדכן.</p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm text-zinc-300">
          סיסמה (לפחות 8 תווים)
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-emerald-400">{success}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "מעדכן..." : "צור / שחזר מנהל-על"}
      </button>
    </form>
  );
}
