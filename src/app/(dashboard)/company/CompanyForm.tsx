"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLAN_LABELS: Record<string, string> = {
  trial: "ניסיון",
  basic: "בסיסי",
  pro: "מקצועי",
};

export default function CompanyForm({ name, plan }: { name: string; plan: string }) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: companyName }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "שגיאה בשמירת פרטי החברה");
        return;
      }

      setSuccess("הפרטים נשמרו בהצלחה");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="companyName" className="text-sm text-gray-700">
          שם החברה
        </label>
        <input
          id="companyName"
          type="text"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm text-gray-700">חבילה</p>
        <p className="text-sm text-gray-500">{PLAN_LABELS[plan] ?? plan}</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-600">{success}</p>}

      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "שומר..." : "שמור שינויים"}
      </button>
    </form>
  );
}
