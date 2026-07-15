import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import type { XgboostModelTree, XgboostTreeNode } from "@/types/classification";

const readableFeature = (feature: string | null) => (feature || "unknown")
  .replace(/^vendor_token_hash_/, "vendor text bucket ")
  .replace(/^description_token_hash_/, "memo text bucket ")
  .replace(/^keyword_/, "keyword: ")
  .replaceAll("_", " ");

export function XgboostTree({ tree }: { tree: XgboostModelTree }) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const positioned = useMemo(() => {
    const byDepth = new Map<number, XgboostTreeNode[]>();
    tree.nodes.forEach((node) => byDepth.set(node.depth, [...(byDepth.get(node.depth) || []), node]));
    return [...byDepth.entries()].flatMap(([depth, nodes]) => nodes.sort((a, b) => a.id - b.id).map((node, index) => ({
      ...node, x: ((index + 1) * 1000) / (nodes.length + 1), y: 75 + depth * 145,
    })));
  }, [tree]);
  const positions = new Map(positioned.map((node) => [node.id, node]));
  const activeNode = activeId === null ? null : positions.get(activeId);
  const height = Math.max(420, 150 + tree.max_depth * 145);

  return <Card className="overflow-hidden rounded-lg">
    <div className="flex flex-col gap-2 border-b px-5 py-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-semibold">Actual decision tree</h2><p className="text-xs text-muted-foreground">One of {tree.tree_count.toLocaleString("en-US")} trees. A transaction follows one path from the top split to a leaf score.</p></div><div className="text-sm"><span className="font-medium">Account {tree.account_number}</span><span className="text-muted-foreground"> / boosting round {tree.boosting_round}</span></div></div>
    <div className="relative overflow-auto bg-slate-50/70 dark:bg-zinc-950/50">
      <svg viewBox={`0 0 1000 ${height}`} className="min-w-[900px] w-full" style={{ minHeight: height }} role="img" aria-label={`Decision tree for account ${tree.account_number}`}>
        {tree.edges.map((edge) => {
          const source = positions.get(edge.source); const target = positions.get(edge.target);
          if (!source || !target) return null;
          const isYes = edge.branch === "yes";
          return <g key={`${edge.source}-${edge.target}`}><path d={`M ${source.x} ${source.y + 34} C ${source.x} ${source.y + 75}, ${target.x} ${target.y - 75}, ${target.x} ${target.y - 34}`} fill="none" stroke={isYes ? "#16a34a" : "#ea580c"} strokeWidth="2" opacity="0.7" /><text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2} textAnchor="middle" fill={isYes ? "#15803d" : "#c2410c"} className="text-[11px] font-semibold">{isYes ? "YES / lower" : "NO / equal or higher"}{edge.is_missing_default ? " / blank" : ""}</text></g>;
        })}
        {positioned.map((node) => {
          const leaf = node.type === "leaf"; const positive = (node.leaf_score || 0) >= 0;
          return <g key={node.id} onMouseEnter={() => setActiveId(node.id)} onMouseLeave={() => setActiveId(null)} className="cursor-default"><rect x={node.x - 105} y={node.y - 34} width="210" height="68" rx="10" fill={leaf ? (positive ? "#dcfce7" : "#fee2e2") : "#dbeafe"} stroke={leaf ? (positive ? "#16a34a" : "#dc2626") : "#2563eb"} strokeWidth="2" /><text x={node.x} y={node.y - 7} textAnchor="middle" className="fill-slate-900 text-[11px] font-semibold">{leaf ? "LEAF SCORE" : readableFeature(node.feature)}</text><text x={node.x} y={node.y + 14} textAnchor="middle" className="fill-slate-700 text-[12px]">{leaf ? `${(node.leaf_score || 0) >= 0 ? "+" : ""}${(node.leaf_score || 0).toFixed(4)}` : `Is value < ${node.threshold}?`}</text></g>;
        })}
      </svg>
      {activeNode && <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg border bg-background/95 px-4 py-3 text-xs shadow-lg"><p className="font-semibold">Node {activeNode.id}: {activeNode.type === "leaf" ? "final contribution" : readableFeature(activeNode.feature)}</p><p className="mt-1 text-muted-foreground">Training coverage: {activeNode.cover.toFixed(2)}{activeNode.gain != null ? ` / split gain: ${activeNode.gain.toFixed(2)}` : ""}</p></div>}
    </div>
    <div className="grid gap-3 border-t p-4 text-xs text-muted-foreground md:grid-cols-3"><p><strong className="text-foreground">Blue boxes</strong> ask a feature question.</p><p><strong className="text-green-700">Green/red leaves</strong> add or subtract evidence for this account.</p><p><strong className="text-foreground">All 58 account scores</strong> combine across 50 rounds before the model chooses.</p></div>
  </Card>;
}
