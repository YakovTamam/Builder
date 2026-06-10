import Project from "@/models/Project";
import Task from "@/models/Task";
import TaskCollaborator, { type COLLABORATOR_PERMISSIONS } from "@/models/TaskCollaborator";
import type { SessionPayload } from "@/lib/auth";

export const MANAGE_ROLES = ["super_admin", "company_admin", "project_manager"];

export async function getAccessibleProject(projectId: string, session: SessionPayload) {
  const project = await Project.findOne({ _id: projectId, companyId: session.companyId });
  if (!project) return null;

  if (session.role === "project_manager" && project.managerId?.toString() !== session.sub) {
    return null;
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

type TaskPermission = (typeof COLLABORATOR_PERMISSIONS)[number] | "edit";

export async function getAccessibleTask(id: string, session: SessionPayload) {
  const task = await Task.findById(id);
  if (!task) return null;

  const project = await Project.findOne({ _id: task.projectId, companyId: session.companyId });
  if (!project) return null;

  if (session.role === "project_manager" && project.managerId?.toString() !== session.sub) {
    return null;
  }

  if (["consultant", "client"].includes(session.role)) {
    const collaborator = await TaskCollaborator.findOne({ taskId: id, userId: session.sub });
    if (!collaborator) return null;
    return { task, project, permission: collaborator.permission as TaskPermission };
  }

  return { task, project, permission: "edit" as TaskPermission };
}
