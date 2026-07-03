import { describe, expect, it } from "vitest";
import { computeCriticalPath, wouldCreateCycle } from "./criticalPath";

describe("computeCriticalPath", () => {
  it("marks every task on a simple chain as critical", () => {
    const r = computeCriticalPath([
      { id: "A", durationHours: 8 },
      { id: "B", durationHours: 8, dependsOn: ["A"] },
      { id: "C", durationHours: 8, dependsOn: ["B"] },
    ]);
    expect(r.projectDurationHours).toBe(24);
    expect(r.criticalTaskIds.sort()).toEqual(["A", "B", "C"]);
    expect(r.tasks.B.earliestStartHours).toBe(8);
    expect(r.tasks.B.earliestFinishHours).toBe(16);
  });

  it("gives the shorter parallel branch float on a diamond graph", () => {
    const r = computeCriticalPath([
      { id: "S", durationHours: 0 },
      { id: "A", durationHours: 16, dependsOn: ["S"] },
      { id: "B", durationHours: 8, dependsOn: ["S"] },
      { id: "E", durationHours: 8, dependsOn: ["A", "B"] },
    ]);
    expect(r.projectDurationHours).toBe(24);
    expect(r.criticalTaskIds.sort()).toEqual(["A", "E", "S"]);
    expect(r.tasks.B.floatHours).toBeCloseTo(8);
    expect(r.tasks.A.isCritical).toBe(true);
    expect(r.tasks.B.isCritical).toBe(false);
  });

  it("maps hours onto calendar dates at 8 hours/day when a start date is given", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    const r = computeCriticalPath(
      [
        { id: "A", durationHours: 8 },
        { id: "B", durationHours: 8, dependsOn: ["A"] },
      ],
      start,
    );
    expect(r.tasks.A.startDate?.toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(r.tasks.B.startDate?.toISOString().slice(0, 10)).toBe("2026-01-02");
    expect(r.tasks.B.finishDate?.toISOString().slice(0, 10)).toBe("2026-01-03");
  });

  it("omits calendar dates entirely when no start date is given", () => {
    const r = computeCriticalPath([{ id: "A", durationHours: 8 }]);
    expect(r.tasks.A.startDate).toBeUndefined();
    expect(r.tasks.A.finishDate).toBeUndefined();
  });

  it("flags a cycle instead of computing a schedule", () => {
    const r = computeCriticalPath([
      { id: "A", durationHours: 8, dependsOn: ["B"] },
      { id: "B", durationHours: 8, dependsOn: ["A"] },
    ]);
    expect(r.hasCycle).toBe(true);
    expect(r.cycleTaskIds.sort()).toEqual(["A", "B"]);
    expect(r.tasks).toEqual({});
    expect(r.criticalTaskIds).toEqual([]);
  });

  it("ignores dependencies that point at unknown or self ids", () => {
    const r = computeCriticalPath([
      { id: "A", durationHours: 8, dependsOn: ["A", "ghost"] },
      { id: "B", durationHours: 4, dependsOn: ["A"] },
    ]);
    expect(r.hasCycle).toBe(false);
    expect(r.tasks.A.earliestStartHours).toBe(0);
    expect(r.tasks.B.earliestStartHours).toBe(8);
  });

  it("treats a missing or non-positive duration as zero hours", () => {
    const r = computeCriticalPath([
      { id: "A" },
      { id: "B", durationHours: -5, dependsOn: ["A"] },
    ]);
    expect(r.tasks.A.durationHours).toBe(0);
    expect(r.tasks.B.durationHours).toBe(0);
    expect(r.projectDurationHours).toBe(0);
  });

  it("returns an empty result for an empty task list", () => {
    const r = computeCriticalPath([]);
    expect(r.projectDurationHours).toBe(0);
    expect(r.criticalTaskIds).toEqual([]);
    expect(r.hasCycle).toBe(false);
  });
});

describe("wouldCreateCycle", () => {
  const chain = [
    { id: "A", durationHours: 8 },
    { id: "B", durationHours: 8, dependsOn: ["A"] },
    { id: "C", durationHours: 8, dependsOn: ["B"] },
  ];

  it("rejects a dependency that closes a loop back through the chain", () => {
    // A already reaches C via A->B->C, so "A depends on C" would cycle.
    expect(wouldCreateCycle(chain, "A", "C")).toBe(true);
  });

  it("allows a dependency on an existing ancestor (no new loop)", () => {
    expect(wouldCreateCycle(chain, "C", "A")).toBe(false);
  });

  it("treats a self-dependency as a cycle", () => {
    expect(wouldCreateCycle(chain, "A", "A")).toBe(true);
  });

  it("allows linking two previously unrelated tasks", () => {
    const disjoint = [
      { id: "X", durationHours: 1 },
      { id: "Y", durationHours: 1 },
    ];
    expect(wouldCreateCycle(disjoint, "Y", "X")).toBe(false);
  });
});
