import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAccessibleProject, MANAGE_ROLES } from "@/lib/access";
import Material, { MATERIAL_STATUSES } from "@/models/Material";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  await connectToDatabase();

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "יש לבחור פרויקט" }, { status: 400 });
  }

  const project = await getAccessibleProject(projectId, session);
  if (!project) {
    return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
  }

  const materials = await Material.find({ projectId }).sort({ createdAt: -1 }).lean();

  return NextResponse.json({ materials });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !MANAGE_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await connectToDatabase();

  const body = await request.json();
  const { projectId, name, quantity, unit, unitCost, supplier, status, expectedDate, taskId, notes } =
    body as {
      projectId?: string;
      name?: string;
      quantity?: number;
      unit?: string;
      unitCost?: number;
      supplier?: string;
      status?: string;
      expectedDate?: string;
      taskId?: string;
      notes?: string;
    };

  if (!projectId || !name || quantity === undefined) {
    return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
  }

  const project = await getAccessibleProject(projectId, session);
  if (!project) {
    return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
  }

  if (status && !MATERIAL_STATUSES.includes(status as (typeof MATERIAL_STATUSES)[number])) {
    return NextResponse.json({ error: "סטטוס לא תקין" }, { status: 400 });
  }

  const material = await Material.create({
    projectId,
    name,
    quantity,
    unit,
    unitCost,
    supplier,
    status: status ?? "ordered",
    expectedDate: expectedDate ? new Date(expectedDate) : undefined,
    taskId: taskId || undefined,
    notes,
  });

  return NextResponse.json({ material });
}
