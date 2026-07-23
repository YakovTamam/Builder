import { describe, expect, it } from "vitest";
import { escapeHtml, parseStartToken, telegramDeepLink } from "./telegram";

describe("parseStartToken", () => {
  it("extracts the token from a /start command", () => {
    expect(parseStartToken("/start abc123")).toBe("abc123");
  });

  it("handles a bot-suffixed command (groups)", () => {
    expect(parseStartToken("/start@BuilderBot tok_XYZ")).toBe("tok_XYZ");
  });

  it("trims surrounding whitespace", () => {
    expect(parseStartToken("  /start   token  ")).toBe("token");
  });

  it("returns null for /start without a payload", () => {
    expect(parseStartToken("/start")).toBeNull();
    expect(parseStartToken("/start ")).toBeNull();
  });

  it("returns null for unrelated text or non-strings", () => {
    expect(parseStartToken("hello")).toBeNull();
    expect(parseStartToken("/stop")).toBeNull();
    expect(parseStartToken(undefined)).toBeNull();
    expect(parseStartToken(null)).toBeNull();
  });
});

describe("escapeHtml", () => {
  it("escapes HTML-significant characters", () => {
    expect(escapeHtml('a & b < c > d')).toBe("a &amp; b &lt; c &gt; d");
  });
});

describe("telegramDeepLink", () => {
  it("returns null when the bot username is not configured", () => {
    delete process.env.TELEGRAM_BOT_USERNAME;
    expect(telegramDeepLink("tok")).toBeNull();
  });

  it("builds a t.me deep link when configured", () => {
    process.env.TELEGRAM_BOT_USERNAME = "BuilderBot";
    expect(telegramDeepLink("tok 1")).toBe("https://t.me/BuilderBot?start=tok%201");
    delete process.env.TELEGRAM_BOT_USERNAME;
  });
});
