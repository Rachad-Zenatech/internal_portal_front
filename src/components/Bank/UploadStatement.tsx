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
import { AlertCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import StatementPreviewReview from "./StatementPreviewReview";

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
  async function handleConfirm() {
    if (!preview) return;
    try {
      const stmt = await commitMut.mutateAsync(preview);
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
    <Card>
      <CardContent className="space-y-6 p-6">
        <div>
          <h2 className="text-xl font-semibold">Upload Bank Statement</h2>
          <p className="text-sm text-muted-foreground">
            Select a company and bank account, then upload a PDF. You'll review
            the extracted data before it's saved to the database.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* Company */}
      <div className="flex flex-col gap-1.5">
        <Label>Company</Label>
        <Select value={companyId} onValueChange={handleCompanyChange} required>
          <SelectTrigger>
            <SelectValue placeholder="Select a company" />
          </SelectTrigger>
          <SelectContent>
            {companies.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
                {c.entity && (
                  <span className="ml-2 text-xs text-muted-foreground">{c.entity}</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bank account — filtered by selected company */}
      {companyId && (
        <div className="flex flex-col gap-1.5">
          <Label>Bank account</Label>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No bank accounts linked to this company.
            </p>
          ) : (
            <Select value={accountId} onValueChange={setAccountId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a bank account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.bank_name} — ****{a.account_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Bank type resolved automatically — shown as read-only badge */}
          {selectedAccount && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">Parser:</span>
              <Badge variant="secondary" className="text-xs">{bankType}</Badge>
            </div>
          )}
        </div>
      )}

      {/* PDF file */}
      {accountId && (
        <div className="flex flex-col gap-1.5">
          <Label>PDF file</Label>
          <Input
            type="file"
            accept=".pdf"
            required
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setFile(e.target.files?.[0] ?? null)
            }
          />
        </div>
      )}

      {/* Tesseract path — only for firstbank, Windows only */}
      {isFirstbank && (
        <div className="flex flex-col gap-1.5">
          <Label>
            Tesseract path
            <span className="ml-2 text-xs text-muted-foreground">(Windows only)</span>
          </Label>
          <Input
            type="text"
            value={tesseractCmd}
            onChange={(e) => setTesseractCmd(e.target.value)}
            placeholder="C:/Program Files/Tesseract-OCR/tesseract.exe"
          />
        </div>
      )}

      <Button
        type="submit"
        disabled={previewMut.isPending || !file || !accountId}
        className="self-start gap-2"
      >
        <Upload className="h-4 w-4" />
        {previewMut.isPending ? "Parsing…" : "Upload & preview"}
      </Button>

      {previewMut.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{(previewMut.error as Error).message}</AlertDescription>
        </Alert>
      )}
        </form>
      </CardContent>
    </Card>
  );
}