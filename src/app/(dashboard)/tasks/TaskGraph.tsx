"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { computeCriticalPath, wouldCreateCycle, type CpmTaskInput } from "@/lib/criticalPath";

export type GraphTask = {
  _id: string;
  title: string;
  status: string;
  priority: string;
  durationHours?: number;
  dependsOn?: string[];
  graphPosition?: { x?: number; y?: number };
};

const STATUS_STYLES: Record<string, { border: string; dot: string; label: string }> = {
  todo: { border: "border-gray-300", dot: "bg-gray-400", label: "לביצוע" },
  in_progress: { border: "border-blue-300", dot: "bg-blue-500", label: "בתהליך" },
  review: { border: "border-amber-300", dot: "bg-amber-500", label: "לבדיקה" },
  done: { border: "border-emerald-300", dot: "bg-emerald-500", label: "הושלם" },
};

// Auto-layout spacing (used only for tasks without a saved graphPosition).
const COL_WIDTH = 260;
const ROW_HEIGHT = 130;

type TaskNodeData = {
  taskId: string;
  label: string;
  status: string;
  durationHours?: number;
  isCritical: boolean;
  floatHours: number;
  startDate?: string;
  finishDate?: string;
};

type TaskFlowNode = Node<TaskNodeData, "taskNode">;

function formatDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" });
}

function TaskNode({ data }: NodeProps<TaskFlowNode>) {
  const status = STATUS_STYLES[data.status] ?? STATUS_STYLES.todo;
  const start = formatDate(data.startDate);
  const finish = formatDate(data.finishDate);
  return (
    <div
      className={`min-w-[200px] rounded-xl border-2 bg-white px-3 py-2 shadow-sm ${
        data.isCritical ? "border-red-500 ring-2 ring-red-200" : status.border
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${status.dot}`} />
          <span className="text-xs text-gray-500">{status.label}</span>
        </div>
        {data.isCritical && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
            נתיב קריטי
          </span>
        )}
      </div>
      <p className="mt-1 text-sm font-medium text-gray-900">{data.label}</p>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
        {typeof data.durationHours === "number" && data.durationHours > 0 && (
          <span>⏱ {data.durationHours} שעות</span>
        )}
        {start && finish && (
          <span>
            📅 {start} – {finish}
          </span>
        )}
        {!data.isCritical && data.floatHours > 0 && <span>שהות: {Math.round(data.floatHours)} שעות</span>}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-gray-400" />
    </div>
  );
}

const nodeTypes = { taskNode: TaskNode };

// Longest-path depth from any root: drives the automatic column layout.
function computeDepths(tasks: GraphTask[]): Map<string, number> {
  const byId = new Map(tasks.map((t) => [t._id, t]));
  const depth = new Map<string, number>();
  const visiting = new Set<string>();

  function resolve(id: string): number {
    if (depth.has(id)) return depth.get(id)!;
    if (visiting.has(id)) return 0; // guard against cycles (API prevents them)
    visiting.add(id);
    const preds = (byId.get(id)?.dependsOn ?? []).filter((p) => byId.has(p));
    const d = preds.length === 0 ? 0 : Math.max(...preds.map(resolve)) + 1;
    visiting.delete(id);
    depth.set(id, d);
    return d;
  }

  for (const t of tasks) resolve(t._id);
  return depth;
}

export default function TaskGraph({
  projectId,
  projectStartDate,
  tasks,
  canManage,
  onReload,
}: {
  projectId: string;
  projectStartDate?: string;
  tasks: GraphTask[];
  canManage: boolean;
  onReload: () => void;
}) {
  const router = useRouter();
  const [nodes, setNodes, onNodesChange] = useNodesState<TaskFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const cpm = useMemo(() => {
    const inputs: CpmTaskInput[] = tasks.map((t) => ({
      id: t._id,
      durationHours: t.durationHours,
      dependsOn: t.dependsOn ?? [],
    }));
    return computeCriticalPath(inputs, projectStartDate ? new Date(projectStartDate) : null);
  }, [tasks, projectStartDate]);

  const computedNodes = useMemo<TaskFlowNode[]>(() => {
    const depths = computeDepths(tasks);
    const rowByDepth = new Map<number, number>();

    return tasks.map((t) => {
      const result = cpm.tasks[t._id];
      let position: { x: number; y: number };
      if (t.graphPosition && typeof t.graphPosition.x === "number" && typeof t.graphPosition.y === "number") {
        position = { x: t.graphPosition.x, y: t.graphPosition.y };
      } else {
        const depth = depths.get(t._id) ?? 0;
        const row = rowByDepth.get(depth) ?? 0;
        rowByDepth.set(depth, row + 1);
        position = { x: depth * COL_WIDTH, y: row * ROW_HEIGHT };
      }
      return {
        id: t._id,
        type: "taskNode" as const,
        position,
        data: {
          taskId: t._id,
          label: t.title,
          status: t.status,
          durationHours: t.durationHours,
          isCritical: result?.isCritical ?? false,
          floatHours: result?.floatHours ?? 0,
          startDate: result?.startDate ? result.startDate.toISOString() : undefined,
          finishDate: result?.finishDate ? result.finishDate.toISOString() : undefined,
        },
      };
    });
  }, [tasks, cpm]);

  const computedEdges = useMemo<Edge[]>(() => {
    const criticalSet = new Set(cpm.criticalTaskIds);
    const idSet = new Set(tasks.map((t) => t._id));
    const result: Edge[] = [];
    for (const t of tasks) {
      for (const prereq of t.dependsOn ?? []) {
        if (!idSet.has(prereq)) continue;
        // An edge is on the critical path only when both endpoints are.
        const critical = criticalSet.has(t._id) && criticalSet.has(prereq);
        result.push({
          id: `${prereq}->${t._id}`,
          source: prereq,
          target: t._id,
          markerEnd: { type: MarkerType.ArrowClosed, color: critical ? "#ef4444" : "#94a3b8" },
          style: { stroke: critical ? "#ef4444" : "#94a3b8", strokeWidth: critical ? 2.5 : 1.5 },
          animated: critical,
        });
      }
    }
    return result;
  }, [tasks, cpm]);

  useEffect(() => {
    setNodes(computedNodes);
    setEdges(computedEdges);
  }, [computedNodes, computedEdges, setNodes, setEdges]);

  const persist = useCallback(
    async (taskId: string, body: Record<string, unknown>) => {
      setError(null);
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "שגיאה בשמירת השינוי");
        return false;
      }
      return true;
    },
    [],
  );

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      persist(node.id, { graphPosition: { x: Math.round(node.position.x), y: Math.round(node.position.y) } });
    },
    [persist],
  );

  const onConnect = useCallback(
    async (connection: Connection) => {
      const { source, target } = connection;
      if (!source || !target || source === target) return;

      const dependent = tasks.find((t) => t._id === target);
      if (!dependent) return;
      if ((dependent.dependsOn ?? []).includes(source)) return; // already linked

      const inputs: CpmTaskInput[] = tasks.map((t) => ({ id: t._id, dependsOn: t.dependsOn ?? [] }));
      if (wouldCreateCycle(inputs, target, source)) {
        setError("לא ניתן לחבר - הדבר ייצור מעגל בין המשימות");
        return;
      }

      const nextDependsOn = [...(dependent.dependsOn ?? []), source];
      const ok = await persist(target, { dependsOn: nextDependsOn });
      if (ok) onReload();
    },
    [tasks, persist, onReload],
  );

  const onEdgesDelete = useCallback(
    async (deleted: Edge[]) => {
      // Group removed edges by dependent task, then rewrite each dependsOn once.
      const removalsByTarget = new Map<string, Set<string>>();
      for (const edge of deleted) {
        if (!removalsByTarget.has(edge.target)) removalsByTarget.set(edge.target, new Set());
        removalsByTarget.get(edge.target)!.add(edge.source);
      }
      let changed = false;
      for (const [target, removedSources] of removalsByTarget) {
        const dependent = tasks.find((t) => t._id === target);
        if (!dependent) continue;
        const nextDependsOn = (dependent.dependsOn ?? []).filter((d) => !removedSources.has(d));
        const ok = await persist(target, { dependsOn: nextDependsOn });
        changed = changed || ok;
      }
      if (changed) onReload();
    },
    [tasks, persist, onReload],
  );

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, title: newTitle.trim(), type: "single" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "שגיאה ביצירת המשימה");
        return;
      }
      setNewTitle("");
      onReload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {cpm.hasCycle && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          ⚠️ קיים מעגל בתלויות בין המשימות - חישוב הנתיב הקריטי מושבת עד לתיקון.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
      )}

      <div className="h-[70vh] rounded-xl border border-gray-200 bg-gray-50" dir="ltr">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={canManage ? onNodeDragStop : undefined}
          onConnect={canManage ? onConnect : undefined}
          onEdgesDelete={canManage ? onEdgesDelete : undefined}
          nodeTypes={nodeTypes}
          nodesConnectable={canManage}
          nodesDraggable={canManage}
          elementsSelectable
          onNodeDoubleClick={(_, node) => router.push(`/tasks/${node.id}`)}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          <Panel position="top-right">
            <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white/95 p-3 text-xs shadow-sm" dir="rtl">
              <div className="flex items-center gap-2">
                <span className="h-3 w-6 rounded bg-red-500" />
                <span className="text-gray-700">נתיב קריטי</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-6 rounded bg-slate-400" />
                <span className="text-gray-700">משימה עם שהות</span>
              </div>
              <p className="text-gray-400">לחיצה כפולה על צומת פותחת את המשימה</p>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {canManage && (
        <form onSubmit={handleAddTask} className="flex items-center gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="כותרת משימה חדשה"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:max-w-xs"
          />
          <button
            type="submit"
            disabled={busy || !newTitle.trim()}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            + הוסף צומת
          </button>
        </form>
      )}
    </div>
  );
}
