import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAccessibleProject, MANAGE_ROLES } from "@/lib/access";
import TaskTemplate from "@/models/TaskTemplate";
import Task from "@/models/Task";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !MANAGE_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await connectToDatabase();

  const body = await request.json();
  const { projectId, templateId } = body as { projectId?: string; templateId?: string };

  if (!projectId || !templateId) {
    return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
  }

  const project = await getAccessibleProject(projectId, session);
  if (!project) {
    return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
  }

  const template = await TaskTemplate.findOne({ _id: templateId, companyId: session.companyId }).lean();
  if (!template) {
    return NextResponse.json({ error: "תבנית לא נמצאה" }, { status: 404 });
  }

  const tasks = await Task.insertMany(
    template.items.map((item: {
      title: string;
      description?: string;
      priority?: string;
      durationHours?: number;
      workersCount?: number;
      checklist?: string[];
    }) => ({
      projectId,
      title: item.title,
      description: item.description,
      priority: item.priority ?? "medium",
      type: "single" as const,
      durationHours: item.durationHours,
      workersCount: item.workersCount,
      checklist: (item.checklist ?? []).map((text) => ({ text, done: false })),
    })),
  );

  return NextResponse.json({ tasks });
}
