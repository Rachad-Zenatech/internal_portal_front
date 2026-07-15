import { useEffect, useState } from "react";
import { AlertTriangle, GitBranch, Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useExplainXgboostTransaction } from "@/hooks/useClassification";

const pct = (value?: number | null) => `${((value || 0) * 100).toFixed(1)}%`;
const account = (code?: string | null, name?: string | null) => [code, name].filter(Boolean).join(" · ") || "No account";

export type XgboostLookupRequest = {
  requestId: number;
  vendor: string;
  amount: number;
  description: string;
};

export function XgboostTransactionExplorer({ onOpenTree, lookupRequest }: { onOpenTree: (treeIndex: number) => void; lookupRequest?: XgboostLookupRequest | null }) {
  const [vendor, setVendor] = useState("");
  const [memo, setMemo] = useState("");
  const [amount, setAmount] = useState("");
  const query = useExplainXgboostTransaction();
  const { mutate } = query;
  const result = query.data;
  const canAnalyze = Boolean(vendor.trim() || memo.trim() || amount.trim());
  const loadExample = () => {
    setVendor("Print Science");
    setMemo("PURCHASE 0109 PRINTSCIENCE XXXXX89070 ME XXXXX0960XXXXXXXXXX3366 RECURRING CKCD 2741 XXXXXXXXXX779713");
    setAmount("-99.99");
  };
  const lookupSignature = (signature: string) => {
    setVendor(signature);
    setMemo("");
    setAmount("");
    query.mutate({ vendor: signature, description: "", amount: null });
  };

  useEffect(() => {
    if (!lookupRequest) return;
    setVendor(lookupRequest.vendor);
    setMemo(lookupRequest.description);
    setAmount(String(lookupRequest.amount));
    mutate({ vendor: lookupRequest.vendor, description: lookupRequest.description, amount: lookupRequest.amount });
  }, [lookupRequest, mutate]);

  return <Card id="xgboost-transaction-lookup" className="scroll-mt-6 rounded-lg p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-semibold">Look up a transaction</h2><p className="text-sm text-muted-foreground">Enter any one field—or combine fields for a more specific model explanation.</p></div><Button variant="outline" size="sm" onClick={loadExample}><Sparkles className="mr-2 h-4 w-4" />Load Print Science example</Button></div>
    <div className="mt-5 grid gap-4 md:grid-cols-[1fr_180px]"><label className="grid gap-1.5 text-sm"><span className="font-medium">Vendor or payee <span className="font-normal text-muted-foreground">(optional)</span></span><Input value={vendor} onChange={(event) => setVendor(event.target.value)} placeholder="Print Science" /></label><label className="grid gap-1.5 text-sm"><span className="font-medium">Amount <span className="font-normal text-muted-foreground">(optional)</span></span><Input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" step="0.01" placeholder="-99.99" /></label></div>
    <label className="mt-4 grid gap-1.5 text-sm"><span className="font-medium">Memo or bank description <span className="font-normal text-muted-foreground">(optional)</span></span><Textarea value={memo} onChange={(event) => setMemo(event.target.value)} rows={3} placeholder="Paste transaction details" /></label>
    <div className="mt-4 flex items-center gap-3"><Button onClick={() => query.mutate({ vendor: vendor.trim(), description: memo.trim(), amount: amount.trim() ? Number(amount) : null })} disabled={query.isPending || !canAnalyze}><Search className="mr-2 h-4 w-4" />{query.isPending ? "Analyzing..." : "Analyze transaction"}</Button>{query.isError && <span className="text-sm text-destructive">Enter at least one field and try again.</span>}</div>

    {result && <div className="mt-6 space-y-5 border-t pt-5">
      {result.training_conflict && <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Prediction conflicts with exact training history</p><p className="mt-1 text-sm">This vendor was trained, but none of its approved rows used the suggested account. Keep it in AI or manual review.</p></div></div>}
      <div className="grid gap-3 md:grid-cols-4"><div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Model suggestion</p><p className="mt-1 font-semibold">{account(result.suggested_account, result.suggested_account_name)}</p></div><div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Confidence</p><p className="mt-1 text-xl font-semibold">{pct(result.prediction.confidence)}</p><p className="text-xs text-muted-foreground">Raw model: {pct(result.prediction.model_confidence)}</p></div><div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Vendor signature</p><p className="mt-1 font-mono text-sm font-semibold">{result.normalized_vendor_signature || "Not provided"}</p></div><div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Matching vendor rows</p><p className="mt-1 text-xl font-semibold">{result.exact_vendor_training_rows}</p><div className="mt-1 flex gap-1">{result.prediction.requires_ai_review && <Badge variant="secondary">AI review</Badge>}{result.prediction.requires_manual_review && <Badge variant="outline">Manual</Badge>}</div></div></div>
      <div className="rounded-lg bg-muted/50 p-4 text-sm"><strong>Why:</strong> {result.prediction.reason}</div>
      <div className="rounded-lg border p-4"><div><h3 className="font-medium">Similar trained vendors</h3><p className="mt-1 text-xs text-muted-foreground">These vendor signatures resemble this transaction. Select one to run a new vendor lookup and see its exact training history.</p></div>{result.closest_training_signatures.length ? <div className="mt-4 grid gap-3 lg:grid-cols-2">{result.closest_training_signatures.map((item) => <button type="button" key={item.signature} onClick={() => lookupSignature(item.signature)} disabled={query.isPending} className="group rounded-lg border p-3 text-left transition hover:border-blue-400 hover:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 dark:hover:bg-blue-950/20"><div className="flex items-start justify-between gap-3"><span className="font-mono text-sm font-semibold group-hover:text-blue-700 dark:group-hover:text-blue-300">{item.signature}</span><span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-300"><Search className="h-3.5 w-3.5" />Look up · {pct(item.similarity)}</span></div><p className="mt-2 text-xs text-muted-foreground">{item.training_rows} approved rows</p><div className="mt-2 flex flex-wrap gap-1">{item.accounts.map((match) => <Badge key={match.account_number} variant="secondary">{account(match.account_number, match.account_name)} · {match.training_rows}</Badge>)}</div></button>)}</div> : <p className="mt-4 rounded-md border border-dashed p-3 text-sm text-muted-foreground">No similar trained vendor signatures were found.</p>}</div>
      <div className="grid gap-5 xl:grid-cols-2"><div><h3 className="font-medium">Approved accounts previously used for this vendor</h3><div className="mt-2 space-y-2">{result.exact_training_accounts.length ? result.exact_training_accounts.map((item) => <div key={item.account_number} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"><span>{account(item.account_number, item.account_name)}</span><Badge variant="secondary">{item.training_rows} rows</Badge></div>) : <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">{vendor.trim() ? "No exact vendor training was found." : "Enter a vendor or payee to match vendor-specific training history."}</p>}</div></div><div><h3 className="font-medium">All split-account candidates ({result.top_candidates.length})</h3><div className="mt-2 max-h-[420px] space-y-2 overflow-y-auto pr-2">{result.top_candidates.map((item) => <div key={item.account} className="rounded-md border px-3 py-2"><div className="flex justify-between gap-3 text-sm"><span>{account(item.account, item.account_name)}</span><strong>{pct(item.confidence)}</strong></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(2, item.confidence * 100)}%` }} /></div><p className="mt-1 text-xs text-muted-foreground">{item.account_training_rows} account rows / {item.vendor_account_training_rows} exact vendor rows</p></div>)}</div></div></div>
      <div><h3 className="font-medium">Strongest tree contributions</h3><p className="text-xs text-muted-foreground">Open a tree to see the exact yes/no decisions behind its score.</p><div className="mt-3 flex flex-wrap gap-2">{result.strongest_tree_contributions.map((item) => <Button key={item.tree_index} variant="outline" size="sm" onClick={() => onOpenTree(item.tree_index)}><GitBranch className="mr-2 h-3.5 w-3.5" />Round {item.boosting_round}: {item.leaf_score >= 0 ? "+" : ""}{item.leaf_score.toFixed(3)}</Button>)}</div></div>
      <details className="rounded-lg border p-4"><summary className="cursor-pointer font-medium">Technical active features</summary><p className="mt-2 text-xs text-muted-foreground">Numeric inputs activated for this prediction. This section is intended for detailed model inspection.</p><div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">{result.active_features.slice(0, 24).map((item) => <div key={item.feature} className="rounded-md bg-muted/50 p-2 text-xs"><span className="break-all font-mono">{item.feature}</span><strong className="ml-2">{item.value.toFixed(2)}</strong></div>)}</div></details>
    </div>}
  </Card>;
}
