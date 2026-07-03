import { describe, expect, it } from "vitest";
import { computeDagreLayout } from "./graphLayout";

describe("computeDagreLayout", () => {
  it("returns a position for every requested node, including disconnected ones", () => {
    const positions = computeDagreLayout(["A", "B", "orphan"], [{ source: "A", target: "B" }]);
    expect(positions.has("A")).toBe(true);
    expect(positions.has("B")).toBe(true);
    expect(positions.has("orphan")).toBe(true);
  });

  it("increases x left-to-right along a dependency chain", () => {
    const positions = computeDagreLayout(
      ["A", "B", "C"],
      [
        { source: "A", target: "B" },
        { source: "B", target: "C" },
      ],
    );
    expect(positions.get("B")!.x).toBeGreaterThan(positions.get("A")!.x);
    expect(positions.get("C")!.x).toBeGreaterThan(positions.get("B")!.x);
  });

  it("separates sibling branches vertically instead of stacking them", () => {
    // Root with two independent children - a "branch of a branch" case is
    // exactly what the old column-based heuristic got wrong.
    const positions = computeDagreLayout(
      ["root", "child1", "child2"],
      [
        { source: "root", target: "child1" },
        { source: "root", target: "child2" },
      ],
    );
    expect(positions.get("child1")!.y).not.toBeCloseTo(positions.get("child2")!.y, 0);
    // Both children should still be positioned to the right of the root.
    expect(positions.get("child1")!.x).toBeGreaterThan(positions.get("root")!.x);
    expect(positions.get("child2")!.x).toBeGreaterThan(positions.get("root")!.x);
  });

  it("ignores edges that reference an id outside the given node list", () => {
    const positions = computeDagreLayout(["A", "B"], [{ source: "A", target: "ghost" }]);
    expect(positions.has("A")).toBe(true);
    expect(positions.has("B")).toBe(true);
    expect(positions.has("ghost")).toBe(false);
  });
});
