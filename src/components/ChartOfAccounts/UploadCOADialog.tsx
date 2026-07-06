import { useRef, useState } from "react";
import { useReplaceChartOfAccount } from "@/hooks/useChartOfAccount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, AlertTriangle, UploadCloud, FileSpreadsheet, X, Replace } from "lucide-react";
import { toast } from "sonner";
import { useGlobalProgress } from "@/lib/GlobalProgressContext";

export default function UploadCOADialog() {
  const { addJob } = useGlobalProgress();
  const { mutateAsync: replaceCOA, isPending } = useReplaceChartOfAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleClearFile = (e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const confirmationBeforeReplace = () => {
    if (!selectedFile) return;
    setIsConfirmOpen(true);
  };

  const replaceChartOfAccounts = () => {
    if (!selectedFile) return;
    
    const promise = replaceCOA(selectedFile);
    addJob("Replace Chart of Accounts", promise, { description: "Uploading...", type: "upload", link_url: window.location.pathname });

    promise.then((data) => {
      toast.success("Sync Complete", { 
        description: data.message,
        action: { label: "Refresh", onClick: () => window.location.reload() }
      });
      setSelectedFile(null);
      setIsConfirmOpen(false);
      setIsOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }).catch((error: Error) => {
      toast.error("Sync Failed", { description: error.message });
      setIsConfirmOpen(false);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
            <Replace className="h-4 w-4" />
            Replace
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace Chart of Accounts</DialogTitle>
            <DialogDescription>
              Upload a full Excel file (.xlsx) to replace existing database records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileChange} disabled={isPending} className="hidden" id="excel-upload-dialog" ref={fileInputRef} />
            {!selectedFile ? (
              <label htmlFor="excel-upload-dialog" className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-slate-300 border-dashed rounded-md cursor-pointer hover:border-slate-400 hover:bg-slate-50 focus:outline-none">
                <span className="flex items-center space-x-2 text-slate-600">
                  <UploadCloud className="w-6 h-6" />
                  <span className="font-medium">Click to browse files</span>
                </span>
                <span className="mt-1 text-xs text-slate-500">CSV, XLSX or XLS files only</span>
              </label>
            ) : (
              <div className="flex items-center justify-between p-4 border border-blue-200 bg-blue-50 rounded-md h-32">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600 shrink-0" />
                  <div className="truncate text-sm font-medium text-blue-900">{selectedFile.name}</div>
                </div>
                <button onClick={handleClearFile} disabled={isPending} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors" title="Remove file">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button onClick={confirmationBeforeReplace} disabled={!selectedFile || isPending} className="w-full sm:w-auto" variant="destructive">
                {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing...</> : "Replace Database"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" /> Overwrite Chart of Accounts?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will completely erase the current Chart of Accounts table in database and replace it with the data from <strong className="break-all">{selectedFile?.name}</strong>.
              <br /><br />This action cannot be undone. Are you absolutely sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); replaceChartOfAccounts(); }} className="bg-red-600 hover:bg-red-700" disabled={isPending}>
              {isPending ? "Syncing..." : "Yes, Overwrite Database"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
