import { useRef, useState } from "react";
import { Activity, ArrowRight, BrainCircuit, ChevronRight, Database, RefreshCw, Search, Tags } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useXgboostStatus, useXgboostTrainingExamples, useXgboostTree } from "@/hooks/useClassification";
import { XgboostTree } from "./XgboostTree";
import { XgboostArchitecture } from "./XgboostArchitecture";
import { XgboostTransactionExplorer, type XgboostLookupRequest } from "./XgboostTransactionExplorer";
import type { XgboostTrainingExample } from "@/types/classification";

const number = (value: number) => value.toLocaleString("en-US");
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const accountLabel = (account: { account_number: string; account_name?: string | null }) =>
  [account.account_number, account.account_name].filter(Boolean).join(" · ");

const signalGroup = (feature: string) => {
  if (feature.startsWith("vendor_token_hash_")) return "Vendor/payee wording";
  if (feature.startsWith("description_token_hash_")) return "Bank memo wording";
  if (feature.startsWith("keyword_")) return "Accounting keywords";
  if (feature === "amount" || feature === "log_amount") return "Transaction amount";
  if (feature.endsWith("_length")) return "Text length";
  return "Other model signals";
};

const signalDescription: Record<string, string> = {
  "Vendor/payee wording": "Patterns in names such as Print Science or a recurring merchant.",
  "Bank memo wording": "Patterns found in the full bank or credit-card description.",
  "Accounting keywords": "Words such as payroll, rent, meal, software, or transfer.",
  "Transaction amount": "The transaction value and its scaled amount pattern.",
  "Text length": "The lengths of the vendor name and transaction memo.",
  "Other model signals": "Any remaining numeric evidence used by the trees.",
};

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Activity }) {
  return <Card className="rounded-lg p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div><div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950 dark:text-blue-300"><Icon className="h-5 w-5" /></div></div></Card>;
}

export default function XgboostModel() {
  const lookupRequestIdRef = useRef(0);
  const [selectedTreeIndex, setSelectedTreeIndex] = useState<number | null>(null);
  const [selectedTrainingAccount, setSelectedTrainingAccount] = useState<string | null>(null);
  const [lookupRequest, setLookupRequest] = useState<XgboostLookupRequest | null>(null);
  const query = useXgboostStatus();
  const status = query.data;
  const effectiveTreeIndex = selectedTreeIndex ?? status?.tree_summary.default_tree_index ?? null;
  const treeQuery = useXgboostTree(effectiveTreeIndex);
  const trainingExamplesQuery = useXgboostTrainingExamples(selectedTrainingAccount);
  const accounts = (status?.account_distribution ?? []).slice(0, 10);
  const featureGroups = Object.values((status?.feature_importance ?? []).reduce<Record<string, { label: string; importance: number }>>((groups, item) => {
    const label = signalGroup(item.feature);
    groups[label] = groups[label] || { label, importance: 0 };
    groups[label].importance += item.importance;
    return groups;
  }, {})).sort((a, b) => b.importance - a.importance);
  const totalFeatureImportance = featureGroups.reduce((sum, item) => sum + item.importance, 0);
  const features = featureGroups.map((item) => ({ ...item, share: totalFeatureImportance ? item.importance / totalFeatureImportance : 0 }));
  const analyzeTrainingExample = (example: XgboostTrainingExample) => {
    lookupRequestIdRef.current += 1;
    setLookupRequest({
      requestId: lookupRequestIdRef.current,
      vendor: example.vendor || example.name,
      amount: example.amount,
      description: example.memo || example.description,
    });
    setSelectedTrainingAccount(null);
    requestAnimationFrame(() => document.getElementById("xgboost-transaction-lookup")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return <div className="min-h-full space-y-6 pb-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold tracking-tight">XGBoost Model</h1>{status && <Badge variant={status.model_loaded ? "default" : "destructive"}>{status.model_loaded ? "Loaded" : "Unavailable"}</Badge>}<Badge variant="secondary">All portal users</Badge></div><p className="mt-1 text-muted-foreground">Understand how the accounting classifier learns patterns, evaluates trees, and produces account scores.</p></div><Button variant="outline" onClick={() => { query.refetch(); treeQuery.refetch(); }} disabled={query.isFetching || treeQuery.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching || treeQuery.isFetching ? "animate-spin" : ""}`} />Refresh</Button></div>

    {query.isPending && <div className="space-y-4"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div><div className="grid gap-4 xl:grid-cols-2"><Skeleton className="h-[420px]" /><Skeleton className="h-[420px]" /></div></div>}
    {query.isError && <Card className="border-destructive/40 p-6 text-sm text-destructive">Unable to load XGBoost telemetry. Confirm the backend is running and you have access.</Card>}

    {status && <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Training rows" value={number(status.training_summary.training_rows)} detail="Approved rows in the current model" icon={Database} />
        <Metric label="Account classes" value={number(status.training_summary.class_count)} detail="Distinct account labels" icon={Tags} />
        <Metric label="Known vendors" value={number(status.training_summary.known_vendor_count)} detail="Normalized vendor signatures" icon={BrainCircuit} />
        <Metric label="Features" value={number(status.training_summary.feature_count)} detail={status.training_summary.feature_version || "Version unavailable"} icon={Activity} />
      </div>

      <Card className="rounded-lg p-5">
        <h2 className="text-lg font-semibold">How a suggestion is made</h2><p className="mt-1 text-sm text-muted-foreground">This is the real model flow—not a vendor-to-account rule map.</p>
        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-center">{[
          ["1", "Build features", "Vendor, memo, amount, and keywords become numeric inputs."],
          ["2", "Walk every tree", `The model asks yes/no questions in ${number(status.tree_summary.tree_count)} trees.`],
          ["3", "Add leaf scores", `Each tree adds evidence to one of ${status.tree_summary.account_class_count} account classes.`],
          ["4", "Apply safeguards", "Confidence and training support decide whether to suggest or request review."],
        ].map(([step, title, detail], index) => <div className="contents" key={step}><div className="rounded-lg border bg-muted/30 p-4"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{step}</span><h3 className="mt-3 font-medium">{title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div>{index < 3 && <ArrowRight className="mx-auto hidden h-5 w-5 text-muted-foreground lg:block" />}</div>)}</div>
      </Card>

      <Card className="rounded-lg p-4"><div className="flex flex-wrap items-end gap-4"><label className="grid gap-1.5 text-sm"><span className="font-medium">Account class</span><select className="h-10 min-w-64 rounded-md border bg-background px-3" value={effectiveTreeIndex == null ? "" : effectiveTreeIndex % status.tree_summary.account_class_count} onChange={(event) => { const classIndex = Number(event.target.value); const round = effectiveTreeIndex == null ? 1 : Math.floor(effectiveTreeIndex / status.tree_summary.account_class_count) + 1; setSelectedTreeIndex((round - 1) * status.tree_summary.account_class_count + classIndex); }}>{status.tree_summary.account_classes.map((item) => <option key={item.class_index} value={item.class_index}>{accountLabel(item)}</option>)}</select></label><label className="grid gap-1.5 text-sm"><span className="font-medium">Boosting round</span><select className="h-10 min-w-32 rounded-md border bg-background px-3" value={effectiveTreeIndex == null ? "" : Math.floor(effectiveTreeIndex / status.tree_summary.account_class_count) + 1} onChange={(event) => { const round = Number(event.target.value); const classIndex = effectiveTreeIndex == null ? 0 : effectiveTreeIndex % status.tree_summary.account_class_count; setSelectedTreeIndex((round - 1) * status.tree_summary.account_class_count + classIndex); }}>{Array.from({ length: status.tree_summary.boosting_round_count }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label><p className="pb-2 text-xs text-muted-foreground">Choose any account and round to inspect the exact tree stored in the model.</p></div></Card>
      <XgboostArchitecture featureCount={status.training_summary.feature_count} treeCount={status.tree_summary.tree_count} roundCount={status.tree_summary.boosting_round_count} classCount={status.tree_summary.account_class_count} />
      <XgboostTransactionExplorer onOpenTree={setSelectedTreeIndex} lookupRequest={lookupRequest} />
      {treeQuery.isPending && <Skeleton className="h-[620px]" />}
      {treeQuery.isError && <Card className="border-destructive/40 p-5 text-sm text-destructive">Unable to load this decision tree.</Card>}
      {treeQuery.data && <XgboostTree tree={treeQuery.data} />}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-lg p-5"><h2 className="font-semibold">Where the model's examples came from</h2><p className="mt-1 text-sm text-muted-foreground">Each row is an approved transaction used for training. Select an account to see the actual transactions.</p><div className="mt-4 space-y-1">{accounts.map((account) => <button type="button" key={account.account_number} onClick={() => setSelectedTrainingAccount(account.account_number)} className="group block w-full rounded-lg p-2 text-left transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-start justify-between gap-4 text-sm"><div><p className="font-medium group-hover:text-blue-700 dark:group-hover:text-blue-300">{accountLabel(account)}</p><p className="text-xs text-muted-foreground">{percent(account.share)} of training · Click to view transactions</p></div><span className="flex shrink-0 items-center gap-1 font-semibold">{number(account.training_rows)} rows<ChevronRight className="h-4 w-4 text-muted-foreground" /></span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-blue-600" style={{ width: `${accounts[0] ? (account.training_rows / accounts[0].training_rows) * 100 : 0}%` }} /></div></button>)}</div></Card>
        <Card className="rounded-lg p-5"><h2 className="font-semibold">What evidence influences the model</h2><p className="mt-1 text-sm text-muted-foreground">Technical feature buckets are grouped into plain-language signals. A larger share means the trees rely on that type of evidence more often.</p><div className="mt-5 space-y-4">{features.map((item) => <div key={item.label}><div className="flex items-start justify-between gap-4 text-sm"><div><p className="font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{signalDescription[item.label]}</p></div><strong className="shrink-0">{percent(item.share)}</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-violet-600" style={{ width: `${features[0] ? (item.share / features[0].share) * 100 : 0}%` }} /></div></div>)}</div><p className="mt-5 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">These percentages describe model influence across its decision trees. They are not prediction confidence and do not prove that a suggestion is correct.</p></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="rounded-lg p-5"><h2 className="font-semibold">All accounts represented in training</h2><p className="mt-1 text-xs text-muted-foreground">Select any account to inspect its approved source transactions.</p><div className="mt-4 grid max-h-72 gap-2 overflow-auto sm:grid-cols-2">{status.account_distribution.map((account) => <button type="button" onClick={() => setSelectedTrainingAccount(account.account_number)} key={account.account_number} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="min-w-0 truncate font-medium" title={accountLabel(account)}>{accountLabel(account)}</span><span className="flex shrink-0 items-center gap-1 text-muted-foreground">{number(account.training_rows)} rows<ChevronRight className="h-3.5 w-3.5" /></span></button>)}</div></Card>
        <Card className="rounded-lg p-5"><h2 className="font-semibold">Readiness and safeguards</h2><div className="mt-4 space-y-3 text-sm">{[["XGBoost runtime installed", status.xgboost_installed], ["Model artifact loaded", status.model_loaded], ["Account labels available", status.label_mapping_present], ["Training metadata available", status.metadata_present]].map(([label, ready]) => <div key={String(label)} className="flex items-center justify-between border-b pb-2"><span>{label}</span><Badge variant={ready ? "secondary" : "destructive"}>{ready ? "Ready" : "Missing"}</Badge></div>)}</div><div className="mt-5 rounded-lg bg-muted p-4 text-sm"><p>Auto-code support: <strong>{status.support_thresholds.min_account_support_for_auto}</strong> account rows</p><p className="mt-1">Vendor support: <strong>{status.support_thresholds.min_vendor_support_for_auto}</strong> matching rows</p><p className="mt-1">Low-support confidence cap: <strong>{percent(status.support_thresholds.low_support_confidence_cap)}</strong></p></div><p className="mt-4 text-xs text-muted-foreground">Last model update: {status.model_updated_at ? new Date(status.model_updated_at).toLocaleString() : "Unavailable"}</p></Card>
      </div>

      <Sheet open={selectedTrainingAccount !== null} onOpenChange={(open) => { if (!open) setSelectedTrainingAccount(null); }}>
        <SheetContent className="w-[96vw] sm:max-w-4xl">
          <SheetHeader className="border-b pr-12">
            <SheetTitle>Transactions used to train this account</SheetTitle>
            <SheetDescription>{trainingExamplesQuery.data ? `${accountLabel({ account_number: trainingExamplesQuery.data.account_number, account_name: trainingExamplesQuery.data.account_name })} · Showing ${trainingExamplesQuery.data.examples.length} of ${number(trainingExamplesQuery.data.total)} approved rows` : `Account ${selectedTrainingAccount || ""}`}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5">
            {trainingExamplesQuery.isPending && <div className="space-y-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-28 w-full" />)}</div>}
            {trainingExamplesQuery.isError && <div className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">The source transactions for this model could not be loaded.</div>}
            {trainingExamplesQuery.data?.examples.length === 0 && <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No training transactions were found for this account.</div>}
            <div className="space-y-3">{trainingExamplesQuery.data?.examples.map((example) => <button type="button" onClick={() => analyzeTrainingExample(example)} key={example.source_row} className="group block w-full rounded-lg border p-4 text-left transition hover:border-blue-400 hover:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-blue-950/20"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold group-hover:text-blue-700 dark:group-hover:text-blue-300">{example.vendor || example.name || "Vendor not provided"}</p><p className="mt-0.5 text-xs text-muted-foreground">{example.company_name || "Company not provided"}</p></div><strong className={example.amount < 0 ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"}>{money(example.amount)}</strong></div><p className="mt-3 whitespace-pre-wrap break-words text-sm">{example.memo || example.description || "No memo or bank description"}</p><div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground"><span className="rounded bg-muted px-2 py-1">Approved split: {example.approved_account}</span>{example.current_account_number && <span className="rounded bg-muted px-2 py-1">Bank account: {example.current_account_number}{example.current_account_name ? ` · ${example.current_account_name}` : ""}</span>}<span className="rounded bg-muted px-2 py-1">Source row {example.source_row}</span></div><div className="mt-3 flex items-center justify-end gap-1 border-t pt-3 text-xs font-semibold text-blue-700 dark:text-blue-300"><Search className="h-3.5 w-3.5" />Analyze this transaction<ChevronRight className="h-3.5 w-3.5" /></div></button>)}</div>
          </div>
        </SheetContent>
      </Sheet>
    </>}
  </div>;
}
