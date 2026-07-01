import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import Project from "@/models/Project";
import Task, { TASK_PRIORITIES, TASK_TYPES } from "@/models/Task";

const MANAGE_ROLES = ["super_admin", "company_admin", "project_manager"];

const HOURS_PER_DAY = 8;

async function loadAccessibleProject(
  projectId: string,
  session: { companyId?: string; role: string; sub: string },
) {
  const project = await Project.findOne({ _id: projectId, companyId: session.companyId });
  if (!project) return null;

  if (session.role === "project_manager" && project.managerId?.toString() !== session.sub) {
    return null;
  }

  return project;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  await connectToDatabase();

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "חסר projectId" }, { status: 400 });
  }

  const project = await loadAccessibleProject(projectId, session);
  if (!project) {
    return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
  }

  const tasks = await Task.find({ projectId }).sort({ sequenceOrder: 1, createdAt: 1 }).lean();

  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !MANAGE_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await connectToDatabase();

  const body = await request.json();
  const {
    projectId,
    title,
    description,
    priority,
    dueDate,
    stage,
    type,
    durationHours,
    sequenceItems,
    checklist,
  } = body as {
    projectId?: string;
    title?: string;
    description?: string;
    priority?: string;
    dueDate?: string;
    stage?: string;
    type?: string;
    durationHours?: number;
    sequenceItems?: { title: string; durationHours?: number }[];
    checklist?: { text: string; done?: boolean }[];
  };

  if (!projectId || !title) {
    return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
  }

  const project = await loadAccessibleProject(projectId, session);
  if (!project) {
    return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
  }

  if (priority && !TASK_PRIORITIES.includes(priority as (typeof TASK_PRIORITIES)[number])) {
    return NextResponse.json({ error: "עדיפות לא תקינה" }, { status: 400 });
  }

  const taskType = (type ?? "single") as (typeof TASK_TYPES)[number];
  if (!TASK_TYPES.includes(taskType)) {
    return NextResponse.json({ error: "סוג משימה לא תקין" }, { status: 400 });
  }

  const task = await Task.create({
    projectId,
    title,
    description,
    priority: priority ?? "medium",
    dueDate: dueDate ? new Date(dueDate) : undefined,
    stage,
    type: taskType,
    durationHours,
    checklist: (checklist ?? []).map((item) => ({ text: item.text, done: !!item.done })),
  });

  // For "sequence" tasks, generate the chain of follow-up tasks.
  // Each child's due date is offset from the previous one by the
  // previous task's duration, converted to working days.
  if (taskType === "sequence" && Array.isArray(sequenceItems) && sequenceItems.length > 0) {
    let cursor = task.dueDate ? new Date(task.dueDate) : new Date();
    const childDocs = sequenceItems.map((item, index) => {
      const prevDuration = index === 0 ? (durationHours ?? 0) : (sequenceItems[index - 1].durationHours ?? 0);
      const offsetDays = Math.max(1, Math.ceil(prevDuration / HOURS_PER_DAY));
      cursor = new Date(cursor.getTime() + offsetDays * 24 * 60 * 60 * 1000);

      return {
        projectId,
        title: item.title,
        priority: "medium",
        type: "single" as const,
        durationHours: item.durationHours,
        dueDate: new Date(cursor),
        parentTaskId: task._id,
        sequenceOrder: index + 1,
      };
    });

    await Task.insertMany(childDocs);
  }

  return NextResponse.json({ task });
}
