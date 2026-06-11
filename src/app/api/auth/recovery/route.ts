import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import Company from "@/models/Company";

export async function POST(request: Request) {
  const recoverySecret = process.env.ADMIN_RECOVERY_SECRET;
  if (!recoverySecret) {
    return NextResponse.json({ error: "התכונה אינה מוגדרת בשרת" }, { status: 503 });
  }

  const body = await request.json();
  const { secret, companyName, name, email, password } = body as {
    secret?: string;
    companyName?: string;
    name?: string;
    email?: string;
    password?: string;
  };

  if (!secret || secret !== recoverySecret) {
    return NextResponse.json({ error: "קוד שחזור שגוי" }, { status: 403 });
  }

  if (!companyName || !name || !email || !password) {
    return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "הסיסמה חייבת להכיל לפחות 8 תווים" }, { status: 400 });
  }

  await connectToDatabase();

  let company = await Company.findOne({ name: companyName.trim() });
  if (!company) {
    company = await Company.create({ name: companyName.trim() });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const normalizedEmail = email.toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    existingUser.role = "super_admin";
    existingUser.companyId = company._id;
    existingUser.status = "active";
    existingUser.passwordHash = passwordHash;
    await existingUser.save();
    return NextResponse.json({ ok: true, action: "updated" });
  }

  await User.create({
    name,
    email: normalizedEmail,
    passwordHash,
    role: "super_admin",
    companyId: company._id,
  });

  return NextResponse.json({ ok: true, action: "created" });
}
