"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { computeCriticalPath, wouldCreateCycle, type CpmTaskInput } from "@/lib/criticalPath";
import { TRADES, tradeLabel } from "@/lib/trades";
import { formatLocation, type TaskLocation } from "@/lib/locations";

export type GraphTask = {
  _id: string;
  title: string;
  status: string;
  priority: string;
  durationHours?: number;
  dueDate?: string;
  assignedTo?: string;
  trade?: string;
  location?: TaskLocation;
  dependsOn?: string[];
  graphPosition?: { x?: number; y?: number };
};

type Worker = { _id: string; name: string };

const STATUS_OPTIONS = [
  { value: "todo", label: "לביצוע" },
  { value: "in_progress", label: "בתהליך" },
  { value: "review", label: "לבדיקה" },
  { value: "done", label: "הושלם" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "low", label: "נמוכה" },
  { value: "medium", label: "בינונית" },
  { value: "high", label: "גבוהה" },
] as const;

const STATUS_STYLES: Record<string, { bar: string; dot: string; label: string }> = {
  todo: { bar: "#9ca3af", dot: "bg-gray-400", label: "לביצוע" },
  in_progress: { bar: "#3b82f6", dot: "bg-blue-500", label: "בתהליך" },
  review: { bar: "#f59e0b", dot: "bg-amber-500", label: "לבדיקה" },
  done: { bar: "#10b981", dot: "bg-emerald-500", label: "הושלם" },
};

const COL_WIDTH = 240;
const ROW_HEIGHT = 96;

function toDateInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function shortDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" });
}

// ---------------------------------------------------------------------------
// Custom node
// ---------------------------------------------------------------------------

type TaskNodeData = {
  label: string;
  status: string;
  priority: string;
  durationHours?: number;
  assigneeName?: string;
  tradeName?: string;
  locationText?: string;
  isCritical: boolean;
  floatHours: number;
  startDate?: string;
  finishDate?: string;
  showCard: boolean;
  selected: boolean;
  onEdit: () => void;
};

type TaskFlowNode = Node<TaskNodeData, "taskNode">;

// A task is a "point". Hovering (desktop) or tapping (mobile) reveals a small
// info card; its "עריכה" button opens the full editor drawer.
function TaskNode({ data }: NodeProps<TaskFlowNode>) {
  const status = STATUS_STYLES[data.status] ?? STATUS_STYLES.todo;
  const start = shortDate(data.startDate);
  const finish = shortDate(data.finishDate);
  const hasDuration = typeof data.durationHours === "number" && data.durationHours > 0;

  return (
    <div className="relative flex flex-col items-center" dir="rtl">
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-gray-400" />
      <span
        className={`h-5 w-5 rounded-full transition-all ${data.selected ? "ring-2 ring-emerald-500 ring-offset-1" : ""}`}
        style={{
          background: data.isCritical ? "#ef4444" : status.bar,
          boxShadow: data.isCritical ? "0 0 0 3px #fecaca" : "0 0 0 2px #fff, 0 1px 4px rgba(0,0,0,.25)",
        }}
      />
      <span className="mt-1 max-w-[130px] truncate rounded bg-white/85 px-1 text-[11px] font-semibold text-gray-900">
        {data.label}
      </span>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-gray-400" />

      {data.showCard && (
        <div className="absolute bottom-full left-1/2 z-20 mb-2 w-52 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-gray-900">{data.label}</span>
            {data.isCritical ? (
              <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                קריטי
              </span>
            ) : (
              data.floatHours > 0 && (
                <span className="shrink-0 text-[10px] text-gray-400">שהות {Math.round(data.floatHours)}ש׳</span>
              )
            )}
          </div>
          <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-gray-500">
            <span>
              {status.label}
              {data.tradeName ? ` · ${data.tradeName}` : ""}
            </span>
            {(hasDuration || (start && finish)) && (
              <span>
                {hasDuration ? `⏱ ${data.durationHours}ש׳` : ""}
                {start && finish ? `${hasDuration ? " · " : ""}📅 ${start}–${finish}` : ""}
              </span>
            )}
            {data.assigneeName && <span>👤 {data.assigneeName}</span>}
            {data.locationText && <span>📍 {data.locationText}</span>}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onEdit();
            }}
            className="mt-2 w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-white px-2 py-1 text-xs font-medium"
          >
            עריכה ⟵
          </button>
        </div>
      )}
    </div>
  );
}

const nodeTypes = { taskNode: TaskNode };

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

function computeDepths(tasks: GraphTask[]): Map<string, number> {
  const byId = new Map(tasks.map((t) => [t._id, t]));
  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  function resolve(id: string): number {
    if (depth.has(id)) return depth.get(id)!;
    if (visiting.has(id)) return 0;
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

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
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const rfRef = useRef<ReactFlowInstance<TaskFlowNode, Edge> | null>(null);

  useEffect(() => {
    if (!canManage) return;
    fetch("/api/users/assignable")
      .then((r) => (r.ok ? r.json() : { users: [] }))
      .then((d) => setWorkers(d.users ?? []))
      .catch(() => setWorkers([]));
  }, [canManage]);

  const workerName = useCallback(
    (id?: string) => (id ? workers.find((w) => w._id === id)?.name : undefined),
    [workers],
  );

  const cpm = useMemo(() => {
    const inputs: CpmTaskInput[] = tasks.map((t) => ({
      id: t._id,
      durationHours: t.durationHours,
      dependsOn: t.dependsOn ?? [],
    }));
    return computeCriticalPath(inputs, projectStartDate ? new Date(projectStartDate) : null);
  }, [tasks, projectStartDate]);

  // Tree layout: the critical path is a horizontal trunk (y = 0), and every
  // other task branches above/below its depth column. Manual drag positions
  // (graphPosition) still win.
  const baseNodes = useMemo<TaskFlowNode[]>(() => {
    const depths = computeDepths(tasks);
    const criticalSet = new Set(cpm.criticalTaskIds);
    const offByDepth = new Map<number, number>();
    return tasks.map((t) => {
      const r = cpm.tasks[t._id];
      let position: { x: number; y: number };
      if (t.graphPosition && typeof t.graphPosition.x === "number" && typeof t.graphPosition.y === "number") {
        position = { x: t.graphPosition.x, y: t.graphPosition.y };
      } else {
        const depth = depths.get(t._id) ?? 0;
        const x = depth * COL_WIDTH;
        let y = 0;
        if (!criticalSet.has(t._id)) {
          const k = (offByDepth.get(depth) ?? 0) + 1;
          offByDepth.set(depth, k);
          y = (k % 2 === 1 ? -1 : 1) * Math.ceil(k / 2) * ROW_HEIGHT;
        }
        position = { x, y };
      }
      return {
        id: t._id,
        type: "taskNode" as const,
        position,
        data: {
          label: t.title,
          status: t.status,
          priority: t.priority,
          durationHours: t.durationHours,
          assigneeName: workerName(t.assignedTo),
          tradeName: tradeLabel(t.trade),
          locationText: formatLocation(t.location),
          isCritical: r?.isCritical ?? false,
          floatHours: r?.floatHours ?? 0,
          startDate: r?.startDate ? r.startDate.toISOString() : undefined,
          finishDate: r?.finishDate ? r.finishDate.toISOString() : undefined,
          showCard: false,
          selected: false,
          onEdit: () => setSelectedId(t._id),
        },
      };
    });
  }, [tasks, cpm, workerName]);

  const baseEdges = useMemo<Edge[]>(() => {
    const criticalSet = new Set(cpm.criticalTaskIds);
    const idSet = new Set(tasks.map((t) => t._id));
    const connected = new Set<string>();
    const result: Edge[] = [];
    for (const t of tasks) {
      for (const prereq of t.dependsOn ?? []) {
        if (!idSet.has(prereq)) continue;
        connected.add(t._id);
        connected.add(prereq);
        // Trunk (both endpoints critical) is red; every other branch is black.
        const critical = criticalSet.has(t._id) && criticalSet.has(prereq);
        result.push({
          id: `${prereq}->${t._id}`,
          source: prereq,
          target: t._id,
          markerEnd: { type: MarkerType.ArrowClosed, color: critical ? "#ef4444" : "#111827" },
          style: { stroke: critical ? "#ef4444" : "#111827", strokeWidth: critical ? 3 : 1.75 },
          animated: critical,
        });
      }
    }
    // Attach orphan tasks (no dependencies at all) to the trunk root so the
    // whole graph reads as a single connected tree. These are visual only.
    const root = [...cpm.criticalTaskIds].sort(
      (a, b) => (cpm.tasks[a]?.earliestStartHours ?? 0) - (cpm.tasks[b]?.earliestStartHours ?? 0),
    )[0];
    if (root) {
      for (const t of tasks) {
        if (t._id !== root && !connected.has(t._id)) {
          result.push({
            id: `syn-${t._id}`,
            source: root,
            target: t._id,
            deletable: false,
            selectable: false,
            markerEnd: { type: MarkerType.ArrowClosed, color: "#111827" },
            style: { stroke: "#111827", strokeWidth: 1.25, strokeDasharray: "4 3" },
          });
        }
      }
    }
    return result;
  }, [tasks, cpm]);

  useEffect(() => {
    setNodes(baseNodes);
    setEdges(baseEdges);
  }, [baseNodes, baseEdges, setNodes, setEdges]);

  // Inject per-node interaction flags without touching base position state.
  const displayNodes = useMemo<TaskFlowNode[]>(
    () =>
      nodes.map((n) => ({
        ...n,
        data: { ...n.data, showCard: n.id === activeCardId, selected: n.id === selectedId },
      })),
    [nodes, activeCardId, selectedId],
  );

  const persist = useCallback(async (taskId: string, body: Record<string, unknown>) => {
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
  }, []);

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
      if (!dependent || (dependent.dependsOn ?? []).includes(source)) return;
      const inputs: CpmTaskInput[] = tasks.map((t) => ({ id: t._id, dependsOn: t.dependsOn ?? [] }));
      if (wouldCreateCycle(inputs, target, source)) {
        setError("לא ניתן לחבר - הדבר ייצור מעגל בין המשימות");
        return;
      }
      const ok = await persist(target, { dependsOn: [...(dependent.dependsOn ?? []), source] });
      if (ok) onReload();
    },
    [tasks, persist, onReload],
  );

  const onEdgesDelete = useCallback(
    async (deleted: Edge[]) => {
      const byTarget = new Map<string, Set<string>>();
      for (const e of deleted) {
        if (!byTarget.has(e.target)) byTarget.set(e.target, new Set());
        byTarget.get(e.target)!.add(e.source);
      }
      let changed = false;
      for (const [target, removed] of byTarget) {
        const dependent = tasks.find((t) => t._id === target);
        if (!dependent) continue;
        const ok = await persist(target, {
          dependsOn: (dependent.dependsOn ?? []).filter((d) => !removed.has(d)),
        });
        changed = changed || ok;
      }
      if (changed) onReload();
    },
    [tasks, persist, onReload],
  );

  const handleAutoArrange = useCallback(async () => {
    setError(null);
    await Promise.all(tasks.map((t) => persist(t._id, { graphPosition: null })));
    onReload();
    setTimeout(() => rfRef.current?.fitView({ padding: 0.2 }), 50);
  }, [tasks, persist, onReload]);

  // ----- Summary -----
  const summary = useMemo(() => {
    const totalHours = cpm.projectDurationHours;
    let endDate: Date | undefined;
    for (const id of Object.keys(cpm.tasks)) {
      const f = cpm.tasks[id].finishDate;
      if (f && (!endDate || f > endDate)) endDate = f;
    }
    const criticalChain = [...cpm.criticalTaskIds].sort(
      (a, b) => (cpm.tasks[a]?.earliestStartHours ?? 0) - (cpm.tasks[b]?.earliestStartHours ?? 0),
    );
    return { totalHours, endDate, criticalChain };
  }, [cpm]);

  const titleById = useMemo(() => new Map(tasks.map((t) => [t._id, t.title])), [tasks]);
  const selectedTask = selectedId ? tasks.find((t) => t._id === selectedId) ?? null : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div>
          <p className="text-[11px] text-gray-500">משך הפרויקט</p>
          <p className="text-sm font-semibold text-gray-900">
            {summary.totalHours} שעות <span className="font-normal text-gray-500">(~{Math.round(summary.totalHours / 8)} ימי עבודה)</span>
          </p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500">תאריך סיום צפוי</p>
          <p className="text-sm font-semibold text-gray-900">
            {summary.endDate ? summary.endDate.toLocaleDateString("he-IL") : "—"}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500">משימות קריטיות</p>
          <p className="text-sm font-semibold text-red-600">{summary.criticalChain.length}</p>
        </div>
        {summary.criticalChain.length > 0 && (
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-gray-500">הנתיב הקריטי</p>
            <div className="flex flex-wrap items-center gap-1">
              {summary.criticalChain.map((id, i) => (
                <span key={id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(id);
                      rfRef.current?.fitView({ nodes: [{ id }], padding: 0.6, duration: 400 });
                    }}
                    className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-100"
                  >
                    {titleById.get(id)}
                  </button>
                  {i < summary.criticalChain.length - 1 && <span className="text-red-300">←</span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-white px-3 py-1.5 text-sm font-medium"
          >
            + הוסף משימה
          </button>
          <button
            type="button"
            onClick={handleAutoArrange}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-100 transition-colors"
          >
            סידור אוטומטי
          </button>
          <button
            type="button"
            onClick={() => rfRef.current?.fitView({ padding: 0.2, duration: 400 })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-100 transition-colors"
          >
            מרכז תצוגה
          </button>
        </div>
      )}

      {cpm.hasCycle && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          ⚠️ קיים מעגל בתלויות בין המשימות - חישוב הנתיב הקריטי מושבת עד לתיקון.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
      )}

      {/* Canvas + side panel */}
      <div
        className={
          fullscreen
            ? "fixed inset-0 z-50 bg-gray-50"
            : "relative h-[72vh] rounded-xl border border-gray-200 bg-gray-50"
        }
        dir="ltr"
      >
        <ReactFlow
          onInit={(instance) => {
            rfRef.current = instance;
          }}
          nodes={displayNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={canManage ? onNodeDragStop : undefined}
          onConnect={canManage ? onConnect : undefined}
          onEdgesDelete={canManage ? onEdgesDelete : undefined}
          onNodeClick={(_, node) => setActiveCardId(node.id)}
          onNodeMouseEnter={(_, node) => setActiveCardId(node.id)}
          onNodeMouseLeave={() => setActiveCardId(null)}
          onPaneClick={() => setActiveCardId(null)}
          nodeTypes={nodeTypes}
          nodesConnectable={canManage}
          nodesDraggable={canManage}
          elementsSelectable
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          <Panel position="top-right">
            <button
              type="button"
              onClick={() => setFullscreen((v) => !v)}
              className="rounded-lg border border-gray-300 bg-white/95 px-2.5 py-1.5 text-sm shadow-sm hover:bg-gray-100"
              title={fullscreen ? "יציאה ממסך מלא" : "מסך מלא"}
            >
              {fullscreen ? "✕ יציאה" : "⛶ מסך מלא"}
            </button>
          </Panel>
          <Panel position="top-left">
            <div className="flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-white/95 p-3 text-xs shadow-sm" dir="rtl">
              <div className="flex items-center gap-2">
                <span className="h-1 w-6 rounded bg-red-500" />
                <span className="text-gray-700">נתיב קריטי (גזע)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1 w-6 rounded bg-gray-900" />
                <span className="text-gray-700">ענף רגיל</span>
              </div>
              <p className="text-gray-400">ריחוף/לחיצה על נקודה מציג פרטים</p>
            </div>
          </Panel>
        </ReactFlow>

        {selectedTask && (
          <SidePanel
            key={selectedTask._id}
            task={selectedTask}
            tasks={tasks}
            workers={workers}
            canManage={canManage}
            cpmResult={cpm.tasks[selectedTask._id]}
            onClose={() => setSelectedId(null)}
            onSaved={onReload}
            onError={setError}
            onOpenFull={() => router.push(`/tasks/${selectedTask._id}`)}
          />
        )}
      </div>

      {showAdd && canManage && (
        <AddTaskDialog
          projectId={projectId}
          tasks={tasks}
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            onReload();
          }}
          onError={setError}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Side panel (edit)
// ---------------------------------------------------------------------------

function SidePanel({
  task,
  tasks,
  workers,
  canManage,
  cpmResult,
  onClose,
  onSaved,
  onError,
  onOpenFull,
}: {
  task: GraphTask;
  tasks: GraphTask[];
  workers: Worker[];
  canManage: boolean;
  cpmResult?: { startDate?: Date; finishDate?: Date; floatHours: number; isCritical: boolean };
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string | null) => void;
  onOpenFull: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [durationHours, setDurationHours] = useState(task.durationHours?.toString() ?? "");
  const [dueDate, setDueDate] = useState(toDateInput(task.dueDate));
  const [assignedTo, setAssignedTo] = useState(task.assignedTo ?? "");
  const [trade, setTrade] = useState(task.trade ?? "");
  const [dependsOn, setDependsOn] = useState<string[]>(task.dependsOn ?? []);
  const [addDep, setAddDep] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const titleById = useMemo(() => new Map(tasks.map((t) => [t._id, t.title])), [tasks]);

  // Candidates that can be added as a prerequisite without creating a cycle.
  const depCandidates = useMemo(() => {
    const inputs: CpmTaskInput[] = tasks.map((t) => ({
      id: t._id,
      dependsOn: t._id === task._id ? dependsOn : t.dependsOn ?? [],
    }));
    return tasks.filter(
      (t) => t._id !== task._id && !dependsOn.includes(t._id) && !wouldCreateCycle(inputs, task._id, t._id),
    );
  }, [tasks, task._id, dependsOn]);

  async function handleSave() {
    setSaving(true);
    onError(null);
    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          status,
          priority,
          durationHours: durationHours ? Number(durationHours) : undefined,
          dueDate: dueDate || undefined,
          assignedTo: assignedTo || null,
          trade: trade || null,
          dependsOn,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        onError(data.error ?? "שגיאה בשמירה");
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    onError(null);
    try {
      const res = await fetch(`/api/tasks/${task._id}`, { method: "DELETE" });
      if (!res.ok) {
        onError("שגיאה במחיקת המשימה");
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

  return (
    <div
      className="absolute inset-y-0 right-0 z-40 flex w-80 max-w-[85%] flex-col gap-3 overflow-y-auto border-l border-gray-200 bg-white p-4 shadow-xl"
      dir="rtl"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-gray-900">עריכת משימה</h3>
          {cpmResult?.isCritical && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">קריטי</span>
          )}
        </div>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">
          ×
        </button>
      </div>

      {/* Computed schedule */}
      <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>התחלה מוקדמת</span>
          <span className="font-medium text-gray-900">{cpmResult?.startDate?.toLocaleDateString("he-IL") ?? "—"}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span>סיום מוקדם</span>
          <span className="font-medium text-gray-900">{cpmResult?.finishDate?.toLocaleDateString("he-IL") ?? "—"}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span>שהות (float)</span>
          <span className="font-medium text-gray-900">
            {cpmResult ? `${Math.round(cpmResult.floatHours)} שעות` : "—"}
          </span>
        </div>
      </div>

      {!canManage ? (
        <p className="text-sm text-gray-500">אין לך הרשאה לערוך משימה זו.</p>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            כותרת
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs text-gray-600">
              סטטוס
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={fieldClass}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-600">
              עדיפות
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className={fieldClass}>
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs text-gray-600">
              משך (שעות)
              <input
                type="number"
                min={0}
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-600">
              תאריך יעד
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={fieldClass} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs text-gray-600">
              עובד שטח אחראי
              <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={fieldClass}>
                <option value="">לא משויך</option>
                {workers.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-600">
              מקצוע
              <select value={trade} onChange={(e) => setTrade(e.target.value)} className={fieldClass}>
                <option value="">ללא</option>
                {TRADES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Dependencies */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-gray-600">משימות קודמות (תלות)</span>
            {dependsOn.length === 0 ? (
              <p className="text-xs text-gray-400">אין תלויות</p>
            ) : (
              <div className="flex flex-col gap-1">
                {dependsOn.map((depId) => (
                  <div
                    key={depId}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs"
                  >
                    <span className="truncate">{titleById.get(depId) ?? "משימה"}</span>
                    <button
                      type="button"
                      onClick={() => setDependsOn((prev) => prev.filter((d) => d !== depId))}
                      className="text-red-600 hover:text-red-700"
                    >
                      הסר
                    </button>
                  </div>
                ))}
              </div>
            )}
            {depCandidates.length > 0 && (
              <div className="flex items-center gap-1.5">
                <select value={addDep} onChange={(e) => setAddDep(e.target.value)} className={fieldClass}>
                  <option value="">הוסף תלות...</option>
                  {depCandidates.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (addDep) {
                      setDependsOn((prev) => [...prev, addDep]);
                      setAddDep("");
                    }
                  }}
                  disabled={!addDep}
                  className="shrink-0 rounded-lg border border-gray-300 px-2 py-1.5 text-xs hover:bg-gray-100 disabled:opacity-50"
                >
                  הוסף
                </button>
              </div>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-white px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? "שומר..." : "שמור שינויים"}
            </button>
            <button
              type="button"
              onClick={onOpenFull}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
            >
              פתח
            </button>
          </div>

          {confirmDelete ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs">
              <span className="flex-1 text-red-700">למחוק את המשימה?</span>
              <button type="button" onClick={handleDelete} disabled={saving} className="rounded bg-red-600 px-2 py-1 text-white">
                כן, מחק
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="rounded border border-gray-300 px-2 py-1">
                ביטול
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              מחק משימה
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add task dialog
// ---------------------------------------------------------------------------

function AddTaskDialog({
  projectId,
  tasks,
  onClose,
  onCreated,
  onError,
}: {
  projectId: string;
  tasks: GraphTask[];
  onClose: () => void;
  onCreated: () => void;
  onError: (msg: string | null) => void;
}) {
  const [title, setTitle] = useState("");
  const [durationHours, setDurationHours] = useState("");
  const [predecessor, setPredecessor] = useState("");
  const [busy, setBusy] = useState(false);

  const fieldClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    onError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: title.trim(),
          type: "single",
          durationHours: durationHours ? Number(durationHours) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? "שגיאה ביצירת המשימה");
        return;
      }
      // Link a prerequisite if one was chosen.
      if (predecessor && data.task?._id) {
        await fetch(`/api/tasks/${data.task._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dependsOn: [predecessor] }),
        });
      }
      onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-3 rounded-xl bg-white p-5 shadow-xl"
        dir="rtl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">משימה חדשה</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">
            ×
          </button>
        </div>

        <label className="flex flex-col gap-1 text-xs text-gray-600">
          כותרת
          <input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          משך (שעות)
          <input
            type="number"
            min={0}
            value={durationHours}
            onChange={(e) => setDurationHours(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          משימה קודמת (אופציונלי)
          <select value={predecessor} onChange={(e) => setPredecessor(e.target.value)} className={fieldClass}>
            <option value="">ללא</option>
            {tasks.map((t) => (
              <option key={t._id} value={t._id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="mt-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {busy ? "יוצר..." : "צור משימה"}
        </button>
      </form>
    </div>
  );
}
