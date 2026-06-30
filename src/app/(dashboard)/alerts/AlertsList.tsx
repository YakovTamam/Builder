"use client";

import { useState } from "react";

const SEVERITY_LABELS: Record<string, { label: string; className: string }> = {
  low: { label: "נמוכה", className: "bg-gray-100 text-gray-700" },
  medium: { label: "בינונית", className: "bg-amber-100 text-amber-700" },
  high: { label: "גבוהה", className: "bg-red-100 text-red-700" },
};

const TYPE_LABELS: Record<string, string> = {
  task_overdue: "משימה באיחור",
  missing_material: "חומר חסר",
  no_recent_photos: "אין תמונות עדכניות",
  stage_stalled: "שלב תקוע",
};

type AlertItem = {
  _id: string;
  type: string;
  severity: string;
  title: string;
  description?: string;
  isRead: boolean;
  createdAt: string;
};

export default function AlertsList({ alerts: initialAlerts }: { alerts: AlertItem[] }) {
  const [alerts, setAlerts] = useState(initialAlerts);

  async function toggleRead(id: string, isRead: boolean) {
    setAlerts((prev) => prev.map((a) => (a._id === id ? { ...a, isRead } : a)));
    await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRead }),
    });
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-gray-500 text-sm">
        אין התראות כרגע.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {alerts.map((alert) => {
        const severity = SEVERITY_LABELS[alert.severity] ?? SEVERITY_LABELS.medium;
        return (
          <div
            key={alert._id}
            className={`rounded-xl border p-4 flex items-start justify-between gap-3 ${
              alert.isRead ? "border-gray-200 bg-gray-50 opacity-60" : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${severity.className}`}>
                  {severity.label}
                </span>
                <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-white text-gray-700">
                  {TYPE_LABELS[alert.type] ?? alert.type}
                </span>
              </div>
              <p className="font-medium">{alert.title}</p>
              {alert.description && <p className="text-sm text-gray-500">{alert.description}</p>}
              <p className="text-xs text-gray-400">{new Date(alert.createdAt).toLocaleString("he-IL")}</p>
            </div>

            <button
              onClick={() => toggleRead(alert._id, !alert.isRead)}
              className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-100 transition-colors"
            >
              {alert.isRead ? "סמן כלא נקרא" : "סמן כנקרא"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
