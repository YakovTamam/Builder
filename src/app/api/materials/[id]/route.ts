import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAccessibleProject, MANAGE_ROLES } from "@/lib/access";
import Material, { MATERIAL_STATUSES } from "@/models/Material";

async function loadAccessibleMaterial(id: string, session: Parameters<typeof getAccessibleProject>[1]) {
  const material = await Material.findById(id);
  if (!material) return null;

  const project = await getAccessibleProject(String(material.projectId), session);
  if (!project) return null;

  return material;
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
  const material = await loadAccessibleMaterial(id, session);

  if (!material) {
    return NextResponse.json({ error: "פריט לא נמצא" }, { status: 404 });
  }

  const body = await request.json();
  const { name, quantity, unit, unitCost, supplier, status, expectedDate, taskId, notes } = body as {
    name?: string;
    quantity?: number;
    unit?: string;
    unitCost?: number;
    supplier?: string;
    status?: string;
    expectedDate?: string;
    taskId?: string | null;
    notes?: string;
  };

  if (status !== undefined) {
    if (!MATERIAL_STATUSES.includes(status as (typeof MATERIAL_STATUSES)[number])) {
      return NextResponse.json({ error: "סטטוס לא תקין" }, { status: 400 });
    }
    material.status = status as (typeof MATERIAL_STATUSES)[number];
  }

  if (!MANAGE_ROLES.includes(session.role) && Object.keys(body).some((key) => key !== "status")) {
    return NextResponse.json({ error: "אין הרשאה לעדכן שדות אלו" }, { status: 403 });
  }

  if (name !== undefined) material.name = name;
  if (quantity !== undefined) material.quantity = quantity;
  if (unit !== undefined) material.unit = unit;
  if (unitCost !== undefined) material.unitCost = unitCost;
  if (supplier !== undefined) material.supplier = supplier;
  if (expectedDate !== undefined) material.expectedDate = expectedDate ? new Date(expectedDate) : undefined;
  if (taskId !== undefined) material.taskId = taskId || undefined;
  if (notes !== undefined) material.notes = notes;

  await material.save();

  return NextResponse.json({ material });
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
  const material = await loadAccessibleMaterial(id, session);

  if (!material) {
    return NextResponse.json({ error: "פריט לא נמצא" }, { status: 404 });
  }

  await material.deleteOne();

  return NextResponse.json({ ok: true });
}
