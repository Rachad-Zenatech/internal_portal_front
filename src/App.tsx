import AppShell from "./components/AppShell/AppShell";
import Dashboard from "./pages/Dashboard";
import AiAssistant from "./pages/AIAssistant";
import BankStatements from "./pages/BankStatements";
import GeneralLedger from "./pages/GeneralLedger";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings"; 
import TrialBalance from "./pages/TrialBalance";
import UploadFile from "./pages/UploadFiles" 
import ConsolidatedTrailBalance from "./pages/ConsolidatedTrailBalance";
import ChartOfAccounts from "./pages/ChartOfAccounts";
import { BrowserRouter,  Routes, Route } from "react-router-dom";
import GeneralLedgerUpload from "./pages/GeneralLedgerUpload";
import CompanyGeneralLedger from "./pages/CompanyGeneralLedger";
function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ai-assistant" element={<AiAssistant />} />
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
            path="/chart-of-accounts"
            element={<ChartOfAccounts />}
          />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
