import { useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import {
  usePreviewStatement, useCommitStatement, useCompanies, useBankAccounts,
} from "@/hooks/useBank";
import type { BankStatement, StatementPreview } from "@/types/bank";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input }  from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label }  from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge }  from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AlertCircle, Upload, Building2, CreditCard, FileUp, Terminal } from "lucide-react";
import { toast } from "sonner";
import StatementPreviewReview from "./StatementPreviewReview";
import { cn } from "@/lib/utils";

interface Props { onUploaded?: (stmt: BankStatement) => void; }

export default function UploadStatement({ onUploaded }: Props) {
  const [companyId,    setCompanyId]    = useState<string>("");
  const [accountId,    setAccountId]    = useState<string>("");
  const [file,         setFile]         = useState<File | null>(null);
  const [tesseractCmd, setTesseractCmd] = useState<string>("");
  const [preview,      setPreview]      = useState<StatementPreview | null>(null);

  const { data: companies = [] } = useCompanies();
  const { data: accounts  = [] } = useBankAccounts(companyId ? Number(companyId) : null);
  const previewMut = usePreviewStatement();
  const commitMut  = useCommitStatement();

  // Derive bank_type from the selected account — no manual selection needed
  const selectedAccount = accounts.find((a) => String(a.id) === accountId);
  const bankType        = selectedAccount?.bank_type ?? "";
  const isFirstbank     = bankType === "firstbank";

  function handleCompanyChange(value: string) {
    setCompanyId(value);
    setAccountId("");
    setFile(null); // Clear active file block on corporate pipeline context shift
  }

  // Step 1 — parse the PDF and show the preview (nothing persisted yet).
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file || !accountId || !bankType) return;
    const parsed = await previewMut.mutateAsync({
      accountId:    Number(accountId),
      bankType,
      file,
      tesseractCmd: tesseractCmd || null,
    });
    setPreview(parsed);
  }

  // Step 2 — persist the reviewed preview.
  async function handleConfirm(editedPreview?: StatementPreview) {
    const finalPreview = editedPreview || preview;
    if (!finalPreview) return;
    try {
      const stmt = await commitMut.mutateAsync(finalPreview);
      toast.success("Statement added to the database", {
        description: `ID ${stmt.id} — ${stmt.statement_date}`,
      });
      setPreview(null);
      setFile(null);
      onUploaded?.(stmt);
    } catch (err) {
      toast.error("Failed to add statement to the database", {
        description: (err as Error).message,
      });
    }
  }

  // Discard the preview and return to the form.
  function handleCancel() {
    setPreview(null);
    commitMut.reset();
  }

  const toggleItemStyles = 
    "px-4 text-xs font-bold tracking-wide transition-all duration-200 active:scale-[0.97] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90";

  // ── Preview / confirm screen ─────────────────────────────────────────────
  if (preview) {
    return (
      <StatementPreviewReview
        preview={preview}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isCommitting={commitMut.isPending}
        error={commitMut.isError ? (commitMut.error as Error).message : null}
      />
    );
  }

  // ── Upload form ──────────────────────────────────────────────────────────
  return (
    <Card className="border-muted-foreground/15 shadow-sm max-w-3xl animate-in fade-in duration-200">
      <CardContent className="space-y-6 p-6">
        <div className="border-b pb-4">
          <h2 className="text-xl font-bold tracking-tight mb-1">Upload Bank Statement</h2>
          <p className="text-sm text-muted-foreground">
            Select a target company and statement account, then deploy the document pipeline tracker.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Company Selection Dropdown Wrapper */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Company
            </Label>
            <Select value={companyId} onValueChange={handleCompanyChange} required>
              <SelectTrigger className="w-full max-w-sm h-10 rounded-lg border-muted-foreground/20 font-semibold text-sm focus:ring-primary">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)} className="font-medium text-sm">
                    {c.name}
                    {c.entity && (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{c.entity}</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bank Account Toggle Group (Visible once corporate entity is defined) */}
          {companyId && (
            <div className="space-y-2 border-t pt-4 transition-all duration-300 animate-in fade-in-40 slide-in-from-top-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                Linked Account Vector
              </Label>
              
              {accounts.length === 0 ? (
                <div className="h-10 px-3 flex items-center text-xs font-semibold text-muted-foreground rounded-lg border border-dashed bg-muted/20 w-max">
                  No account channels matched to this system instance.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    className="w-max max-w-full justify-start gap-1 rounded-xl bg-muted p-1 border shadow-inner flex-wrap h-auto min-h-10"
                    value={accountId}
                    onValueChange={(v) => { if (v) setAccountId(v); }}
                  >
                    {accounts.map((a) => (
                      <ToggleGroupItem key={a.id} value={String(a.id)} className={toggleItemStyles}>
                        <span className="capitalize">{a.bank_name}</span> (****{a.account_number})
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>

                  {/* Active Auto-Resolved Parser Badge Indicator */}
                  {selectedAccount && (
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Resolved Pipeline:</span>
                      <Badge className="text-xs bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-bold border-none hover:bg-sky-100/80 tracking-wide uppercase px-2 py-0">
                        {bankType}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Interactive Drag Drop-Zone Style File Input Container */}
          {accountId && (
            <div className="space-y-2 border-t pt-4 transition-all duration-300 animate-in fade-in-40 slide-in-from-top-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileUp className="h-3.5 w-3.5" />
                Target Ledger Document (PDF)
              </Label>
              
              <div className="relative group border-2 border-dashed border-muted-foreground/20 rounded-xl hover:border-primary/40 transition-colors bg-muted/5 hover:bg-muted/10 p-5 flex flex-col items-center justify-center text-center gap-2">
                <Input
                  type="file"
                  accept=".pdf"
                  required
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setFile(e.target.files?.[0] ?? null)
                  }
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <div className="p-3 bg-background border rounded-lg shadow-sm group-hover:scale-105 transition-transform duration-200">
                  <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {file ? file.name : "Select or drag statement PDF"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "System ledger files capped at 32MB standard"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Advanced OCR Parsing Environment Path Override Fields */}
          {isFirstbank && (
            <div className="space-y-2 border-t pt-4 transition-all duration-300 animate-in fade-in-40 slide-in-from-top-2">
              <Label htmlFor="tesseract" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5" />
                OCR Engine Binary Path
                <span className="text-[10px] bg-muted px-1 rounded font-normal text-muted-foreground lowercase">win-only</span>
              </Label>
              <Input
                id="tesseract"
                type="text"
                value={tesseractCmd}
                onChange={(e) => setTesseractCmd(e.target.value)}
                placeholder="C:/Program Files/Tesseract-OCR/tesseract.exe"
                className="w-full h-10 rounded-lg border-muted-foreground/20 font-mono text-xs focus-visible:ring-primary placeholder:text-muted-foreground/40 bg-muted/20"
              />
            </div>
          )}

          {/* Form Action Infrastructure Button Container Row */}
          <div className="pt-3 border-t flex flex-col gap-3">
            <Button
              type="submit"
              disabled={previewMut.isPending || !file || !accountId}
              className="w-max gap-2 px-5 font-bold text-sm shadow-sm transition-transform active:scale-95 self-end"
            >
              <Upload className={cn("h-4 w-4", previewMut.isPending && "animate-bounce")} />
              {previewMut.isPending ? "Parsing Ledger Pipeline..." : "Execute Upload & Preview"}
            </Button>

            {previewMut.isError && (
              <Alert variant="destructive" className="rounded-xl border-destructive/20 bg-destructive/5 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="font-semibold text-xs tracking-wide">
                  {(previewMut.error as Error).message}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}