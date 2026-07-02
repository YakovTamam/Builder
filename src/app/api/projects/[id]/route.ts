import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import Project, { PROJECT_STATUSES } from "@/models/Project";
import { sanitizeLocations } from "@/lib/locations";

const MANAGE_ROLES = ["super_admin", "company_admin", "project_manager"];

async function loadProject(id: string, session: { companyId?: string; role: string; sub: string }) {
  const project = await Project.findOne({ _id: id, companyId: session.companyId });
  if (!project) return null;

  if (session.role === "project_manager" && project.managerId?.toString() !== session.sub) {
    return null;
  }

  return project;
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
  const project = await loadProject(id, session);

  if (!project) {
    return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !MANAGE_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await connectToDatabase();
  const { id } = await params;
  const project = await loadProject(id, session);

  if (!project) {
    return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
  }

  const body = await request.json();
  const { name, address, status, progress, budget, startDate, dueDate, locations } = body as {
    name?: string;
    address?: string;
    status?: string;
    progress?: number;
    budget?: number;
    startDate?: string;
    dueDate?: string;
    locations?: unknown;
  };

  if (status && !PROJECT_STATUSES.includes(status as (typeof PROJECT_STATUSES)[number])) {
    return NextResponse.json({ error: "סטטוס לא תקין" }, { status: 400 });
  }

  if (name !== undefined) project.name = name;
  if (address !== undefined) project.address = address;
  if (status !== undefined) project.status = status as (typeof PROJECT_STATUSES)[number];
  if (progress !== undefined) project.progress = Math.min(100, Math.max(0, progress));
  if (budget !== undefined) project.budget = budget;
  if (startDate !== undefined) project.startDate = startDate ? new Date(startDate) : undefined;
  if (dueDate !== undefined) project.dueDate = dueDate ? new Date(dueDate) : undefined;
  if (locations !== undefined) project.locations = sanitizeLocations(locations);

  await project.save();

  return NextResponse.json({ project });
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
  const project = await loadProject(id, session);

  if (!project) {
    return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
  }

  await project.deleteOne();

  return NextResponse.json({ ok: true });
}
