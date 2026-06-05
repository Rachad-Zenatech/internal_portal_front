// src/pages/BankReconciliation.tsx

import { useEffect, useState } from "react";

interface ChartOfAccounts {
  id: number;
  name: string;
  version: string;
}

export default function BankReconciliation() {
  const [company, setCompany] = useState("LE");

  const [selectedCOA, setSelectedCOA] =
    useState("");

  const [availableCOAs, setAvailableCOAs] =
    useState<ChartOfAccounts[]>([]);

  const [bankStatements, setBankStatements] =
    useState<FileList | null>(null);

  const [generalLedger, setGeneralLedger] =
    useState<File | null>(null);

  const [template, setTemplate] =
    useState<File | null>(null);

  const [isGenerating, setIsGenerating] =
    useState(false);

  const [result, setResult] =
    useState("");

  useEffect(() => {
    loadChartOfAccounts();
  }, []);

  async function loadChartOfAccounts() {
    /*
      Later:

      const response = await fetch(
        "http://localhost:8000/chart-of-accounts"
      );

      const data = await response.json();

      setAvailableCOAs(data);
    */

    setAvailableCOAs([
      {
        id: 1,
        name: "ZenaTech_USA_COA_2026",
        version: "2026",
      },
      {
        id: 2,
        name: "ZenaTech_CAN_COA_2026",
        version: "2026",
      },
      {
        id: 3,
        name: "ZenaDrone_COA_2026",
        version: "2026",
      },
    ]);
  }

  async function generateReconciliation() {
    try {
      setIsGenerating(true);

      const formData = new FormData();

      formData.append("company", company);

      formData.append(
        "chartOfAccountsId",
        selectedCOA
      );

      if (generalLedger) {
        formData.append(
          "generalLedger",
          generalLedger
        );
      }

      if (template) {
        formData.append(
          "template",
          template
        );
      }

      if (bankStatements) {
        Array.from(bankStatements).forEach(
          (file) => {
            formData.append(
              "bankStatements",
              file
            );
          }
        );
      }

      const response = await fetch(
        "http://localhost:8000/bank-reconciliation/generate",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      setResult(
        data.message ??
          "Reconciliation completed."
      );
    } catch (error) {
      console.error(error);

      setResult(
        "Failed to generate reconciliation."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  const selectedChart =
    availableCOAs.find(
      (coa) =>
        coa.id.toString() === selectedCOA
    );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Bank Reconciliation
        </h1>

        <p className="text-slate-500">
          Generate reconciliation workbooks
          using the approved Chart of
          Accounts.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-6">
        <div className="space-y-6">

          {/* Company */}
          <div>
            <label className="mb-2 block font-medium">
              Company
            </label>

            <select
              value={company}
              onChange={(e) =>
                setCompany(e.target.value)
              }
              className="w-full rounded-lg border p-2"
            >
              <option value="LE">
                Lescure Engineers
              </option>

              <option value="ZT">
                ZenaTech
              </option>

              <option value="ZD">
                ZenaDrone
              </option>
            </select>
          </div>

          {/* Chart Of Accounts */}
          <div>
            <label className="mb-2 block font-medium">
              Chart Of Accounts
            </label>

            <select
              value={selectedCOA}
              onChange={(e) =>
                setSelectedCOA(
                  e.target.value
                )
              }
              className="w-full rounded-lg border p-2"
            >
              <option value="">
                Select Chart Of Accounts
              </option>

              {availableCOAs.map(
                (coa) => (
                  <option
                    key={coa.id}
                    value={coa.id}
                  >
                    {coa.name}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Selected COA */}
          {selectedChart && (
            <div className="rounded-lg border bg-slate-50 p-4">
              <h3 className="mb-2 font-semibold">
                Selected Chart Of Accounts
              </h3>

              <div>
                <strong>Name:</strong>{" "}
                {selectedChart.name}
              </div>

              <div>
                <strong>Version:</strong>{" "}
                {selectedChart.version}
              </div>
            </div>
          )}

          {/* Bank Statements */}
          <div>
            <label className="mb-2 block font-medium">
              Bank Statement PDFs
            </label>

            <input
              type="file"
              multiple
              accept=".pdf"
              onChange={(e) =>
                setBankStatements(
                  e.target.files
                )
              }
            />
          </div>

          {/* General Ledger */}
          <div>
            <label className="mb-2 block font-medium">
              General Ledger
            </label>

            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) =>
                setGeneralLedger(
                  e.target.files?.[0] ??
                    null
                )
              }
            />
          </div>

          {/* Template */}
          <div>
            <label className="mb-2 block font-medium">
              Reconciliation Template
            </label>

            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) =>
                setTemplate(
                  e.target.files?.[0] ??
                    null
                )
              }
            />
          </div>

          {/* Generate */}
          <button
            onClick={
              generateReconciliation
            }
            disabled={
              isGenerating ||
              !selectedCOA
            }
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 disabled:bg-slate-400"
          >
            {isGenerating
              ? "Generating..."
              : "Generate Reconciliation"}
          </button>

          {/* Result */}
          {result && (
            <div className="rounded-lg bg-slate-100 p-4">
              {result}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}