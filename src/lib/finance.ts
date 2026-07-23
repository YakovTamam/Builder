// Pure project cost & margin math. Kept DB-free so it can be unit-tested and
// reused by the project view and (later) reports. All money is in shekels.

export type FinanceInputs = {
  // Price quoted to the client (revenue).
  quote?: number | null;
  materials: { quantity?: number | null; unitCost?: number | null }[];
  equipment: { cost?: number | null }[];
  // Total estimated labour hours across the project's tasks.
  laborHours?: number | null;
  laborRate?: number | null; // ₪ per hour
};

export type ProjectFinancials = {
  materialsCost: number;
  equipmentCost: number;
  laborCost: number;
  totalCost: number;
  quote: number;
  margin: number; // quote - totalCost
  marginPct: number; // margin / quote * 100 (0 when there is no quote)
};

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function computeProjectFinancials(input: FinanceInputs): ProjectFinancials {
  const materialsCost = input.materials.reduce(
    (sum, m) => sum + num(m.quantity) * num(m.unitCost),
    0,
  );
  const equipmentCost = input.equipment.reduce((sum, e) => sum + num(e.cost), 0);
  const laborCost = num(input.laborHours) * num(input.laborRate);
  const totalCost = materialsCost + equipmentCost + laborCost;

  const quote = num(input.quote);
  const margin = quote - totalCost;
  const marginPct = quote > 0 ? (margin / quote) * 100 : 0;

  return { materialsCost, equipmentCost, laborCost, totalCost, quote, margin, marginPct };
}

// Suggested client price to hit a target margin percentage, given a cost.
// price = cost / (1 - margin%/100). Returns cost when the target is invalid.
export function suggestedPrice(totalCost: number, targetMarginPct: number): number {
  const cost = num(totalCost);
  const m = num(targetMarginPct);
  if (m <= 0 || m >= 100) return cost;
  return cost / (1 - m / 100);
}
