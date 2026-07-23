import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import Project, { PROJECT_STATUSES } from "@/models/Project";
import { sanitizeLocations } from "@/lib/locations";
import { parseCoordinates } from "@/lib/waze";
import { accessibleProjectFilter, MANAGE_ROLES } from "@/lib/access";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  await connectToDatabase();

  const filter = await accessibleProjectFilter(session);
  const projects = await Project.find(filter).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !MANAGE_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await connectToDatabase();

  const body = await request.json();
  const { name, address, lat, lng, status, budget, startDate, dueDate, locations } = body as {
    name?: string;
    address?: string;
    lat?: unknown;
    lng?: unknown;
    status?: string;
    budget?: number;
    startDate?: string;
    dueDate?: string;
    locations?: unknown;
  };

  if (!name) {
    return NextResponse.json({ error: "שם הפרויקט הוא שדה חובה" }, { status: 400 });
  }

  if (status && !PROJECT_STATUSES.includes(status as (typeof PROJECT_STATUSES)[number])) {
    return NextResponse.json({ error: "סטטוס לא תקין" }, { status: 400 });
  }

  const coords = parseCoordinates(lat, lng);
  if (coords === "invalid") {
    return NextResponse.json({ error: "קואורדינטות לא תקינות" }, { status: 400 });
  }

  const project = await Project.create({
    companyId: session.companyId,
    name,
    address,
    lat: coords?.lat,
    lng: coords?.lng,
    status: status ?? "planning",
    budget,
    startDate: startDate ? new Date(startDate) : undefined,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    locations: locations !== undefined ? sanitizeLocations(locations) : undefined,
    managerId: session.sub,
    progress: 0,
  });

  return NextResponse.json({ project });
}
