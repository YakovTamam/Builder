// Construction trades / disciplines. A shared, controlled vocabulary so tasks
// can be filtered, colored, and (later) matched to crews and materials.
// Kept as a code constant for now; a future slice can make it company-editable.

export type Trade = {
  value: string;
  label: string;
  // Light chip styling for the trade badge (avoids red, reserved for critical/overdue).
  className: string;
};

export const TRADES: Trade[] = [
  { value: "earthworks", label: "עבודות עפר", className: "bg-amber-100 text-amber-800" },
  { value: "shell", label: "שלד", className: "bg-stone-200 text-stone-700" },
  { value: "waterproofing", label: "איטום", className: "bg-cyan-100 text-cyan-800" },
  { value: "plaster", label: "טיח", className: "bg-orange-100 text-orange-800" },
  { value: "drywall", label: "גבס", className: "bg-slate-200 text-slate-700" },
  { value: "electricity", label: "חשמל", className: "bg-yellow-100 text-yellow-800" },
  { value: "plumbing", label: "אינסטלציה", className: "bg-blue-100 text-blue-800" },
  { value: "hvac", label: "מיזוג אוויר", className: "bg-sky-100 text-sky-800" },
  { value: "flooring", label: "ריצוף", className: "bg-teal-100 text-teal-800" },
  { value: "aluminum", label: "אלומיניום", className: "bg-indigo-100 text-indigo-800" },
  { value: "carpentry", label: "נגרות", className: "bg-lime-100 text-lime-800" },
  { value: "painting", label: "צבע", className: "bg-violet-100 text-violet-800" },
  { value: "finishing", label: "גמר", className: "bg-pink-100 text-pink-800" },
];

const TRADE_BY_VALUE = new Map(TRADES.map((t) => [t.value, t]));

export function tradeLabel(value?: string | null): string | undefined {
  if (!value) return undefined;
  return TRADE_BY_VALUE.get(value)?.label ?? value;
}

export function tradeClassName(value?: string | null): string {
  if (!value) return "bg-gray-100 text-gray-700";
  return TRADE_BY_VALUE.get(value)?.className ?? "bg-gray-100 text-gray-700";
}

export function isValidTrade(value?: string | null): boolean {
  return !!value && TRADE_BY_VALUE.has(value);
}
