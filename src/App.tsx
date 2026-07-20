import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "./lib/AuthContext";
import { GlobalProgressProvider } from "./lib/GlobalProgressContext";
import ProtectedRoute from "./components/ProtectedRoute";

const AppShell = lazy(() => import("./components/AppShell/AppShell"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const BankStatements = lazy(() => import("./pages/BankStatements"));
const GeneralLedger = lazy(() => import("./pages/GeneralLedger"));
const Reports = lazy(() => import("./pages/Reports"));
const TrialBalance = lazy(() => import("./pages/TrialBalance"));
const UploadFile = lazy(() => import("./pages/UploadFiles"));
const ConsolidatedTrailBalance = lazy(() => import("./pages/ConsolidatedTrailBalance"));
const ConsolidatedTrialBalanceMatrix = lazy(() => import("./pages/ConsolidatedTrialBalanceMatrix"));
const ChartOfAccounts = lazy(() => import("./pages/Configurations/ChartOfAccounts"));
const CompanySettings = lazy(() => import("./pages/Configurations/CompanySettings"));
const BankSettings = lazy(() => import("./pages/Configurations/BankSettings"));
const BankAccountSettings = lazy(() => import("./pages/Configurations/BankAccountSettings"));
const BankFeedRules = lazy(() => import("./pages/Configurations/BankFeedRules"));
const BusinessContacts = lazy(() => import("./pages/Configurations/BusinessContacts"));
const BankStatementPreview = lazy(() => import("./pages/BankStatementPreview"));
const Users = lazy(() => import("./pages/Configurations/Users"));
const Roles = lazy(() => import("./pages/Configurations/Roles"));
const UserRoleAssignment = lazy(() => import("./pages/Configurations/UserRoleAssignment"));
const RoleGroupPermissions = lazy(() => import("./pages/Configurations/RoleGroupPermissions"));
const RoleApiPermissions = lazy(() => import("./pages/Configurations/RoleApiPermissions"));
const RoleMcpToolPermissions = lazy(() => import("./pages/Configurations/RoleMcpToolPermissions"));
const XgboostModel = lazy(() => import("./pages/Configurations/XgboostModel"));
const GeneralLedgerUpload = lazy(() => import("./pages/GeneralLedgerUpload"));
const CompanyGeneralLedger = lazy(() => import("./pages/CompanyGeneralLedger"));
const AuditLog = lazy(() => import("./pages/Log/AuditLog"));
const Login = lazy(() => import("./pages/Login"));
const PendingAccess = lazy(() => import("./pages/PendingAccess"));

function App() {
  return (
    <AuthProvider>
      <GlobalProgressProvider>
        <BrowserRouter>
        <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/pending-access" element={<PendingAccess />} />

          {/* Main app layout routes */}
          <Route element={<ProtectedRoute><AppShell><Outlet /></AppShell></ProtectedRoute>}>
            <Route path="/" element={<ProtectedRoute navigationCode="DASHBOARD"><Dashboard /></ProtectedRoute>} />
            <Route path="/upload-files" element={<ProtectedRoute navigationCode="UPLOAD_FILES"><UploadFile /></ProtectedRoute>} />
            <Route path="/general-ledger" element={<ProtectedRoute navigationCode="GENERAL_LEDGER"><GeneralLedger /></ProtectedRoute>} />
            <Route path="/general-ledger/company" element={<Navigate to="/general-ledger" replace />} />
            <Route path="/general-ledger/company/:companyId" element={<ProtectedRoute navigationCode="GENERAL_LEDGER_COMPANY"><CompanyGeneralLedger /></ProtectedRoute>} />
            <Route path="/general-ledger/upload" element={<ProtectedRoute navigationCode="GENERAL_LEDGER_UPLOAD" actionCode="CREATE"><GeneralLedgerUpload /></ProtectedRoute>} />
            <Route path="/trial-balance" element={<ProtectedRoute navigationCode="TRIAL_BALANCE"><TrialBalance /></ProtectedRoute>} />
            <Route path="/bank-statements" element={<ProtectedRoute navigationCode="BANK_STATEMENTS"><BankStatements /></ProtectedRoute>} />
            <Route path="/bank-statements/:bankStatementId/preview" element={<ProtectedRoute navigationCode="BANK_STATEMENT_PREVIEW"><BankStatementPreview /></ProtectedRoute>} />
            <Route path="/consolidated-trial-balance" element={<ProtectedRoute navigationCode="CONSOLIDATED_TRIAL_BALANCE"><ConsolidatedTrailBalance /></ProtectedRoute>} />
            <Route path="/consolidated-trial-balance-matrix" element={<ProtectedRoute navigationCode="CONSOLIDATED_TRIAL_BALANCE_MATRIX"><ConsolidatedTrialBalanceMatrix /></ProtectedRoute>} />

            {/* Configuration Routes */}
            <Route path="/configurations" element={<Navigate to="/configurations/company" replace />} />

            {/* We use a parent route wrapper or just protect individual config routes */}
            <Route path="/configurations/chart-of-accounts" element={<ProtectedRoute navigationCode="CONFIG_CHART_OF_ACCOUNTS"><ChartOfAccounts /></ProtectedRoute>} />
            <Route path="/configurations/company" element={<ProtectedRoute navigationCode="CONFIG_COMPANY"><CompanySettings /></ProtectedRoute>} />
            <Route path="/configurations/bank" element={<ProtectedRoute navigationCode="CONFIG_BANK"><BankSettings /></ProtectedRoute>} />
            <Route path="/configurations/bank-account" element={<ProtectedRoute navigationCode="CONFIG_BANK_ACCOUNT"><BankAccountSettings /></ProtectedRoute>} />
            <Route path="/configurations/bank-feed-rules" element={<ProtectedRoute navigationCode="CONFIG_BANK_FEED_RULES"><BankFeedRules /></ProtectedRoute>} />
            <Route path="/configurations/business-contacts" element={<ProtectedRoute navigationCode="CONFIG_BUSINESS_CONTACTS"><BusinessContacts /></ProtectedRoute>} />

            <Route path="/configurations/users" element={<ProtectedRoute navigationCode="CONFIG_USERS"><Users /></ProtectedRoute>} />
            <Route path="/configurations/roles" element={<ProtectedRoute navigationCode="CONFIG_ROLES"><Roles /></ProtectedRoute>} />
            <Route path="/configurations/user-role-assignment" element={<ProtectedRoute navigationCode="CONFIG_USER_ROLE_ASSIGNMENT"><UserRoleAssignment /></ProtectedRoute>} />
            <Route path="/configurations/role-group-permissions" element={<ProtectedRoute navigationCode="CONFIG_ROLES"><RoleGroupPermissions /></ProtectedRoute>} />
            <Route path="/configurations/role-api-permissions" element={<ProtectedRoute navigationCode="CONFIG_ROLE_API_PERMISSIONS"><RoleApiPermissions /></ProtectedRoute>} />
            <Route path="/configurations/role-mcp-tool-permissions" element={<ProtectedRoute navigationCode="CONFIG_ROLE_MCP_TOOL_PERMISSIONS"><RoleMcpToolPermissions /></ProtectedRoute>} />
            <Route path="/configurations/xgboost-model" element={<ProtectedRoute navigationCode="GENERAL_LEDGER_UPLOAD" actionCode="UPDATE"><XgboostModel /></ProtectedRoute>} />

            {/* Logs */}
            <Route path="/log" element={<Navigate to="/log/audit-log" replace />} />
            <Route path="/log/audit-log" element={<ProtectedRoute navigationCode="AUDIT_LOG"><AuditLog /></ProtectedRoute>} />

            <Route path="/reports" element={<ProtectedRoute navigationCode="REPORTS"><Reports /></ProtectedRoute>} />
          </Route>
        </Routes>
        </Suspense>
      </BrowserRouter>
      </GlobalProgressProvider>
    </AuthProvider>
  );
}

export default App;
