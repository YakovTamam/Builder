import { describe, expect, it } from "vitest";
import { TRADES, isValidTrade, tradeClassName, tradeLabel } from "./trades";

describe("tradeLabel", () => {
  it("returns undefined for no value", () => {
    expect(tradeLabel(undefined)).toBeUndefined();
    expect(tradeLabel(null)).toBeUndefined();
    expect(tradeLabel("")).toBeUndefined();
  });

  it("returns the Hebrew label for a known trade", () => {
    expect(tradeLabel("electricity")).toBe(TRADES.find((t) => t.value === "electricity")!.label);
  });

  it("falls back to the raw value for an unknown trade", () => {
    expect(tradeLabel("some-future-trade")).toBe("some-future-trade");
  });
});

describe("tradeClassName", () => {
  it("returns the neutral gray class for no value or an unknown trade", () => {
    expect(tradeClassName(undefined)).toBe("bg-gray-100 text-gray-700");
    expect(tradeClassName("unknown")).toBe("bg-gray-100 text-gray-700");
  });

  it("returns the trade's own class for a known trade", () => {
    expect(tradeClassName("electricity")).toBe(TRADES.find((t) => t.value === "electricity")!.className);
  });
});

describe("isValidTrade", () => {
  it("is true only for values present in the TRADES list", () => {
    expect(isValidTrade("plaster")).toBe(true);
    expect(isValidTrade("not-a-trade")).toBe(false);
    expect(isValidTrade(undefined)).toBe(false);
    expect(isValidTrade("")).toBe(false);
  });
});
