// Critical Path Method (CPM) for the project task graph.
//
// The task graph is a DAG: an edge Y -> X means "Y must finish before X can
// start". This is stored as X.dependsOn = [Y]. Given each task's duration we
// compute, for every task, the earliest/latest it can start and finish, its
// slack ("float"), and whether it sits on the critical path (float == 0).
//
// This module is intentionally pure (no DB, no React) so it can run on the
// server or the client and be unit-reasoned about in isolation.

const HOURS_PER_DAY = 8;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Durations are usually whole hours, but guard against float noise so a task
// that is a rounding artifact away from zero slack still reads as critical.
const FLOAT_EPSILON = 1e-6;

export type CpmTaskInput = {
  id: string;
  durationHours?: number | null;
  // IDs of tasks that must complete before this one starts.
  dependsOn?: string[];
};

export type CpmTaskResult = {
  id: string;
  durationHours: number;
  earliestStartHours: number;
  earliestFinishHours: number;
  latestStartHours: number;
  latestFinishHours: number;
  floatHours: number;
  isCritical: boolean;
  // Calendar dates, present only when a project start date was supplied.
  startDate?: Date;
  finishDate?: Date;
};

export type CpmResult = {
  tasks: Record<string, CpmTaskResult>;
  projectDurationHours: number;
  criticalTaskIds: string[];
  // True when the dependency graph contains a cycle. When set, scheduling
  // fields are not meaningful and callers should surface a warning instead.
  hasCycle: boolean;
  cycleTaskIds: string[];
};

type Graph = {
  ids: string[];
  // The duration reported back to callers (0 when unset/invalid - the real,
  // literal value the user entered, or lack thereof).
  duration: Map<string, number>;
  // The duration actually used for the forward/backward pass. A task with no
  // duration entered at all falls back to 1 hour here (not 0): a graph where
  // every task is unestimated would otherwise make every path length 0,
  // giving every task zero float and marking the whole graph "critical" -
  // the degenerate case that made ordinary branches render as if they were
  // on the trunk. A task with an *explicit* non-positive duration (e.g. a
  // zero-length milestone) is left at 0, since that's a deliberate value.
  weight: Map<string, number>;
  // predecessors[x] = tasks that must finish before x (x.dependsOn, filtered).
  predecessors: Map<string, string[]>;
  // successors[y] = tasks that depend on y.
  successors: Map<string, string[]>;
};

function buildGraph(tasks: CpmTaskInput[]): Graph {
  const ids = tasks.map((t) => t.id);
  const idSet = new Set(ids);

  const duration = new Map<string, number>();
  const weight = new Map<string, number>();
  const predecessors = new Map<string, string[]>();
  const successors = new Map<string, string[]>();

  for (const id of ids) {
    predecessors.set(id, []);
    successors.set(id, []);
  }

  for (const task of tasks) {
    const hasExplicitDuration = typeof task.durationHours === "number" && !Number.isNaN(task.durationHours);
    const dur = hasExplicitDuration && task.durationHours! > 0 ? task.durationHours! : 0;
    duration.set(task.id, dur);
    weight.set(task.id, hasExplicitDuration ? dur : 1);

    // Ignore self-references and edges to tasks outside this set (e.g. deleted
    // or cross-project dangling refs) so the graph stays well-formed.
    const preds = (task.dependsOn ?? []).filter((p) => p !== task.id && idSet.has(p));
    for (const pred of preds) {
      predecessors.get(task.id)!.push(pred);
      successors.get(pred)!.push(task.id);
    }
  }

  return { ids, duration, weight, predecessors, successors };
}

// Kahn's algorithm. Returns a topological order plus any ids left unresolved,
// which are exactly the tasks participating in (or blocked by) a cycle.
function topologicalSort(graph: Graph): { order: string[]; cycleTaskIds: string[] } {
  const indegree = new Map<string, number>();
  for (const id of graph.ids) {
    indegree.set(id, graph.predecessors.get(id)!.length);
  }

  const queue = graph.ids.filter((id) => indegree.get(id) === 0);
  const order: string[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const succ of graph.successors.get(id)!) {
      const next = indegree.get(succ)! - 1;
      indegree.set(succ, next);
      if (next === 0) queue.push(succ);
    }
  }

  const cycleTaskIds = order.length === graph.ids.length ? [] : graph.ids.filter((id) => !order.includes(id));
  return { order, cycleTaskIds };
}

/**
 * Compute the critical path schedule for a set of tasks.
 *
 * @param tasks     Task nodes with durations and dependency IDs.
 * @param startDate Optional project start; when given, each task also gets
 *                  calendar start/finish dates (continuous calendar days).
 */
export function computeCriticalPath(tasks: CpmTaskInput[], startDate?: Date | null): CpmResult {
  const graph = buildGraph(tasks);
  const empty: CpmResult = {
    tasks: {},
    projectDurationHours: 0,
    criticalTaskIds: [],
    hasCycle: false,
    cycleTaskIds: [],
  };

  if (graph.ids.length === 0) return empty;

  const { order, cycleTaskIds } = topologicalSort(graph);
  if (cycleTaskIds.length > 0) {
    return { ...empty, hasCycle: true, cycleTaskIds };
  }

  const earliestStart = new Map<string, number>();
  const earliestFinish = new Map<string, number>();

  // Forward pass: a task starts as soon as all its predecessors finish.
  for (const id of order) {
    const preds = graph.predecessors.get(id)!;
    const es = preds.reduce((max, p) => Math.max(max, earliestFinish.get(p) ?? 0), 0);
    const ef = es + graph.weight.get(id)!;
    earliestStart.set(id, es);
    earliestFinish.set(id, ef);
  }

  const projectDurationHours = graph.ids.reduce((max, id) => Math.max(max, earliestFinish.get(id) ?? 0), 0);

  const latestFinish = new Map<string, number>();
  const latestStart = new Map<string, number>();

  // Backward pass: a task must finish before the earliest of its successors
  // must start; tasks with no successors are bounded by the project duration.
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    const succs = graph.successors.get(id)!;
    const lf = succs.length === 0
      ? projectDurationHours
      : succs.reduce((min, s) => Math.min(min, latestStart.get(s) ?? projectDurationHours), Infinity);
    const ls = lf - graph.weight.get(id)!;
    latestFinish.set(id, lf);
    latestStart.set(id, ls);
  }

  const anchor = startDate ? new Date(startDate) : null;
  const toDate = (hours: number): Date | undefined => {
    if (!anchor) return undefined;
    return new Date(anchor.getTime() + (hours / HOURS_PER_DAY) * MS_PER_DAY);
  };

  const results: Record<string, CpmTaskResult> = {};
  const criticalTaskIds: string[] = [];

  for (const id of graph.ids) {
    const es = earliestStart.get(id)!;
    const ef = earliestFinish.get(id)!;
    const ls = latestStart.get(id)!;
    const lf = latestFinish.get(id)!;
    const floatHours = ls - es;
    const isCritical = Math.abs(floatHours) <= FLOAT_EPSILON;
    if (isCritical) criticalTaskIds.push(id);

    results[id] = {
      id,
      durationHours: graph.duration.get(id)!,
      earliestStartHours: es,
      earliestFinishHours: ef,
      latestStartHours: ls,
      latestFinishHours: lf,
      floatHours,
      isCritical,
      startDate: toDate(es),
      finishDate: toDate(ef),
    };
  }

  return { tasks: results, projectDurationHours, criticalTaskIds, hasCycle: false, cycleTaskIds: [] };
}

/**
 * Would adding "dependentId dependsOn prerequisiteId" create a cycle?
 *
 * That edge points prerequisiteId -> dependentId. It closes a loop only if the
 * dependent can already reach the prerequisite through existing edges, i.e. the
 * prerequisite is already a (transitive) successor of the dependent.
 */
export function wouldCreateCycle(
  tasks: CpmTaskInput[],
  dependentId: string,
  prerequisiteId: string,
): boolean {
  if (dependentId === prerequisiteId) return true;

  const graph = buildGraph(tasks);
  if (!graph.successors.has(dependentId)) return false;

  const stack = [dependentId];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === prerequisiteId) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const succ of graph.successors.get(current) ?? []) {
      stack.push(succ);
    }
  }
  return false;
}
