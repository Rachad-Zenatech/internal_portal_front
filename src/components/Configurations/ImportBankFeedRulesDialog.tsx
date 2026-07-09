import { useRef, useState } from "react";
import { useImportBankFeedRules } from "@/hooks/useBankFeedRule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, UploadCloud, FileSpreadsheet, X, DownloadCloud, AlertCircle, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useGlobalProgress } from "@/lib/GlobalProgressContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AxiosError } from "axios";

export default function ImportBankFeedRulesDialog() {
  const { addJob } = useGlobalProgress();
  const { mutateAsync: importRules, isPending } = useImportBankFeedRules();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setDuplicates([]);
    }
  };

  const handleClearFile = (e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedFile(null);
    setDuplicates([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const importBankRules = () => {
    if (!selectedFile) return;
    
    setDuplicates([]);
    const promise = importRules(selectedFile);
    addJob("Import Bank Feed Rules", promise, { description: "Importing...", type: "upload", link_url: window.location.pathname });

    promise.then(() => {
      toast.success("Successfully imported rules.");
      setSelectedFile(null);
      setIsOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }).catch((error: any) => {
      if (error instanceof AxiosError && error.response?.status === 409) {
        toast.error("Duplicate rules found", { description: "Review the duplicated rules." });
        if (error.response.data?.duplicates) {
          setDuplicates(error.response.data.duplicates);
        }
      } else {
        toast.error("Failed to import rules.", { description: error.message });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        setSelectedFile(null);
        setDuplicates([]);
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-white hover:bg-slate-50 text-slate-700">
          <DownloadCloud className="h-4 w-4 mr-2" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Import Bank Feed Rules</DialogTitle>
          <DialogDescription>
            Import QuickBooks rules. Upload a .csv or .xlsx file containing the rules.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <Input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileChange} disabled={isPending} className="hidden" id="excel-import-rules-dialog" ref={fileInputRef} />
          {!selectedFile ? (
            <label htmlFor="excel-import-rules-dialog" className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-slate-300 border-dashed rounded-md cursor-pointer hover:border-slate-400 hover:bg-slate-50 focus:outline-none">
              <span className="flex items-center space-x-2 text-slate-600">
                <UploadCloud className="w-6 h-6" />
                <span className="font-medium">Click to browse files</span>
              </span>
              <span className="mt-1 text-xs text-slate-500">CSV, XLSX or XLS files only</span>
            </label>
          ) : (
            <div className="flex flex-col gap-2 w-full overflow-hidden">
              <div className="flex items-center justify-between p-4 border border-blue-200 bg-blue-50 rounded-md h-auto min-h-[5rem] w-full overflow-hidden">
                <div className="flex items-center space-x-3 overflow-hidden flex-1 min-w-0">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600 shrink-0" />
                  <div className="text-sm font-medium text-blue-900 flex-1 min-w-0 break-all" title={selectedFile.name}>{selectedFile.name}</div>
                </div>
                <button onClick={handleClearFile} disabled={isPending} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors shrink-0 ml-2" title="Remove file">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {duplicates.length > 0 && (
                <div className="mt-2 border border-red-200 rounded-md overflow-hidden bg-red-50">
                  <Collapsible defaultOpen>
                    <div className="flex items-center justify-between px-4 py-3 bg-red-100/50">
                      <div className="flex items-center gap-2 text-red-700 font-medium text-sm">
                        <AlertCircle className="h-4 w-4" />
                        {duplicates.length} duplicate rule{duplicates.length === 1 ? '' : 's'} found
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-700 hover:bg-red-200 hover:text-red-800 rounded-full">
                          <ChevronDown className="h-4 w-4" />
                          <span className="sr-only">Toggle</span>
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <div className="px-4 py-3 text-sm text-red-600 bg-red-50/50 max-h-[150px] overflow-y-auto">
                        <p className="mb-2">The following rules already exist and were skipped:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          {duplicates.map((dup, idx) => (
                            <li key={idx} className="break-all">{dup}</li>
                          ))}
                        </ul>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button onClick={importBankRules} disabled={!selectedFile || isPending} className="w-full sm:w-auto">
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</> : "Import"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
