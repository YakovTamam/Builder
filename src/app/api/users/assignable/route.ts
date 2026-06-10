import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { MANAGE_ROLES } from "@/lib/access";
import User from "@/models/User";

export async function GET() {
  const session = await getSession();
  if (!session || !MANAGE_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await connectToDatabase();

  const users = await User.find({ companyId: session.companyId, role: "field_worker", status: "active" })
    .select("name email")
    .sort({ name: 1 })
    .lean();

  return NextResponse.json({ users });
}
