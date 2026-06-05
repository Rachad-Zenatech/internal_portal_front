import AppShell from "./components/AppShell/AppShell";
import Dashboard from "./pages/Dashboard";
import AiAssistant from "./pages/AIAssistant";
import BankReconciliation from "./pages/BankReconciliation";
import GeneralLedger from "./pages/GeneralLedger";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings"; 
import TrialBalance from "./pages/TrialBalance";
import UploadFile from "./pages/UploadFiles" 
import { BrowserRouter,  Routes, Route } from "react-router-dom";
function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ai-assistant" element={<AiAssistant />} />
          <Route path="/upload-files" element={<UploadFile/>} />
          <Route path="/general-ledger" element={<GeneralLedger />} />
          <Route path="/trial-balance" element={<TrialBalance/>} />
          <Route
            path="/bank-reconciliation"
            element={<BankReconciliation />}
          />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
