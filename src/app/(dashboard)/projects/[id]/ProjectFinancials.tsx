import type { ProjectFinancials as Financials } from "@/lib/finance";

type FinancialsData = Financials & { laborHours: number; laborRate?: number };

function shekel(n: number): string {
  const rounded = Math.round(n);
  return `₪${rounded.toLocaleString("he-IL")}`;
}

// Read-only cost & margin summary for a project (managers only).
export default function ProjectFinancials({ data }: { data: FinancialsData }) {
  const { quote, materialsCost, equipmentCost, laborCost, totalCost, margin, marginPct, laborHours, laborRate } =
    data;
  const positive = margin >= 0;

  const rows = [
    { label: "חומרים", value: materialsCost },
    {
      label: laborRate ? `עבודה (${laborHours} ש׳ × ₪${laborRate})` : "עבודה",
      value: laborCost,
    },
    { label: "ציוד", value: equipmentCost },
  ];

  return (
    <div className="card p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">כספים ורווחיות</h2>
        <span className="text-xs text-gray-400">מחיר פחות עלות משוערת</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs text-gray-500">מחיר ללקוח</p>
          <p className="text-xl font-bold text-gray-900">{quote > 0 ? shekel(quote) : "—"}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs text-gray-500">עלות משוערת</p>
          <p className="text-xl font-bold text-gray-900">{shekel(totalCost)}</p>
        </div>
        <div className={`rounded-lg border p-3 ${positive ? "border-emerald-100 bg-emerald-50" : "border-red-100 bg-red-50"}`}>
          <p className="text-xs text-gray-500">רווח צפוי</p>
          <p className={`text-xl font-bold ${positive ? "text-emerald-700" : "text-red-700"}`}>
            {shekel(margin)}
            {quote > 0 && (
              <span className="text-sm font-medium"> ({marginPct.toFixed(0)}%)</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-gray-100 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-1.5">
            <span className="text-gray-500">{row.label}</span>
            <span className="font-medium text-gray-800">{shekel(row.value)}</span>
          </div>
        ))}
      </div>

      {laborHours > 0 && !laborRate && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          יש {laborHours} שעות עבודה מתוכננות אך לא הוגדר תעריף עבודה — העלות אינה כוללת שכר. הגדר תעריף
          בעריכת הפרויקט.
        </p>
      )}
      {quote === 0 && (
        <p className="text-xs text-gray-500">
          הזן &quot;מחיר ללקוח&quot; בעריכת הפרויקט כדי לראות את הרווח.
        </p>
      )}
    </div>
  );
}
