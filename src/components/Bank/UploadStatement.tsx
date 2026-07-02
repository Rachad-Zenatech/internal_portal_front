import { useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import {
  useCompanies, useBankAccounts,
} from "@/hooks/useBank";
import { apiClient } from "@/services/apiClient";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input }  from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label }  from "@/components/ui/label";
import { Badge }  from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Upload, Building2, CreditCard, FileUp, Terminal, Loader2 } from "lucide-react";

interface Props { 
  onUploadStart: (file: File, promise: Promise<any>) => void; 
  isUploading?: boolean;
}

export default function UploadStatement({ onUploadStart, isUploading = false }: Props) {
  const [companyId,    setCompanyId]    = useState<string>("");
  const [accountId,    setAccountId]    = useState<string>("");
  const [file,         setFile]         = useState<File | null>(null);
  const [tesseractCmd, setTesseractCmd] = useState<string>("");
  // ── Form State ───────────────────────────────────────────────────────────

  const { data: companies = [] } = useCompanies();
  const { data: accounts  = [] } = useBankAccounts(companyId ? Number(companyId) : null);

  // Derive bank_type from the selected account — no manual selection needed
  const selectedAccount = accounts.find((a) => String(a.id) === accountId);
  const bankType        = selectedAccount?.bank_type ?? "";
  const isFirstbank     = bankType === "firstbank";

  function handleCompanyChange(value: string) {
    setCompanyId(value);
    setAccountId("");
    setFile(null); // Clear active file block on corporate pipeline context shift
  }

  // Submit file and pass promise to parent
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file || !accountId || !bankType) return;
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("account_id", accountId);
    formData.append("bank_type", bankType);
    if (tesseractCmd) {
      formData.append("tesseract_cmd", tesseractCmd);
    }
    
    const promise = apiClient.post<any>("/api/bank-statements/upload", formData).then(async (res) => {
      const statementId = res?.bankStatementId;
      if (!statementId) return res;

      // Poll until processing_status is 'completed' or 'failed'
      while (true) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const stmt = await apiClient.get<any>(`/api/bank-statements/${statementId}`);
        if (stmt.processing_status === "ready" || stmt.processing_status === "completed") {
          return stmt;
        }
        if (stmt.processing_status === "failed") {
          throw new Error(stmt.error_message || "Processing failed");
        }
      }
    });
    
    onUploadStart(file, promise);
  }

  const toggleItemStyles = 
    "px-4 text-xs font-bold tracking-wide transition-all duration-200 active:scale-[0.97] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90";

  // ── Upload form ──────────────────────────────────────────────────────────
  return (
    <div className="w-full animate-in fade-in duration-200">
      <div className="space-y-6">

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Company Selection Dropdown Wrapper */}
          <div className="space-y-3">
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
            <div className="space-y-3 border-t pt-6 transition-all duration-300 animate-in fade-in-40 slide-in-from-top-2">
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
            <div className="space-y-3 border-t pt-6 transition-all duration-300 animate-in fade-in-40 slide-in-from-top-2">
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
            <div className="space-y-3 border-t pt-6 transition-all duration-300 animate-in fade-in-40 slide-in-from-top-2">
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

          <div className="pt-6 border-t flex flex-col gap-4">
            <Button
              type="submit"
              disabled={!file || !accountId || isUploading}
              className="w-full gap-2 px-5 font-bold text-sm shadow-sm transition-transform active:scale-95"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload & Process
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}