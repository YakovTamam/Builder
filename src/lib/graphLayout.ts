import dagre from "@dagrejs/dagre";

// Auto-layout for the critical-path graph, backed by dagre instead of a
// hand-rolled depth/column heuristic. Unlike a column-based approach, dagre
// positions every node relative to its actual parent(s), so a branch (or a
// branch of a branch) reliably renders near what it's really connected to
// instead of floating in whatever column its depth happens to land on.

export type LayoutEdge = { source: string; target: string };

const DEFAULT_NODE_WIDTH = 160;
const DEFAULT_NODE_HEIGHT = 56;

export function computeDagreLayout(
  nodeIds: string[],
  edges: LayoutEdge[],
  options?: { nodeWidth?: number; nodeHeight?: number; rankSep?: number; nodeSep?: number },
): Map<string, { x: number; y: number }> {
  const width = options?.nodeWidth ?? DEFAULT_NODE_WIDTH;
  const height = options?.nodeHeight ?? DEFAULT_NODE_HEIGHT;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  // "LR" (left to right) matches the graph's chronological source->target
  // convention (the canvas itself renders dir="ltr").
  g.setGraph({
    rankdir: "LR",
    nodesep: options?.nodeSep ?? 28,
    ranksep: options?.rankSep ?? 90,
  });

  const idSet = new Set(nodeIds);
  for (const id of nodeIds) {
    g.setNode(id, { width, height });
  }
  for (const edge of edges) {
    if (!idSet.has(edge.source) || !idSet.has(edge.target)) continue;
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  // dagre positions are node centers; React Flow positions are top-left.
  const positions = new Map<string, { x: number; y: number }>();
  for (const id of nodeIds) {
    const pos = g.node(id);
    if (!pos) continue;
    positions.set(id, { x: pos.x - width / 2, y: pos.y - height / 2 });
  }
  return positions;
}
