import { describe, expect, it } from "vitest";
import { getExpiryStatus, daysUntilExpiry } from "./documents";

const NOW = new Date("2026-07-04T00:00:00.000Z").getTime();
const DAY = 24 * 60 * 60 * 1000;

describe("getExpiryStatus", () => {
  it("returns no_expiry when no expiry date is set", () => {
    expect(getExpiryStatus(undefined, NOW)).toBe("no_expiry");
    expect(getExpiryStatus(null, NOW)).toBe("no_expiry");
  });

  it("returns expired for a date in the past", () => {
    expect(getExpiryStatus(new Date(NOW - DAY), NOW)).toBe("expired");
  });

  it("returns expiring_soon within the 30-day window", () => {
    expect(getExpiryStatus(new Date(NOW + 10 * DAY), NOW)).toBe("expiring_soon");
    expect(getExpiryStatus(new Date(NOW + 30 * DAY), NOW)).toBe("expiring_soon");
  });

  it("returns valid for a date safely in the future", () => {
    expect(getExpiryStatus(new Date(NOW + 60 * DAY), NOW)).toBe("valid");
  });
});

describe("daysUntilExpiry", () => {
  it("is positive for a future date and negative for a past one", () => {
    expect(daysUntilExpiry(new Date(NOW + 5 * DAY), NOW)).toBe(5);
    expect(daysUntilExpiry(new Date(NOW - 5 * DAY), NOW)).toBe(-5);
  });
});
