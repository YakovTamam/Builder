import { describe, expect, it } from "vitest";
import { findEquipmentConflicts, rangesOverlap } from "./equipment";

describe("rangesOverlap", () => {
  it("detects overlapping closed ranges", () => {
    expect(rangesOverlap("2026-01-01", "2026-01-10", "2026-01-05", "2026-01-15")).toBe(true);
  });

  it("returns false for disjoint ranges", () => {
    expect(rangesOverlap("2026-01-01", "2026-01-10", "2026-01-11", "2026-01-20")).toBe(false);
  });

  it("treats a missing end as open-ended (+infinity)", () => {
    expect(rangesOverlap("2026-01-01", null, "2026-06-01", "2026-06-05")).toBe(true);
  });

  it("treats a missing start as open-ended (-infinity)", () => {
    expect(rangesOverlap(null, "2026-01-05", "2026-01-01", "2026-01-03")).toBe(true);
  });
});

describe("findEquipmentConflicts", () => {
  const b = (id: string, name: string, projectId: string, startDate?: string, endDate?: string) => ({
    id,
    name,
    projectId,
    startDate,
    endDate,
  });

  it("flags the same machine double-booked across projects on overlapping dates", () => {
    const conflicts = findEquipmentConflicts([
      b("1", "מנוף 25 טון", "pA", "2026-01-01", "2026-01-10"),
      b("2", "מנוף 25 טון", "pB", "2026-01-05", "2026-01-15"),
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].ids.sort()).toEqual(["1", "2"]);
    expect(conflicts[0].projectIds.sort()).toEqual(["pA", "pB"]);
  });

  it("does not flag the same machine on the same project", () => {
    expect(
      findEquipmentConflicts([
        b("1", "מחפרון", "pA", "2026-01-01", "2026-01-10"),
        b("2", "מחפרון", "pA", "2026-01-05", "2026-01-15"),
      ]),
    ).toEqual([]);
  });

  it("does not flag non-overlapping dates", () => {
    expect(
      findEquipmentConflicts([
        b("1", "מכבש", "pA", "2026-01-01", "2026-01-10"),
        b("2", "מכבש", "pB", "2026-02-01", "2026-02-10"),
      ]),
    ).toEqual([]);
  });

  it("matches machine names case- and whitespace-insensitively", () => {
    const conflicts = findEquipmentConflicts([
      b("1", "Bobcat S550", "pA", "2026-01-01", "2026-01-10"),
      b("2", "  bobcat s550 ", "pB", "2026-01-03", "2026-01-05"),
    ]);
    expect(conflicts).toHaveLength(1);
  });

  it("treats different machines independently", () => {
    expect(
      findEquipmentConflicts([
        b("1", "מנוף", "pA", "2026-01-01", "2026-01-10"),
        b("2", "מחפרון", "pB", "2026-01-01", "2026-01-10"),
      ]),
    ).toEqual([]);
  });
});
