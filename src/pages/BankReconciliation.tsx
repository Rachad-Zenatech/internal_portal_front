import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Upload, BarChart3 } from "lucide-react";
import StatementList   from "@/components/Bank/StatementList";
import StatementDetail from "@/components/Bank/StatementDetail";
import SummaryPage     from "@/components/Bank/Summary";
import UploadStatement from "@/components/Bank/UploadStatement";

export default function BankReconciliation() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeTab,  setActiveTab]  = useState<string>("statements");

  function handleTabChange(value: string) {
    setActiveTab(value);
    setSelectedId(null);
  }

  function handleUploaded() {
    setActiveTab("statements");
    setSelectedId(null);
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">Bank Reconciliation</h1>

        <p className="text-muted-foreground">
          Upload bank statements, review the extracted data, and confirm before
          saving to the database.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        {/* Added smooth hover transitions and dynamic scale-down press effects */}
        <TabsList className="mb-8 h-12 w-max items-center justify-start gap-1 rounded-xl bg-muted p-1 border shadow-inner">
          <TabsTrigger 
            value="statements" 
            className="h-full px-5 text-sm font-semibold tracking-wide transition-all duration-200 active:scale-[0.97] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-muted-foreground/10 gap-2"
          >
            <Building2 className="h-4 w-4 transition-transform duration-200 data-[state=active]:scale-110" />
            Statements
          </TabsTrigger>
          
          <TabsTrigger 
            value="upload" 
            className="h-full px-5 text-sm font-semibold tracking-wide transition-all duration-200 active:scale-[0.97] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-muted-foreground/10 gap-2"
          >
            <Upload className="h-4 w-4 transition-transform duration-200 data-[state=active]:scale-110" />
            Upload
          </TabsTrigger>
          
          <TabsTrigger 
            value="summary" 
            className="h-full px-5 text-sm font-semibold tracking-wide transition-all duration-200 active:scale-[0.97] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-muted-foreground/10 gap-2"
          >
            <BarChart3 className="h-4 w-4 transition-transform duration-200 data-[state=active]:scale-110" />
            Summary
          </TabsTrigger>
        </TabsList>

        {/* ── Tabs Content with Added Subtle Entrance Animations ────── */}
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
          value="upload" 
          className="mt-0 outline-none transition-all duration-300 animate-in fade-in-30 slide-in-from-bottom-2"
        >
          <UploadStatement onUploaded={handleUploaded} />
        </TabsContent>

        <TabsContent 
          value="summary" 
          className="mt-0 outline-none transition-all duration-300 animate-in fade-in-30 slide-in-from-bottom-2"
        >
          <SummaryPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}