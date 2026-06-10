import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import Company from "@/models/Company";
import { signSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/auth";

export async function GET() {
  await connectToDatabase();
  const userCount = await User.countDocuments();
  return NextResponse.json({ needsSetup: userCount === 0 });
}

export async function POST(request: Request) {
  await connectToDatabase();

  const userCount = await User.countDocuments();
  if (userCount > 0) {
    return NextResponse.json({ error: "המערכת כבר מוגדרת" }, { status: 409 });
  }

  const body = await request.json();
  const { companyName, name, email, password } = body as {
    companyName?: string;
    name?: string;
    email?: string;
    password?: string;
  };

  if (!companyName || !name || !email || !password) {
    return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "הסיסמה חייבת להכיל לפחות 8 תווים" }, { status: 400 });
  }

  const company = await Company.create({ name: companyName });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: "super_admin",
    companyId: company._id,
  });

  const token = await signSession({
    sub: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: company._id.toString(),
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}
