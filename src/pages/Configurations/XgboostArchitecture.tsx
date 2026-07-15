import { Card } from "@/components/ui/card";

type Node = { x: number; y: number; label: string; sub?: string };
const column = (x: number, labels: Array<string | [string, string]>, top = 110, bottom = 470): Node[] => {
  const step = labels.length > 1 ? (bottom - top) / (labels.length - 1) : 0;
  return labels.map((value, index) => ({ x, y: top + index * step, label: typeof value === "string" ? value : value[0], sub: typeof value === "string" ? undefined : value[1] }));
};

function Connections({ from, to, color }: { from: Node[]; to: Node[]; color: string }) {
  return <>{from.flatMap((source, sourceIndex) => to.map((target, targetIndex) => <path key={`${sourceIndex}-${targetIndex}`} d={`M ${source.x + 38} ${source.y} C ${(source.x + target.x) / 2} ${source.y}, ${(source.x + target.x) / 2} ${target.y}, ${target.x - 38} ${target.y}`} fill="none" stroke={color} strokeWidth="1.2" opacity="0.22" />))}</>;
}

function LayerNodes({ nodes, color, kind }: { nodes: Node[]; color: string; kind: "circle" | "tree" | "output" }) {
  return <>{nodes.map((node, index) => <g key={`${node.label}-${index}`}>
    {kind === "output" ? <rect x={node.x - 58} y={node.y - 28} width="116" height="56" rx="14" fill="white" stroke={color} strokeWidth="3" className="dark:fill-zinc-900" /> : <circle cx={node.x} cy={node.y} r={kind === "tree" ? 34 : 30} fill="white" stroke={color} strokeWidth="4" className="dark:fill-zinc-900" />}
    {kind === "tree" && <path d={`M ${node.x - 13} ${node.y - 8} L ${node.x} ${node.y - 18} L ${node.x + 13} ${node.y - 8} M ${node.x} ${node.y - 18} L ${node.x} ${node.y + 15} M ${node.x} ${node.y} L ${node.x - 12} ${node.y + 13} M ${node.x} ${node.y} L ${node.x + 12} ${node.y + 13}`} fill="none" stroke={color} strokeWidth="2" />}
    <text x={node.x} y={kind === "tree" ? node.y + 49 : node.y + 4} textAnchor="middle" className="fill-slate-900 text-[11px] font-semibold dark:fill-zinc-100">{node.label}</text>
    {node.sub && <text x={node.x} y={node.y + 18} textAnchor="middle" className="fill-slate-500 text-[9px]">{node.sub}</text>}
  </g>)}</>;
}

export function XgboostArchitecture({ featureCount, treeCount, roundCount, classCount }: { featureCount: number; treeCount: number; roundCount: number; classCount: number }) {
  const inputs = column(100, ["Vendor", "Memo", "Amount", "Keywords"]);
  const features = column(350, [["Amounts", "raw + log"], ["Keyword flags", "bank, meal, rent..."], ["Vendor buckets", "hashed text"], ["Memo buckets", "hashed text"], ["Text lengths", "vendor + memo"]]);
  const trees = column(625, ["Round 1", "Round 2", "...", `Round ${Math.max(1, roundCount - 1)}`, `Round ${roundCount}`]);
  const scores = column(885, [["Account 1", "score"], ["Account 2", "score"], ["Account 3", "score"], [`+${Math.max(0, classCount - 4)} more`, "scores"]], 140, 440);
  const decisions = column(1115, [["Suggest", "supported"], ["AI review", "uncertain"], ["Manual", "low support"]], 175, 405);

  return <Card className="overflow-hidden rounded-lg">
    <div className="border-b px-5 py-4"><h2 className="text-lg font-semibold">XGBoost architecture overview</h2><p className="text-sm text-muted-foreground">A simple connected view for nontechnical users. These middle columns are boosted decision trees—not neural-network hidden layers.</p></div>
    <div className="overflow-x-auto bg-slate-50/70 dark:bg-zinc-950/50"><svg viewBox="0 0 1220 560" className="min-h-[500px] min-w-[1050px] w-full" role="img" aria-label="XGBoost transaction classification architecture">
      <text x="100" y="42" textAnchor="middle" className="fill-slate-700 text-[13px] font-bold dark:fill-zinc-200">TRANSACTION INPUTS</text><text x="350" y="42" textAnchor="middle" className="fill-slate-700 text-[13px] font-bold dark:fill-zinc-200">ENGINEERED FEATURES</text><text x="625" y="42" textAnchor="middle" className="fill-slate-700 text-[13px] font-bold dark:fill-zinc-200">BOOSTED TREE ROUNDS</text><text x="885" y="42" textAnchor="middle" className="fill-slate-700 text-[13px] font-bold dark:fill-zinc-200">ACCOUNT SCORES</text><text x="1115" y="42" textAnchor="middle" className="fill-slate-700 text-[13px] font-bold dark:fill-zinc-200">SAFEGUARDS</text>
      <text x="350" y="66" textAnchor="middle" className="fill-slate-500 text-[11px]">{featureCount} numeric features</text><text x="625" y="66" textAnchor="middle" className="fill-slate-500 text-[11px]">{treeCount.toLocaleString("en-US")} trees / {roundCount} rounds</text><text x="885" y="66" textAnchor="middle" className="fill-slate-500 text-[11px]">{classCount} account classes</text>
      <Connections from={inputs} to={features} color="#2563eb" /><Connections from={features} to={trees} color="#14b8a6" /><Connections from={trees} to={scores} color="#8b5cf6" /><Connections from={scores} to={decisions} color="#f59e0b" />
      <LayerNodes nodes={inputs} color="#2563eb" kind="circle" /><LayerNodes nodes={features} color="#14b8a6" kind="circle" /><LayerNodes nodes={trees} color="#8b5cf6" kind="tree" /><LayerNodes nodes={scores} color="#0ea5e9" kind="output" /><LayerNodes nodes={decisions} color="#f59e0b" kind="output" />
    </svg></div>
    <div className="grid gap-3 border-t p-4 text-xs text-muted-foreground md:grid-cols-3"><p><strong className="text-foreground">Features</strong> are numeric evidence extracted from the transaction.</p><p><strong className="text-foreground">Trees</strong> ask split questions and add leaf scores—there are no neurons.</p><p><strong className="text-foreground">Safeguards</strong> use confidence and training support before coding.</p></div>
  </Card>;
}
