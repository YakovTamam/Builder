import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAccessibleProject, MANAGE_ROLES } from "@/lib/access";
import Equipment, { EQUIPMENT_OWNERSHIP, EQUIPMENT_STATUSES } from "@/models/Equipment";

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

  const equipment = await Equipment.find({ projectId }).sort({ startDate: 1, createdAt: -1 }).lean();

  // Company-wide bookings of the same machines, so the board can flag a machine
  // that is double-booked to another project.
  const companyEquipment = await Equipment.find({ companyId: session.companyId })
    .select("name projectId startDate endDate")
    .lean();

  return NextResponse.json({ equipment, companyEquipment });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !MANAGE_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await connectToDatabase();

  const body = await request.json();
  const { projectId, name, category, ownership, supplier, cost, status, startDate, endDate, taskId, notes } =
    body as {
      projectId?: string;
      name?: string;
      category?: string;
      ownership?: string;
      supplier?: string;
      cost?: number;
      status?: string;
      startDate?: string;
      endDate?: string;
      taskId?: string;
      notes?: string;
    };

  if (!projectId || !name) {
    return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
  }

  const project = await getAccessibleProject(projectId, session);
  if (!project) {
    return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
  }

  if (status && !EQUIPMENT_STATUSES.includes(status as (typeof EQUIPMENT_STATUSES)[number])) {
    return NextResponse.json({ error: "סטטוס לא תקין" }, { status: 400 });
  }
  if (ownership && !EQUIPMENT_OWNERSHIP.includes(ownership as (typeof EQUIPMENT_OWNERSHIP)[number])) {
    return NextResponse.json({ error: "בעלות לא תקינה" }, { status: 400 });
  }

  const equipment = await Equipment.create({
    companyId: session.companyId,
    projectId,
    name,
    category,
    ownership: ownership ?? "owned",
    supplier,
    cost,
    status: status ?? "scheduled",
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    taskId: taskId || undefined,
    notes,
  });

  return NextResponse.json({ equipment });
}
