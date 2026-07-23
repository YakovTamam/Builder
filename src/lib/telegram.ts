// Thin wrapper over the (free) Telegram Bot API. Sending is a no-op when
// TELEGRAM_BOT_TOKEN is unset, so the rest of the app works without it.

const API_BASE = "https://api.telegram.org";

// Extract the deep-link payload from a "/start <token>" message. Telegram
// delivers a t.me/<bot>?start=TOKEN link as the text "/start TOKEN" (and may
// suffix the command with "@BotName" in groups). Returns null otherwise.
export function parseStartToken(text: string | null | undefined): string | null {
  if (typeof text !== "string") return null;
  const match = text.trim().match(/^\/start(?:@\w+)?\s+(\S+)$/);
  return match ? match[1] : null;
}

// Minimal HTML escaping for parse_mode: "HTML" message bodies.
export function escapeHtml(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

export function telegramLinkingConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME);
}

// Build the deep link a user taps to connect their Telegram to their account.
export function telegramDeepLink(token: string): string | null {
  const username = process.env.TELEGRAM_BOT_USERNAME;
  if (!username) return null;
  return `${`https://t.me/${username}`}?start=${encodeURIComponent(token)}`;
}

// Send a single message. Returns true on success, false on any failure (never
// throws) so callers can fire notifications without guarding every call.
export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(`${API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
