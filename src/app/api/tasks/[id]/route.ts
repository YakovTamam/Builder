import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import Project from "@/models/Project";
import Task, { TASK_PRIORITIES, TASK_STATUSES } from "@/models/Task";

const MANAGE_ROLES = ["super_admin", "company_admin", "project_manager"];

async function loadAccessibleTask(id: string, session: { companyId?: string; role: string; sub: string }) {
  const task = await Task.findById(id);
  if (!task) return null;

  const project = await Project.findOne({ _id: task.projectId, companyId: session.companyId });
  if (!project) return null;

  if (session.role === "project_manager" && project.managerId?.toString() !== session.sub) {
    return null;
  }

  return { task, project };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  await connectToDatabase();
  const { id } = await params;
  const result = await loadAccessibleTask(id, session);

  if (!result) {
    return NextResponse.json({ error: "משימה לא נמצאה" }, { status: 404 });
  }

  const children = await Task.find({ parentTaskId: id }).sort({ sequenceOrder: 1 }).lean();

  return NextResponse.json({ task: result.task, children });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  await connectToDatabase();
  const { id } = await params;
  const result = await loadAccessibleTask(id, session);

  if (!result) {
    return NextResponse.json({ error: "משימה לא נמצאה" }, { status: 404 });
  }

  const { task } = result;
  const isManager = MANAGE_ROLES.includes(session.role);

  const body = await request.json();
  const { title, description, status, priority, dueDate, stage, durationHours, workersCount } = body as {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    stage?: string;
    durationHours?: number;
    workersCount?: number;
  };

  if (status !== undefined) {
    if (!TASK_STATUSES.includes(status as (typeof TASK_STATUSES)[number])) {
      return NextResponse.json({ error: "סטטוס לא תקין" }, { status: 400 });
    }
    task.status = status as (typeof TASK_STATUSES)[number];
  }

  // Only project managers/admins can edit the task definition itself.
  if (isManager) {
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) {
      if (!TASK_PRIORITIES.includes(priority as (typeof TASK_PRIORITIES)[number])) {
        return NextResponse.json({ error: "עדיפות לא תקינה" }, { status: 400 });
      }
      task.priority = priority as (typeof TASK_PRIORITIES)[number];
    }
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (stage !== undefined) task.stage = stage;
    if (durationHours !== undefined) task.durationHours = durationHours;
    if (workersCount !== undefined) task.workersCount = workersCount;
  }

  await task.save();

  return NextResponse.json({ task });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !MANAGE_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await connectToDatabase();
  const { id } = await params;
  const result = await loadAccessibleTask(id, session);

  if (!result) {
    return NextResponse.json({ error: "משימה לא נמצאה" }, { status: 404 });
  }

  await Task.deleteMany({ $or: [{ _id: id }, { parentTaskId: id }] });

  return NextResponse.json({ ok: true });
}
