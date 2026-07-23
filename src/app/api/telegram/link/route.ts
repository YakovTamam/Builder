import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import User from "@/models/User";
import { telegramDeepLink, telegramLinkingConfigured } from "@/lib/telegram";

// Start the linking handshake: mint a one-time token for the current user and
// return the t.me deep link they should open and press "Start" on.
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  if (!telegramLinkingConfigured()) {
    return NextResponse.json(
      { error: "התראות Telegram אינן מוגדרות בשרת" },
      { status: 501 },
    );
  }

  await connectToDatabase();

  const token = randomUUID().replace(/-/g, "");
  await User.updateOne({ _id: session.sub }, { telegramLinkToken: token });

  const url = telegramDeepLink(token);
  return NextResponse.json({ url });
}
