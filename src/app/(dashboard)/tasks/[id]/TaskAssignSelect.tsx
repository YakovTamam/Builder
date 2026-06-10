"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type WorkerOption = { _id: string; name: string };

export default function TaskAssignSelect({
  taskId,
  assignedTo,
}: {
  taskId: string;
  assignedTo?: string;
}) {
  const router = useRouter();
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [value, setValue] = useState(assignedTo ?? "");
  const [loading, setLoading] = useState(false);

  const loadWorkers = useCallback(async () => {
    const res = await fetch("/api/users/assignable");
    const data = await res.json();
    setWorkers(data.users ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWorkers();
  }, [loadWorkers]);

  async function handleChange(newValue: string) {
    setValue(newValue);
    setLoading(true);
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo: newValue || null }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <select
      value={value}
      disabled={loading}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
    >
      <option value="">לא משויך</option>
      {workers.map((worker) => (
        <option key={worker._id} value={worker._id}>
          {worker.name}
        </option>
      ))}
    </select>
  );
}
