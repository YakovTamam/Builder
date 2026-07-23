import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAccessibleProject, MANAGE_ROLES } from "@/lib/access";
import Equipment, { EQUIPMENT_OWNERSHIP, EQUIPMENT_STATUSES } from "@/models/Equipment";

async function loadAccessibleEquipment(id: string, session: Parameters<typeof getAccessibleProject>[1]) {
  const equipment = await Equipment.findById(id);
  if (!equipment) return null;

  const project = await getAccessibleProject(String(equipment.projectId), session);
  if (!project) return null;

  return equipment;
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
  const equipment = await loadAccessibleEquipment(id, session);

  if (!equipment) {
    return NextResponse.json({ error: "פריט לא נמצא" }, { status: 404 });
  }

  const body = await request.json();
  const { name, category, ownership, supplier, cost, status, startDate, endDate, taskId, notes } = body as {
    name?: string;
    category?: string;
    ownership?: string;
    supplier?: string;
    cost?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    taskId?: string | null;
    notes?: string;
  };

  if (status !== undefined) {
    if (!EQUIPMENT_STATUSES.includes(status as (typeof EQUIPMENT_STATUSES)[number])) {
      return NextResponse.json({ error: "סטטוס לא תקין" }, { status: 400 });
    }
    equipment.status = status as (typeof EQUIPMENT_STATUSES)[number];
  }

  // Non-managers may only move the status (e.g. mark a machine as on-site).
  if (!MANAGE_ROLES.includes(session.role) && Object.keys(body).some((key) => key !== "status")) {
    return NextResponse.json({ error: "אין הרשאה לעדכן שדות אלו" }, { status: 403 });
  }

  if (ownership !== undefined) {
    if (!EQUIPMENT_OWNERSHIP.includes(ownership as (typeof EQUIPMENT_OWNERSHIP)[number])) {
      return NextResponse.json({ error: "בעלות לא תקינה" }, { status: 400 });
    }
    equipment.ownership = ownership as (typeof EQUIPMENT_OWNERSHIP)[number];
  }
  if (name !== undefined) equipment.name = name;
  if (category !== undefined) equipment.category = category;
  if (supplier !== undefined) equipment.supplier = supplier;
  if (cost !== undefined) equipment.cost = cost;
  if (startDate !== undefined) equipment.startDate = startDate ? new Date(startDate) : undefined;
  if (endDate !== undefined) equipment.endDate = endDate ? new Date(endDate) : undefined;
  if (taskId !== undefined) equipment.taskId = taskId || undefined;
  if (notes !== undefined) equipment.notes = notes;

  await equipment.save();

  return NextResponse.json({ equipment });
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
  const equipment = await loadAccessibleEquipment(id, session);

  if (!equipment) {
    return NextResponse.json({ error: "פריט לא נמצא" }, { status: 404 });
  }

  await equipment.deleteOne();

  return NextResponse.json({ ok: true });
}
