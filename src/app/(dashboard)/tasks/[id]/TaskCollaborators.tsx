"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PERMISSION_LABELS: Record<string, string> = {
  view: "צפייה בלבד",
  comment: "צפייה והערות",
  edit: "צפייה, הערות ועדכון סטטוס",
};

const PERMISSION_OPTIONS = ["view", "comment", "edit"] as const;

type CollaboratorItem = {
  _id: string;
  permission: string;
  userId?: { _id?: string; name?: string; email?: string; role?: string };
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "מנהל-על",
  company_admin: "מנהל חברה",
  project_manager: "מנהל פרויקט",
  field_worker: "עובד שטח",
  consultant: "יועץ",
  client: "לקוח",
};

export default function TaskCollaborators({
  taskId,
  collaborators,
}: {
  taskId: string;
  collaborators: CollaboratorItem[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<(typeof PERMISSION_OPTIONS)[number]>("view");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, permission }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "שגיאה בהוספת משתתף");
        return;
      }
      setEmail("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(collaboratorId: string) {
    setLoading(true);
    try {
      await fetch(`/api/tasks/${taskId}/collaborators/${collaboratorId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3">
      <h2 className="text-lg font-medium">יועצים ומשתתפים</h2>

      {collaborators.length === 0 ? (
        <p className="text-sm text-zinc-400">אין משתתפים נוספים במשימה זו.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {collaborators.map((collaborator) => (
            <li
              key={collaborator._id}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            >
              <div className="flex flex-col">
                <span className="font-medium">{collaborator.userId?.name ?? collaborator.userId?.email}</span>
                <span className="text-xs text-zinc-500">
                  {ROLE_LABELS[collaborator.userId?.role ?? ""] ?? collaborator.userId?.role} ·{" "}
                  {PERMISSION_LABELS[collaborator.permission] ?? collaborator.permission}
                </span>
              </div>
              <button
                onClick={() => handleRemove(collaborator._id)}
                disabled={loading}
                className="rounded-lg border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                הסר
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="אימייל המשתתף"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <select
          value={permission}
          onChange={(e) => setPermission(e.target.value as (typeof PERMISSION_OPTIONS)[number])}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {PERMISSION_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {PERMISSION_LABELS[option]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          הוסף
        </button>
      </form>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
