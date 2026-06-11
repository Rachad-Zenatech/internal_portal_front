// // src/pages/BankReconciliation.tsx

// import { useEffect, useState } from "react";
// import { 
//   Select, 
//   SelectContent, 
//   SelectItem, 
//   SelectTrigger, 
//   SelectValue 
// } from "@/components/ui/select";

// import type { ChartOfAccounts } from "@/types/chartOfAccount";

// export default function BankReconciliation() {


//   const [company, setCompany] = useState("");

//   const [selectedCOA, setSelectedCOA] =
//     useState("");

//   const [availableCOAs, setAvailableCOAs] =
//     useState<ChartOfAccounts>();

//   const [bankStatements, setBankStatements] =
//     useState<FileList | null>(null);

//   const [generalLedger, setGeneralLedger] =
//     useState<File | null>(null);

//   const [template, setTemplate] =
//     useState<File | null>(null);

//   const [isGenerating, setIsGenerating] =
//     useState(false);

//   // const [result, setResult] =
//   //   useState("");

//   async function loadChartOfAccounts() {
//     /*
//       Later:

//       const response = await fetch(
//         "http://localhost:8000/chart-of-accounts"
//       );

//       const data = await response.json();

//       setAvailableCOAs(data);
//     */
//   }

//   // async function generateReconciliation() {
//   //   try {
//   //     setIsGenerating(true);

//   //     const formData = new FormData();

//   //     formData.append("company", company);

//   //     formData.append(
//   //       "chartOfAccountsId",
//   //       selectedCOA
//   //     );

//   //     if (generalLedger) {
//   //       formData.append(
//   //         "generalLedger",
//   //         generalLedger
//   //       );
//   //     }

//   //     if (template) {
//   //       formData.append(
//   //         "template",
//   //         template
//   //       );
//   //     }

//   //     if (bankStatements) {
//   //       Array.from(bankStatements).forEach(
//   //         (file) => {
//   //           formData.append(
//   //             "bankStatements",
//   //             file
//   //           );
//   //         }
//   //       );
//   //     }

//   //     const response = await fetch(
//   //       "http://localhost:8000/bank-reconciliation/generate",
//   //       {
//   //         method: "POST",
//   //         body: formData,
//   //       }
//   //     );

//   //     const data = await response.json();

//   //     setResult(
//   //       data.message ??
//   //         "Reconciliation completed."
//   //     );
//   //   } catch (error) {
//   //     console.error(error);

//   //     setResult(
//   //       "Failed to generate reconciliation."
//   //     );
//   //   } finally {
//   //     setIsGenerating(false);
//   //   }
//   // }

//   // const selectedChart =
//   //   availableCOAs.find(
//   //     (coa) =>
//   //       coa.id.toString() === selectedCOA
//   //   );

//   return (
//     <div className="p-8">
//       <div className="mb-8">
//         <h1 className="text-3xl font-bold">
//           Bank Reconciliation
//         </h1>

//         <p className="text-slate-500">
//           Generate reconciliation workbooks
//           using the approved Chart of
//           Accounts.
//         </p>
//       </div>

//       <div className="rounded-xl border bg-white p-6">
//         <div className="space-y-6">

//           {/* Company */}
//           {/* <div>
//             <label className="mb-2 block font-medium">
//               Company
//             </label>

//             <Select onValueChange={(value) => console.log("Selected company ID:", value)}>
//               <SelectTrigger className="w-[280px]">
//                 <SelectValue placeholder="Select a company" />
//               </SelectTrigger>
//               <SelectContent>
//                 {result?.companies.map((company) => (
//                   <SelectItem key={company.id} value={company.id.toString()}>
//                     {company.name}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div> */}

//           {/* Chart Of Accounts */}
//           <div>
//             <label className="mb-2 block font-medium">
//               Chart Of Accounts
//             </label>

//             <select
//               value={selectedCOA}
//               onChange={(e) =>
//                 setSelectedCOA(
//                   e.target.value
//                 )
//               }
//               className="w-full rounded-lg border p-2"
//             >
//               <option value="">
//                 Select Chart Of Accounts
//               </option>

//               {/* {availableCOAs.map(
//                 (coa) => (
//                   <option
//                     key={coa.id}
//                     value={coa.id}
//                   >
//                     {coa.name}
//                   </option>
//                 )
//               )} */}
//             </select>
//           </div>

//           {/* Selected COA */}
//           {/* {selectedChart && (
//             <div className="rounded-lg border bg-slate-50 p-4">
//               <h3 className="mb-2 font-semibold">
//                 Selected Chart Of Accounts
//               </h3>

//               <div>
//                 <strong>Name:</strong>{" "}
//                 {selectedChart.name}
//               </div>

//               <div>
//                 <strong>Version:</strong>{" "}
//                 {selectedChart.version}
//               </div>
//             </div>
//           )} */}

//           {/* Bank Statements */}
//           <div>
//             <label className="mb-2 block font-medium">
//               Bank Statement PDFs
//             </label>

//             <input
//               type="file"
//               multiple
//               accept=".pdf"
//               onChange={(e) =>
//                 setBankStatements(
//                   e.target.files
//                 )
//               }
//             />
//           </div>

//           {/* General Ledger */}
//           <div>
//             <label className="mb-2 block font-medium">
//               General Ledger
//             </label>

//             <input
//               type="file"
//               accept=".xlsx,.xls"
//               onChange={(e) =>
//                 setGeneralLedger(
//                   e.target.files?.[0] ??
//                     null
//                 )
//               }
//             />
//           </div>

//           {/* Template */}
//           <div>
//             <label className="mb-2 block font-medium">
//               Reconciliation Template
//             </label>

//             <input
//               type="file"
//               accept=".xlsx,.xls"
//               onChange={(e) =>
//                 setTemplate(
//                   e.target.files?.[0] ??
//                     null
//                 )
//               }
//             />
//           </div>

//           {/* Generate */}
//           {/* <button
//             onClick={
//               generateReconciliation
//             }
//             disabled={
//               isGenerating ||
//               !selectedCOA
//             }
//             className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 disabled:bg-slate-400"
//           >
//             {isGenerating
//               ? "Generating..."
//               : "Generate Reconciliation"}
//           </button> */}

//           {/* Result */}
//           {/* {result && (
//             <div className="rounded-lg bg-slate-100 p-4">
//               {result}
//             </div>
//           )} */}
//         </div>
//       </div>
//     </div>
//   );
// }

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Upload, BarChart3 } from "lucide-react";
import StatementList        from "@/components/Bank/StatementList";
import StatementDetail      from "@/components/Bank/StatementDetail";
import QuarterlySummaryPage from "@/components/Bank/QuarterlySummary";
import UploadStatement      from "@/components/Bank/UploadStatement";

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
        <TabsList className="mb-6">
          <TabsTrigger value="statements" className="gap-2">
            <Building2 className="h-4 w-4" />
            Statements
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="quarterly" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Quarterly
          </TabsTrigger>
        </TabsList>

        {/* ── Statements tab ─────────────────────────────────────────── */}
        <TabsContent value="statements">
          {selectedId == null ? (
            <StatementList onSelect={setSelectedId} />
          ) : (
            <StatementDetail
              statementId={selectedId}
              onBack={() => setSelectedId(null)}
            />
          )}
        </TabsContent>

        {/* ── Upload tab ─────────────────────────────────────────────── */}
        <TabsContent value="upload">
          <UploadStatement onUploaded={handleUploaded} />
        </TabsContent>

        {/* ── Quarterly tab ──────────────────────────────────────────── */}
        <TabsContent value="quarterly">
          <QuarterlySummaryPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}