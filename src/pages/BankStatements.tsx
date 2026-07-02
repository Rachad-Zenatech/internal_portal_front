import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import StatementList   from "@/components/Bank/StatementList";
import StatementDetail from "@/components/Bank/StatementDetail";
import SummaryPage     from "@/components/Bank/Summary";
import UploadStatement from "@/components/Bank/UploadStatement";

export default function BankStatements() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeTab,  setActiveTab]  = useState<string>("statements");
  
  // Drawer and Upload State
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);

  function handleTabChange(value: string) {
    setActiveTab(value);
    setSelectedId(null);
  }

  function handleUploadStart(file: File, promise: Promise<any>) {
    setUploadingFile(file.name);
    setIsDrawerOpen(false); // Close drawer immediately

    promise.then(() => {
      setUploadingFile(null);
      toast.success("Bank statement processed", {
        description: `Successfully uploaded ${file.name}.`,
      });
      // Return to statements view to see the new upload
      setActiveTab("statements");
      setSelectedId(null);
    }).catch((err) => {
      setUploadingFile(null);
      toast.error("Upload failed", {
        description: err.message || "Failed to process bank statement",
      });
    });
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bank Statements</h1>
          <p className="text-muted-foreground mt-1">
            Upload bank statements, review the extracted data, and confirm before
            saving to the database.
          </p>
        </div>
        <Button onClick={() => setIsDrawerOpen(true)} className="gap-2 font-bold shadow-sm">
          <Upload className="h-4 w-4" />
          Upload Statement
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList variant="line" className="mb-8">
          <TabsTrigger value="statements" className="flex items-center gap-2">
            Statements
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent 
          value="statements" 
          className="mt-0 outline-none transition-all duration-300 animate-in fade-in-30 slide-in-from-bottom-2"
        >
          {selectedId == null ? (
            <StatementList onSelect={setSelectedId} />
          ) : (
            <StatementDetail
              statementId={selectedId}
              onBack={() => setSelectedId(null)}
            />
          )}
        </TabsContent>

        <TabsContent 
          value="summary" 
          className="mt-0 outline-none transition-all duration-300 animate-in fade-in-30 slide-in-from-bottom-2"
        >
          <SummaryPage />
        </TabsContent>
      </Tabs>

      {/* Right-side Drawer for Uploading */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg overflow-y-auto border-l shadow-2xl sm:p-8">
          <SheetHeader className="mb-8 border-b pb-6">
            <SheetTitle className="text-2xl font-bold">Upload Statement</SheetTitle>
            <SheetDescription>
              Select a target company and statement account, then deploy the document pipeline tracker.
            </SheetDescription>
          </SheetHeader>
          <UploadStatement onUploadStart={handleUploadStart} isUploading={!!uploadingFile} />
        </SheetContent>
      </Sheet>

      {/* Floating Overlay for Background Upload Progress */}
      {uploadingFile && (
        <div className="fixed bottom-6 left-6 z-50 animate-in slide-in-from-bottom-6 fade-in duration-300">
          <div className="bg-background border shadow-xl rounded-xl p-4 flex items-center gap-4 min-w-[300px] max-w-[400px]">
            <div className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold text-foreground truncate mr-2">
                  {uploadingFile}
                </span>
                <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin shrink-0" />
              </div>
              <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden relative shadow-inner">
                <div 
                  className="bg-primary h-full absolute left-0 top-0 w-1/3 animate-[progress_1s_ease-in-out_infinite]"
                  style={{
                    animationName: "indeterminate",
                    animationDuration: "1.5s",
                    animationIterationCount: "infinite",
                    animationTimingFunction: "ease-in-out",
                  }}
                />
              </div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1.5">
                Processing Document...
              </p>
            </div>
          </div>
          <style>{`
            @keyframes indeterminate {
              0% { left: -33%; width: 33%; }
              50% { width: 50%; }
              100% { left: 100%; width: 33%; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}