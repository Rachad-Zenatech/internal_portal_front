import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Upload, BarChart3 } from "lucide-react";
import StatementList   from "@/components/Bank/StatementList";
import StatementDetail from "@/components/Bank/StatementDetail";
import SummaryPage     from "@/components/Bank/Summary";
import UploadStatement from "@/components/Bank/UploadStatement";

export default function BankStatements() {
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
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div>
        <h1 className="text-3xl font-bold">Bank Statements</h1>

        <p className="text-muted-foreground">
          Upload bank statements, review the extracted data, and confirm before
          saving to the database.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList variant="line" className="mb-8">
          <TabsTrigger value="statements" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Statements
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
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