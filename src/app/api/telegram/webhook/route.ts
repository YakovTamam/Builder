import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import { parseStartToken, sendTelegramMessage } from "@/lib/telegram";

// Telegram calls this endpoint for every bot update (see README for the
// one-time setWebhook command). It is public by necessity, so it is protected
// by the secret token Telegram echoes back in a header.
export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret) {
    const got = request.headers.get("x-telegram-bot-api-secret-token");
    if (got !== expectedSecret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const update = await request.json().catch(() => null);
  const message = update?.message ?? update?.edited_message;
  const chatId = message?.chat?.id;
  const text: string | undefined = message?.text;

  // Acknowledge anything we don't handle (edits, joins, etc.) so Telegram
  // doesn't retry.
  if (!chatId) return NextResponse.json({ ok: true });

  await connectToDatabase();
  const chatIdStr = String(chatId);

  const token = parseStartToken(text);
  if (token) {
    const user = await User.findOne({ telegramLinkToken: token });
    if (user) {
      user.telegramChatId = chatIdStr;
      user.telegramLinkToken = undefined;
      await user.save();
      await sendTelegramMessage(
        chatIdStr,
        "✅ החשבון חובר בהצלחה! מעכשיו תקבל התראות מ-Builder כאן. לניתוק שלח /stop.",
      );
    } else {
      await sendTelegramMessage(
        chatIdStr,
        "הקישור אינו תקין או שכבר נוצל. הפק קישור חדש מהמערכת.",
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (typeof text === "string" && /^\/stop(?:@\w+)?/.test(text.trim())) {
    await User.updateOne({ telegramChatId: chatIdStr }, { $unset: { telegramChatId: "" } });
    await sendTelegramMessage(
      chatIdStr,
      "נותקת מהתראות Builder. לחיבור מחדש הפק קישור חדש מהמערכת.",
    );
    return NextResponse.json({ ok: true });
  }

  await sendTelegramMessage(
    chatIdStr,
    'שלום! כדי לקבל התראות מ-Builder, היכנס למערכת ולחץ על "חבר Telegram".',
  );
  return NextResponse.json({ ok: true });
}
