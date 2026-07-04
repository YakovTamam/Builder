// Pure expiry-status logic for documents/insurance policies, shared by the
// UI (badge colors) and the alert scanner (create/resolve expiry alerts).

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EXPIRING_SOON_DAYS = 30;

export type ExpiryStatus = "expired" | "expiring_soon" | "valid" | "no_expiry";

export function getExpiryStatus(
  expiryDate: Date | string | null | undefined,
  nowMs: number,
): ExpiryStatus {
  if (!expiryDate) return "no_expiry";
  const expiryMs = new Date(expiryDate).getTime();
  if (Number.isNaN(expiryMs)) return "no_expiry";
  if (expiryMs < nowMs) return "expired";
  if (expiryMs - nowMs <= EXPIRING_SOON_DAYS * MS_PER_DAY) return "expiring_soon";
  return "valid";
}

// Positive when the document is still valid, negative when already expired.
export function daysUntilExpiry(expiryDate: Date | string, nowMs: number): number {
  return Math.ceil((new Date(expiryDate).getTime() - nowMs) / MS_PER_DAY);
}
