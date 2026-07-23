import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import User from "@/models/User";

// Disconnect the current user's Telegram. (Users can also send /stop to the bot.)
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  await connectToDatabase();
  await User.updateOne(
    { _id: session.sub },
    { $unset: { telegramChatId: "", telegramLinkToken: "" } },
  );

  return NextResponse.json({ ok: true });
}
