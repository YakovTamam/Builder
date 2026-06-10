import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAccessibleProject, getAccessibleTask } from "@/lib/access";
import Photo from "@/models/Photo";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  await connectToDatabase();

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const taskId = searchParams.get("taskId");

  if (!projectId) {
    return NextResponse.json({ error: "יש לבחור פרויקט" }, { status: 400 });
  }

  const project = await getAccessibleProject(projectId, session);
  if (!project) {
    return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
  }

  const filter: Record<string, unknown> = { projectId };
  if (taskId) filter.taskId = taskId;

  const photos = await Photo.find(filter)
    .populate("uploadedBy", "name")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ photos });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  await connectToDatabase();

  const body = await request.json();
  const { projectId, taskId, url, tags, stage, location } = body as {
    projectId?: string;
    taskId?: string;
    url?: string;
    tags?: string[];
    stage?: string;
    location?: string;
  };

  if (!projectId || !url) {
    return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
  }

  const project = await getAccessibleProject(projectId, session);
  if (!project) {
    return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
  }

  if (taskId) {
    const taskResult = await getAccessibleTask(taskId, session);
    if (!taskResult || taskResult.permission === "view") {
      return NextResponse.json({ error: "אין הרשאה להעלות תמונה למשימה זו" }, { status: 403 });
    }
  }

  const photo = await Photo.create({
    projectId,
    taskId: taskId || undefined,
    uploadedBy: session.sub,
    url,
    tags: tags ?? [],
    stage,
    location,
  });
  await photo.populate("uploadedBy", "name");

  return NextResponse.json({ photo });
}
