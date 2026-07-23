import { describe, expect, it } from "vitest";
import { compareWorkerTasks } from "./workerTasks";

const t = (over: Partial<{ dueDate: string; priority: string; createdAt: string }> = {}) => ({
  priority: "medium",
  ...over,
});

describe("compareWorkerTasks", () => {
  it("puts tasks with a due date before tasks without one", () => {
    expect(compareWorkerTasks(t({ dueDate: "2026-01-01" }), t())).toBeLessThan(0);
    expect(compareWorkerTasks(t(), t({ dueDate: "2026-01-01" }))).toBeGreaterThan(0);
  });

  it("orders by earliest due date first (so overdue floats up)", () => {
    const earlier = t({ dueDate: "2026-01-01" });
    const later = t({ dueDate: "2026-02-01" });
    expect(compareWorkerTasks(earlier, later)).toBeLessThan(0);
    expect(compareWorkerTasks(later, earlier)).toBeGreaterThan(0);
  });

  it("falls back to priority when neither has a due date", () => {
    expect(compareWorkerTasks(t({ priority: "high" }), t({ priority: "low" }))).toBeLessThan(0);
    expect(compareWorkerTasks(t({ priority: "medium" }), t({ priority: "high" }))).toBeGreaterThan(0);
  });

  it("falls back to oldest first when due date and priority tie", () => {
    const older = t({ priority: "high", createdAt: "2026-01-01" });
    const newer = t({ priority: "high", createdAt: "2026-03-01" });
    expect(compareWorkerTasks(older, newer)).toBeLessThan(0);
  });

  it("sorts a mixed list into a stable urgency order", () => {
    const list = [
      t({ createdAt: "2026-01-01", priority: "low" }), // no due, low
      t({ dueDate: "2026-05-01" }), // due later
      t({ dueDate: "2026-01-01" }), // due soonest
      t({ createdAt: "2026-01-01", priority: "high" }), // no due, high
    ];
    const order = [...list].sort(compareWorkerTasks);
    expect(order[0]).toBe(list[2]); // soonest due
    expect(order[1]).toBe(list[1]); // later due
    expect(order[2]).toBe(list[3]); // no due, high priority
    expect(order[3]).toBe(list[0]); // no due, low priority
  });
});
