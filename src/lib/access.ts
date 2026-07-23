import Project from "@/models/Project";
import Task from "@/models/Task";
import TaskCollaborator, { type COLLABORATOR_PERMISSIONS } from "@/models/TaskCollaborator";
import type { SessionPayload } from "@/lib/auth";

export const MANAGE_ROLES = ["super_admin", "company_admin", "project_manager"];

// The laborer role: field workers see only the tasks assigned to them and the
// projects those tasks belong to.
export const WORKER_ROLE = "field_worker";

// Distinct ids of projects in which this field worker has at least one assigned
// task. Used to scope every project listing a worker can see.
export async function workerProjectIds(session: SessionPayload): Promise<string[]> {
  const ids = await Task.distinct("projectId", { assignedTo: session.sub });
  return ids.map((id) => String(id));
}

export async function getAccessibleProject(projectId: string, session: SessionPayload) {
  const project = await Project.findOne({ _id: projectId, companyId: session.companyId });
  if (!project) return null;

  if (session.role === "project_manager" && project.managerId?.toString() !== session.sub) {
    return null;
  }

  if (session.role === WORKER_ROLE) {
    const assigned = await Task.exists({ projectId: project._id, assignedTo: session.sub });
    if (!assigned) return null;
  }

  return project;
}

export function projectListFilter(session: SessionPayload) {
  const filter: Record<string, unknown> = { companyId: session.companyId };
  if (session.role === "project_manager") {
    filter.managerId = session.sub;
  }
  return filter;
}

// Async project filter that also scopes field workers to the projects that hold
// their assigned tasks. Prefer this over projectListFilter wherever a worker
// might be the viewer.
export async function accessibleProjectFilter(
  session: SessionPayload,
): Promise<Record<string, unknown>> {
  const filter = projectListFilter(session);
  if (session.role === WORKER_ROLE) {
    filter._id = { $in: await workerProjectIds(session) };
  }
  return filter;
}

type TaskPermission = (typeof COLLABORATOR_PERMISSIONS)[number] | "edit";

export async function getAccessibleTask(id: string, session: SessionPayload) {
  const task = await Task.findById(id);
  if (!task) return null;

  const project = await Project.findOne({ _id: task.projectId, companyId: session.companyId });
  if (!project) return null;

  if (session.role === "project_manager" && project.managerId?.toString() !== session.sub) {
    return null;
  }

  // Field workers may only touch tasks explicitly assigned to them.
  if (session.role === WORKER_ROLE) {
    if (task.assignedTo?.toString() !== session.sub) return null;
    return { task, project, permission: "edit" as TaskPermission };
  }

  if (["consultant", "client"].includes(session.role)) {
    const collaborator = await TaskCollaborator.findOne({ taskId: id, userId: session.sub });
    if (!collaborator) return null;
    return { task, project, permission: collaborator.permission as TaskPermission };
  }

  return { task, project, permission: "edit" as TaskPermission };
}
