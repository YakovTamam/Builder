import Project from "@/models/Project";
import Task from "@/models/Task";
import TaskCollaborator, { type COLLABORATOR_PERMISSIONS } from "@/models/TaskCollaborator";
import type { SessionPayload } from "@/lib/auth";

export const MANAGE_ROLES = ["super_admin", "company_admin", "project_manager"];

// The laborer role: field workers see only the tasks assigned to them and the
// projects those tasks belong to.
export const WORKER_ROLE = "field_worker";

export type TaskPermission = (typeof COLLABORATOR_PERMISSIONS)[number] | "edit";

// Compare a Mongo id (ObjectId, string, or anything with toString) to a session
// id string, safely handling null/undefined.
function idEquals(value: unknown, id: string | undefined): boolean {
  return value != null && id != null && String(value) === id;
}

// ---------------------------------------------------------------------------
// Pure decision logic (no DB). These are the security-critical rules; keeping
// them pure lets us unit-test every role × ownership combination. Callers are
// responsible for having already scoped the document to the session's company
// (every getter below loads with a `companyId` filter first).
// ---------------------------------------------------------------------------

export type ProjectAccessDecision = "ok" | "denied" | "needs_task_check";

// Decide project access for a project already confirmed to be in the session's
// company. "needs_task_check" means the caller must verify the field worker has
// an assigned task in the project (a DB lookup the pure layer can't do).
export function resolveProjectAccess(
  session: SessionPayload,
  project: { managerId?: unknown },
): ProjectAccessDecision {
  if (session.role === "project_manager") {
    return idEquals(project.managerId, session.sub) ? "ok" : "denied";
  }
  if (session.role === WORKER_ROLE) {
    return "needs_task_check";
  }
  return "ok";
}

// Decide the caller's permission on a task, given the task, its project (both
// already confirmed to be in the session's company), and the caller's
// collaborator record if one was loaded. Returns null when access is denied.
export function resolveTaskPermission(
  session: SessionPayload,
  task: { assignedTo?: unknown },
  project: { managerId?: unknown },
  collaborator: { permission: string } | null,
): TaskPermission | null {
  if (session.role === "project_manager" && !idEquals(project.managerId, session.sub)) {
    return null;
  }
  if (session.role === WORKER_ROLE) {
    return idEquals(task.assignedTo, session.sub) ? "edit" : null;
  }
  if (session.role === "consultant" || session.role === "client") {
    return collaborator ? (collaborator.permission as TaskPermission) : null;
  }
  return "edit";
}

// Build the project-list query filter for a session. Always scoped to the
// session's company; project managers see only their projects, and field
// workers are narrowed to the given set of project ids.
export function projectListFilter(session: SessionPayload) {
  const filter: Record<string, unknown> = { companyId: session.companyId };
  if (session.role === "project_manager") {
    filter.managerId = session.sub;
  }
  return filter;
}

export function buildAccessibleProjectFilter(
  session: SessionPayload,
  workerIds: string[],
): Record<string, unknown> {
  const filter = projectListFilter(session);
  if (session.role === WORKER_ROLE) {
    filter._id = { $in: workerIds };
  }
  return filter;
}

// ---------------------------------------------------------------------------
// DB-backed accessors (thin: load with a company filter, then apply the pure
// rules above).
// ---------------------------------------------------------------------------

// Distinct ids of projects in which this field worker has at least one assigned
// task. Used to scope every project listing a worker can see.
export async function workerProjectIds(session: SessionPayload): Promise<string[]> {
  const ids = await Task.distinct("projectId", { assignedTo: session.sub });
  return ids.map((id) => String(id));
}

export async function getAccessibleProject(projectId: string, session: SessionPayload) {
  const project = await Project.findOne({ _id: projectId, companyId: session.companyId });
  if (!project) return null;

  const decision = resolveProjectAccess(session, project);
  if (decision === "denied") return null;
  if (decision === "needs_task_check") {
    const assigned = await Task.exists({ projectId: project._id, assignedTo: session.sub });
    if (!assigned) return null;
  }

  return project;
}

// Async project filter that also scopes field workers to the projects that hold
// their assigned tasks. Prefer this over projectListFilter wherever a worker
// might be the viewer.
export async function accessibleProjectFilter(
  session: SessionPayload,
): Promise<Record<string, unknown>> {
  const workerIds = session.role === WORKER_ROLE ? await workerProjectIds(session) : [];
  return buildAccessibleProjectFilter(session, workerIds);
}

export async function getAccessibleTask(id: string, session: SessionPayload) {
  const task = await Task.findById(id);
  if (!task) return null;

  const project = await Project.findOne({ _id: task.projectId, companyId: session.companyId });
  if (!project) return null;

  // Only consultants/clients depend on a collaborator record — avoid the extra
  // query for everyone else.
  let collaborator: { permission: string } | null = null;
  if (session.role === "consultant" || session.role === "client") {
    collaborator = await TaskCollaborator.findOne({ taskId: id, userId: session.sub });
  }

  const permission = resolveTaskPermission(session, task, project, collaborator);
  if (!permission) return null;

  return { task, project, permission };
}
