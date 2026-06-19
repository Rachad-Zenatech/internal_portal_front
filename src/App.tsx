import AppShell from "./components/AppShell/AppShell";
import Dashboard from "./pages/Dashboard";
import BankStatements from "./pages/BankStatements";
import GeneralLedger from "./pages/GeneralLedger";
import Reports from "./pages/Reports";
import TrialBalance from "./pages/TrialBalance";
import UploadFile from "./pages/UploadFiles" 
import ConsolidatedTrailBalance from "./pages/ConsolidatedTrailBalance";
import ConsolidatedTrialBalanceMatrix from "./pages/ConsolidatedTrialBalanceMatrix";
import ChartOfAccounts from "./pages/ChartOfAccounts";
import CompanySettings from "./pages/Settings/CompanySettings";
import BankSettings from "./pages/Settings/BankSettings";
import BankAccountSettings from "./pages/Settings/BankAccountSettings";
import { BrowserRouter,  Routes, Route, Navigate } from "react-router-dom";
import GeneralLedgerUpload from "./pages/GeneralLedgerUpload";
import CompanyGeneralLedger from "./pages/CompanyGeneralLedger";
function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload-files" element={<UploadFile/>} />
          <Route path="/general-ledger" element={<GeneralLedger />} />
           <Route path="/general-ledger/company/:companyId" element={<CompanyGeneralLedger />} />
      <Route path="/general-ledger/upload" element={<GeneralLedgerUpload />} />
          <Route path="/trial-balance" element={<TrialBalance/>} />
          <Route
            path="/bank-statements"
            element={<BankStatements />}
          />
          <Route
            path="/consolidated-trial-balance"
            element={<ConsolidatedTrailBalance />}
          />
          <Route
            path="/consolidated-trial-balance-matrix"
            element={<ConsolidatedTrialBalanceMatrix />}
          />
          <Route
            path="/chart-of-accounts"
            element={<ChartOfAccounts />}
          />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Navigate to="/settings/company" replace />} />
          <Route path="/settings/company" element={<CompanySettings />} />
          <Route path="/settings/bank" element={<BankSettings />} />
          <Route path="/settings/bank-account" element={<BankAccountSettings />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
