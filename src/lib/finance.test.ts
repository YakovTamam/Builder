import { describe, expect, it } from "vitest";
import { computeProjectFinancials, suggestedPrice } from "./finance";

describe("computeProjectFinancials", () => {
  it("sums materials (quantity × unitCost), equipment cost and labour", () => {
    const f = computeProjectFinancials({
      quote: 100000,
      materials: [
        { quantity: 10, unitCost: 500 }, // 5000
        { quantity: 2, unitCost: 1500 }, // 3000
      ],
      equipment: [{ cost: 8000 }, { cost: 2000 }], // 10000
      laborHours: 400,
      laborRate: 120, // 48000
    });
    expect(f.materialsCost).toBe(8000);
    expect(f.equipmentCost).toBe(10000);
    expect(f.laborCost).toBe(48000);
    expect(f.totalCost).toBe(66000);
    expect(f.margin).toBe(34000);
    expect(f.marginPct).toBeCloseTo(34);
  });

  it("treats missing numbers as zero", () => {
    const f = computeProjectFinancials({
      materials: [{ quantity: 5 }, { unitCost: 100 }],
      equipment: [{}],
      laborHours: 10,
    });
    expect(f.totalCost).toBe(0);
    expect(f.quote).toBe(0);
    expect(f.marginPct).toBe(0);
  });

  it("reports a negative margin when cost exceeds the quote", () => {
    const f = computeProjectFinancials({
      quote: 5000,
      materials: [{ quantity: 1, unitCost: 6000 }],
      equipment: [],
      laborHours: 0,
      laborRate: 0,
    });
    expect(f.margin).toBe(-1000);
    expect(f.marginPct).toBeCloseTo(-20);
  });

  it("keeps marginPct at 0 when there is no quote", () => {
    const f = computeProjectFinancials({ materials: [{ quantity: 1, unitCost: 100 }], equipment: [] });
    expect(f.totalCost).toBe(100);
    expect(f.marginPct).toBe(0);
  });
});

describe("suggestedPrice", () => {
  it("marks up cost to reach the target margin", () => {
    // cost 60000 at 25% margin → 80000 (margin 20000 = 25% of 80000)
    expect(suggestedPrice(60000, 25)).toBeCloseTo(80000);
  });

  it("returns the cost unchanged for invalid targets", () => {
    expect(suggestedPrice(60000, 0)).toBe(60000);
    expect(suggestedPrice(60000, 100)).toBe(60000);
    expect(suggestedPrice(60000, -10)).toBe(60000);
  });
});
