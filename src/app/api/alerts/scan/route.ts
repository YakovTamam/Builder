import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { runAlertScan } from "@/lib/alertScan";

// Cron entry point: scans every company. Guarded by a shared secret.
export async function POST(request: Request) {
  const secret = process.env.ALERTS_CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "ALERTS_CRON_SECRET לא מוגדר" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  await connectToDatabase();
  const result = await runAlertScan();
  return NextResponse.json({ ok: true, ...result });
}
