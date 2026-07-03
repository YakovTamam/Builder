import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { MANAGE_ROLES } from "@/lib/access";
import { runAlertScan } from "@/lib/alertScan";

// Manager-triggered scan, scoped to the caller's company. This keeps the
// alert mechanism usable without a scheduled cron.
export async function POST() {
  const session = await getSession();
  if (!session || !MANAGE_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  if (!session.companyId) {
    return NextResponse.json({ error: "אין חברה משויכת" }, { status: 400 });
  }

  await connectToDatabase();
  const result = await runAlertScan({ companyId: String(session.companyId) });
  return NextResponse.json({ ok: true, ...result });
}
