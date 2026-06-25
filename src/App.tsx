import AppShell from "./components/AppShell/AppShell";
import Dashboard from "./pages/Dashboard";
import BankStatements from "./pages/BankStatements";
import GeneralLedger from "./pages/GeneralLedger";
import Reports from "./pages/Reports";
import TrialBalance from "./pages/TrialBalance";
import UploadFile from "./pages/UploadFiles" 
import ConsolidatedTrailBalance from "./pages/ConsolidatedTrailBalance";
import ConsolidatedTrialBalanceMatrix from "./pages/ConsolidatedTrialBalanceMatrix";
import ChartOfAccounts from "./pages/Configurations/ChartOfAccounts";
import CompanySettings from "./pages/Configurations/CompanySettings";
import BankSettings from "./pages/Configurations/BankSettings";
import BankAccountSettings from "./pages/Configurations/BankAccountSettings";
import BankFeedRules from "./pages/Configurations/BankFeedRules";
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
            path="/configurations/chart-of-accounts"
            element={<ChartOfAccounts />}
          />
          <Route path="/reports" element={<Reports />} />
          <Route path="/configurations" element={<Navigate to="/configurations/company" replace />} />
          <Route path="/configurations/company" element={<CompanySettings />} />
          <Route path="/configurations/bank" element={<BankSettings />} />
          <Route path="/configurations/bank-account" element={<BankAccountSettings />} />
          <Route path="/configurations/bank-feed-rules" element={<BankFeedRules />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
