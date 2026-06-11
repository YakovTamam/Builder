import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import Company from "@/models/Company";
import User from "@/models/User";
import Project from "@/models/Project";

const ADMIN_ROLES = ["super_admin", "company_admin"];

export async function GET() {
  const session = await getSession();
  if (!session || !ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await connectToDatabase();

  const company = await Company.findById(session.companyId).lean();
  if (!company) {
    return NextResponse.json({ error: "חברה לא נמצאה" }, { status: 404 });
  }

  const [usersCount, projectsCount] = await Promise.all([
    User.countDocuments({ companyId: session.companyId }),
    Project.countDocuments({ companyId: session.companyId }),
  ]);

  return NextResponse.json({ company, usersCount, projectsCount });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || !ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await connectToDatabase();

  const body = await request.json();
  const { name } = body as { name?: string };

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "שם חברה חסר" }, { status: 400 });
  }

  const company = await Company.findByIdAndUpdate(session.companyId, { name: name.trim() }, { new: true });
  if (!company) {
    return NextResponse.json({ error: "חברה לא נמצאה" }, { status: 404 });
  }

  return NextResponse.json({ company });
}
