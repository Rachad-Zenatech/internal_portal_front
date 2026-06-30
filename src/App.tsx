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
import Users from "./pages/Configurations/Users";
import Roles from "./pages/Configurations/Roles";
import UserRoleAssignment from "./pages/Configurations/UserRoleAssignment";
import RoleNavigationPermissions from "./pages/Configurations/RoleNavigationPermissions";
import RoleMcpToolPermissions from "./pages/Configurations/RoleMcpToolPermissions";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import GeneralLedgerUpload from "./pages/GeneralLedgerUpload";
import CompanyGeneralLedger from "./pages/CompanyGeneralLedger";
import AuditLog from "./pages/Log/AuditLog";
import Login from "./pages/Login";
import PendingAccess from "./pages/PendingAccess";
import { AuthProvider } from "./lib/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/pending-access" element={<PendingAccess />} />

          {/* Main app layout routes */}
          <Route element={<ProtectedRoute><AppShell><Outlet /></AppShell></ProtectedRoute>}>
            <Route path="/" element={<ProtectedRoute navigationCode="DASHBOARD"><Dashboard /></ProtectedRoute>} />
            <Route path="/upload-files" element={<ProtectedRoute navigationCode="UPLOAD_FILES"><UploadFile /></ProtectedRoute>} />
            <Route path="/general-ledger" element={<ProtectedRoute navigationCode="GENERAL_LEDGER"><GeneralLedger /></ProtectedRoute>} />
            <Route path="/general-ledger/company" element={<Navigate to="/general-ledger" replace />} />
            <Route path="/general-ledger/company/:companyId" element={<ProtectedRoute navigationCode="GENERAL_LEDGER"><CompanyGeneralLedger /></ProtectedRoute>} />
            <Route path="/general-ledger/upload" element={<ProtectedRoute navigationCode="GENERAL_LEDGER" actionCode="IMPORT"><GeneralLedgerUpload /></ProtectedRoute>} />
            <Route path="/trial-balance" element={<ProtectedRoute navigationCode="TRIAL_BALANCE"><TrialBalance /></ProtectedRoute>} />
            <Route path="/bank-statements" element={<ProtectedRoute navigationCode="BANK_STATEMENTS"><BankStatements /></ProtectedRoute>} />
            <Route path="/consolidated-trial-balance" element={<ProtectedRoute navigationCode="CONSOLIDATED_TRIAL_BALANCE"><ConsolidatedTrailBalance /></ProtectedRoute>} />
            <Route path="/consolidated-trial-balance-matrix" element={<ProtectedRoute navigationCode="CONSOLIDATED_TRIAL_BALANCE"><ConsolidatedTrialBalanceMatrix /></ProtectedRoute>} />

            {/* Configuration Routes */}
            <Route path="/configurations" element={<Navigate to="/configurations/company" replace />} />

            {/* We use a parent route wrapper or just protect individual config routes */}
            <Route path="/configurations/chart-of-accounts" element={<ProtectedRoute navigationCode="CONFIG_CHART_OF_ACCOUNTS"><ChartOfAccounts /></ProtectedRoute>} />
            <Route path="/configurations/company" element={<ProtectedRoute navigationCode="CONFIG_COMPANY"><CompanySettings /></ProtectedRoute>} />
            <Route path="/configurations/bank" element={<ProtectedRoute navigationCode="CONFIG_BANK"><BankSettings /></ProtectedRoute>} />
            <Route path="/configurations/bank-account" element={<ProtectedRoute navigationCode="CONFIG_BANK_ACCOUNT"><BankAccountSettings /></ProtectedRoute>} />
            <Route path="/configurations/bank-feed-rules" element={<ProtectedRoute navigationCode="CONFIG_BANK_FEED_RULES"><BankFeedRules /></ProtectedRoute>} />

            <Route path="/configurations/users" element={<ProtectedRoute navigationCode="CONFIG_USERS"><Users /></ProtectedRoute>} />
            <Route path="/configurations/roles" element={<ProtectedRoute navigationCode="CONFIG_ROLES"><Roles /></ProtectedRoute>} />
            <Route path="/configurations/user-role-assignment" element={<ProtectedRoute navigationCode="CONFIG_USER_ROLE_ASSIGNMENT"><UserRoleAssignment /></ProtectedRoute>} />
            <Route path="/configurations/role-navigation-permissions" element={<ProtectedRoute navigationCode="CONFIG_ROLE_NAVIGATION_PERMISSIONS"><RoleNavigationPermissions /></ProtectedRoute>} />
            <Route path="/configurations/role-mcp-tool-permissions" element={<ProtectedRoute navigationCode="CONFIG_ROLE_MCP_TOOL_PERMISSIONS"><RoleMcpToolPermissions /></ProtectedRoute>} />

            {/* Logs */}
            <Route path="/log/audit-log" element={<ProtectedRoute navigationCode="AUDIT_LOG"><AuditLog /></ProtectedRoute>} />

            <Route path="/reports" element={<ProtectedRoute navigationCode="REPORTS"><Reports /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
