import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import User, { ROLES } from "@/models/User";

const ASSIGNABLE_ROLES = ["project_manager"] as const;

export async function GET() {
  const session = await getSession();
  if (!session || !["super_admin", "company_admin"].includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await connectToDatabase();
  const users = await User.find({ companyId: session.companyId })
    .select("-passwordHash")
    .sort({ createdAt: -1 });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["super_admin", "company_admin"].includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await connectToDatabase();

  const body = await request.json();
  const { name, email, password, role } = body as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
  };

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
  }

  if (!ASSIGNABLE_ROLES.includes(role as (typeof ASSIGNABLE_ROLES)[number])) {
    return NextResponse.json({ error: "תפקיד לא נתמך" }, { status: 400 });
  }

  if (!ROLES.includes(role as (typeof ROLES)[number])) {
    return NextResponse.json({ error: "תפקיד לא תקין" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "הסיסמה חייבת להכיל לפחות 8 תווים" }, { status: 400 });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return NextResponse.json({ error: "משתמש עם אימייל זה כבר קיים" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role,
    companyId: session.companyId,
  });

  return NextResponse.json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    },
  });
}
