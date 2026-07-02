import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import StatementList   from "@/components/Bank/StatementList";
import StatementDetail from "@/components/Bank/StatementDetail";
import SummaryPage     from "@/components/Bank/Summary";
import UploadStatement from "@/components/Bank/UploadStatement";
import { useGlobalProgress } from "@/lib/GlobalProgressContext";

export default function BankStatements() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeTab,  setActiveTab]  = useState<string>("statements");
  
  // Drawer and Upload State
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const { addJob } = useGlobalProgress();

  function handleTabChange(value: string) {
    setActiveTab(value);
    setSelectedId(null);
  }

  function handleUploadStart(file: File, promise: Promise<any>) {
    addJob(file.name, promise, { description: "Processing Document...", type: "document" });
    setIsDrawerOpen(false); // Close drawer immediately

    promise.then(() => {
      toast.success("Bank statement uploaded", {
        description: `Successfully uploaded ${file.name}. It is now processing in the background.`,
      });
      // Return to statements view to see the new upload
      setActiveTab("statements");
      setSelectedId(null);
    }).catch((err) => {
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : "Failed to start upload process",
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
          <UploadStatement onUploadStart={handleUploadStart} isUploading={false} />
        </SheetContent>
      </Sheet>
    </div>
  );
}