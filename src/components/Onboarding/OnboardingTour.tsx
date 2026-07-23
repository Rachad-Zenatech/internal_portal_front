import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Database,
  Download,
  FileSpreadsheet,
  FlaskConical,
  Loader2,
  LockKeyhole,
  Play,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/AuthContext";
import { useCompleteOnboarding } from "@/hooks/useOnboarding";
import { toast } from "sonner";
import {
  ONBOARDING_ACTIVE_DATASET_KEY,
  ONBOARDING_NAVIGATION_EVENT,
  ONBOARDING_SESSION_EVENT,
  type OnboardingNavigationFocus,
  type OnboardingSessionState,
} from "@/lib/onboardingEvents";

const CURRENT_ONBOARDING_VERSION = 3;
const ONBOARDING_PRACTICE_EVENT = "onboarding-practice-start";
const ONBOARDING_DEMO_SAMPLE_EVENT = "onboarding-demo-sample";
const ONBOARDING_TARGET_REFRESH_EVENT = "onboarding-target-refresh";

type DemoKind = "gl" | "bank";

interface TourStep {
  id: string;
  title: string;
  description: string;
  path?: string;
  navigationCode?: string;
  actionCode?: string;
  selector?: string;
  demo?: DemoKind;
  bullets?: string[];
}

interface ResolvedTourStep extends TourStep {
  hasAccess: boolean;
}

interface TrainingTab {
  label: string;
  description: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to the finance portal",
    description:
      "This guided tour visits every area available to your role. It includes safe sample uploads that never call a save endpoint or write to the database.",
    bullets: [
      "The tour follows your permissions.",
      "Demo uploads stay in this browser tab.",
      "You can restart the tour from the help button at any time.",
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    description:
      "Start here for operating totals, financial trends, and a quick view of the companies and periods that need attention.",
    path: "/",
    navigationCode: "DASHBOARD",
  },
  {
    id: "uploaded-files",
    title: "Uploaded file archive",
    description:
      "Review source files that were intentionally saved by real workflows. Demo files from this tour never appear here.",
    path: "/upload-files",
    navigationCode: "UPLOAD_FILES",
  },
  {
    id: "general-ledger",
    title: "General Ledger",
    description:
      "Choose a company book, inspect import history, open saved ledgers, and monitor upload jobs.",
    path: "/general-ledger",
    navigationCode: "GENERAL_LEDGER",
  },
  {
    id: "gl-demo",
    title: "Try a General Ledger upload",
    description:
      "Run a realistic browser-only GL upload. The sample is generated here, validated here, and discarded when the tour closes.",
    path: "/general-ledger/upload",
    navigationCode: "GENERAL_LEDGER_UPLOAD",
    actionCode: "CREATE",
    demo: "gl",
  },
  {
    id: "bank-statements",
    title: "Bank Statements",
    description:
      "Upload real statements here, review extracted transactions, and confirm them before they become accounting data.",
    path: "/bank-statements",
    navigationCode: "BANK_STATEMENTS",
  },
  {
    id: "bank-demo",
    title: "Try a bank statement upload",
    description:
      "This sample demonstrates extraction and balancing without sending a file to the server or creating a database record.",
    path: "/bank-statements",
    navigationCode: "BANK_STATEMENTS",
    demo: "bank",
  },
  {
    id: "trial-balance",
    title: "Trial Balance",
    description:
      "Review debits, credits, account balances, and period filters for a selected company.",
    path: "/trial-balance",
    navigationCode: "TRIAL_BALANCE",
  },
  {
    id: "consolidated-overview",
    title: "Consolidated Trial Balance overview",
    description:
      "Review consolidated balances across companies while retaining the source company context.",
    path: "/consolidated-trial-balance",
    navigationCode: "CONSOLIDATED_TRIAL_BALANCE",
  },
  {
    id: "consolidated-matrix",
    title: "Consolidated Trial Balance matrix",
    description:
      "Compare companies and reporting groups in a consolidated matrix while preserving each underlying ledger.",
    path: "/consolidated-trial-balance-matrix",
    navigationCode: "CONSOLIDATED_TRIAL_BALANCE_MATRIX",
  },
  {
    id: "reports",
    title: "Reports",
    description:
      "Open the reporting workspace for financial statements and operational analysis.",
    path: "/reports",
    navigationCode: "REPORTS",
  },
  {
    id: "companies",
    title: "Company configuration",
    description:
      "Maintain companies and their GL-book assignments. Assignments are explicit so uploads cannot silently choose a book.",
    path: "/configurations/company",
    navigationCode: "CONFIG_COMPANY",
  },
  {
    id: "banks",
    title: "Bank configuration",
    description:
      "Maintain the institutions used by bank accounts and statement workflows.",
    path: "/configurations/bank",
    navigationCode: "CONFIG_BANK",
  },
  {
    id: "bank-accounts",
    title: "Bank account configuration",
    description:
      "Connect company accounts to banks and identify the account used by each statement.",
    path: "/configurations/bank-account",
    navigationCode: "CONFIG_BANK_ACCOUNT",
  },
  {
    id: "bank-rules",
    title: "Bank feed rules",
    description:
      "Review deterministic coding rules. Rules are evaluated before model suggestions and must resolve to an active chart-of-accounts target.",
    path: "/configurations/bank-feed-rules",
    navigationCode: "CONFIG_BANK_FEED_RULES",
  },
  {
    id: "contacts",
    title: "Business contacts",
    description:
      "Maintain customer and vendor references used for A/R and A/P payment recognition.",
    path: "/configurations/business-contacts",
    navigationCode: "CONFIG_BUSINESS_CONTACTS",
  },
  {
    id: "coa",
    title: "Chart of Accounts",
    description:
      "Create, edit, enable, or disable accounts. Disabled accounts remain in history but cannot be selected by uploads, rules, AI, or XGBoost.",
    path: "/configurations/chart-of-accounts",
    navigationCode: "CONFIG_CHART_OF_ACCOUNTS",
  },
  {
    id: "users",
    title: "Users",
    description:
      "Manage SSO-backed user records and active status. Passwords are not stored in this portal.",
    path: "/configurations/users",
    navigationCode: "CONFIG_USERS",
  },
  {
    id: "roles",
    title: "Roles",
    description:
      "Define job roles and organize access without granting permissions directly to individual screens.",
    path: "/configurations/roles",
    navigationCode: "CONFIG_ROLES",
  },
  {
    id: "role-assignments",
    title: "Role assignments",
    description:
      "Move approved users out of pending access and assign the roles appropriate to their work.",
    path: "/configurations/user-role-assignment",
    navigationCode: "CONFIG_USER_ROLE_ASSIGNMENT",
  },
  {
    id: "role-permissions",
    title: "Role permissions",
    description:
      "Control which actions each role may perform across accounting and administration modules.",
    path: "/configurations/role-group-permissions",
    navigationCode: "CONFIG_ROLES",
  },
  {
    id: "role-api-permissions",
    title: "Role API permissions",
    description:
      "Inspect the lower-level API actions available to each role when detailed access review is required.",
    path: "/configurations/role-api-permissions",
    navigationCode: "CONFIG_ROLE_API_PERMISSIONS",
  },
  {
    id: "mcp-permissions",
    title: "AI tool permissions",
    description:
      "Control which MCP tools a role may use when working with the portal AI assistant.",
    path: "/configurations/role-mcp-tool-permissions",
    navigationCode: "CONFIG_ROLE_MCP_TOOL_PERMISSIONS",
  },
  {
    id: "xgboost",
    title: "XGBoost model",
    description:
      "Inspect model health, active account classes, guarded training evidence, and prediction explanations.",
    path: "/configurations/xgboost-model",
    navigationCode: "GENERAL_LEDGER_UPLOAD",
    actionCode: "UPDATE",
  },
  {
    id: "audit",
    title: "Audit Log",
    description:
      "Review authentication activity and important administrative changes.",
    path: "/log/audit-log",
    navigationCode: "AUDIT_LOG",
  },
  {
    id: "search",
    title: "Search across the portal",
    description:
      "Use global search to find companies, active accounts, GL entries, and bank transactions.",
    selector: "[data-onboarding-practice='search']",
  },
  {
    id: "assistant",
    title: "Ask ZenaBot",
    description:
      "Use the assistant for explanations and permitted tasks. It follows your role and MCP-tool permissions.",
    selector: "[data-onboarding-practice='assistant']",
  },
  {
    id: "finish",
    title: "You’re ready",
    description:
      "The tour is complete. Real uploads always show a review or confirmation step before saving; the samples you tried were never sent to the backend.",
    bullets: [
      "Use the help button to replay this tour.",
      "Only active accounts can be used for new accounting activity.",
      "Ask an administrator if a page you need is not available.",
    ],
  },
];

interface TourModule {
  id: string;
  title: string;
  stepIds: string[];
}

interface PracticeTask {
  title: string;
  instructions: string;
  startLabel: string;
  finishLabel: string;
  feedback: string;
}

const TOUR_MODULES: TourModule[] = [
  { id: "dashboard", title: "Dashboard", stepIds: ["dashboard"] },
  { id: "uploaded-files", title: "Uploaded Files", stepIds: ["uploaded-files"] },
  { id: "general-ledger", title: "General Ledger", stepIds: ["general-ledger", "gl-demo"] },
  { id: "bank-statements", title: "Bank Statements", stepIds: ["bank-statements", "bank-demo"] },
  { id: "trial-balance", title: "Trial Balance", stepIds: ["trial-balance"] },
  { id: "consolidated", title: "Consolidated Trial Balance", stepIds: ["consolidated-overview", "consolidated-matrix"] },
  { id: "reports", title: "Reports", stepIds: ["reports"] },
  { id: "companies", title: "Companies", stepIds: ["companies"] },
  { id: "banks", title: "Banks", stepIds: ["banks"] },
  { id: "bank-accounts", title: "Bank Accounts", stepIds: ["bank-accounts"] },
  { id: "bank-rules", title: "Bank Feed Rules", stepIds: ["bank-rules"] },
  { id: "contacts", title: "Business Contacts", stepIds: ["contacts"] },
  { id: "coa", title: "Chart of Accounts", stepIds: ["coa"] },
  { id: "users", title: "Users", stepIds: ["users"] },
  { id: "roles", title: "Roles", stepIds: ["roles"] },
  { id: "role-assignments", title: "Role Assignments", stepIds: ["role-assignments"] },
  { id: "role-permissions", title: "Role Permissions", stepIds: ["role-permissions"] },
  { id: "role-api-permissions", title: "Role API Permissions", stepIds: ["role-api-permissions"] },
  { id: "mcp-permissions", title: "AI Tool Permissions", stepIds: ["mcp-permissions"] },
  { id: "xgboost", title: "XGBoost Model", stepIds: ["xgboost"] },
  { id: "audit", title: "Audit Log", stepIds: ["audit"] },
  { id: "search", title: "Global Search", stepIds: ["search"] },
  { id: "assistant", title: "ZenaBot", stepIds: ["assistant"] },
];

const PRACTICE_TASKS: Record<string, PracticeTask> = {
  dashboard: {
    title: "Filter the dashboard",
    instructions: "Choose Northstar Demo LLC and the Monthly period, then apply the fake filters.",
    startLabel: "Choose demo filters",
    finishLabel: "Apply filters",
    feedback: "The fake dashboard now shows Northstar Demo LLC for the monthly period.",
  },
  "uploaded-files": {
    title: "Find an uploaded file",
    instructions: "Search the fake archive for demo-gl-july.csv and open its preview.",
    startLabel: "Search demo files",
    finishLabel: "Open fake preview",
    feedback: "The fake file preview opened without reading the real upload archive.",
  },
  "trial-balance": {
    title: "Inspect an account balance",
    instructions: "Filter to Northstar Demo LLC and inspect account 1000 Demo Checking.",
    startLabel: "Select company",
    finishLabel: "Inspect account 1000",
    feedback: "You opened the fake account detail and verified its sample balance.",
  },
  "consolidated-matrix": {
    title: "Review an elimination",
    instructions: "Open Demo Eliminations and verify that account 2460 nets to zero.",
    startLabel: "Open eliminations",
    finishLabel: "Verify zero balance",
    feedback: "The fake intercompany account reconciles to $0.00.",
  },
  reports: {
    title: "Generate a report preview",
    instructions: "Select the Reconciliation Report and generate a browser-only preview.",
    startLabel: "Select report",
    finishLabel: "Generate fake preview",
    feedback: "The fake reconciliation report is ready; no report was stored.",
  },
  companies: {
    title: "Add a company",
    instructions: "Open the Add Company form, choose fictional company details, and save the training record.",
    startLabel: "Open Add Company",
    finishLabel: "Create fake company",
    feedback: "The fictional company was added to the browser-only company table.",
  },
  banks: {
    title: "Add a bank",
    instructions: "Open the Add Bank form, choose a fictional institution and type, and save it.",
    startLabel: "Open Add Bank",
    finishLabel: "Create fake bank",
    feedback: "The fictional bank was added to the browser-only bank table.",
  },
  "bank-accounts": {
    title: "Add a bank account",
    instructions: "Choose a fake company, bank, and masked account number, then save the mapping.",
    startLabel: "Open Add Bank Account",
    finishLabel: "Create fake account",
    feedback: "The fictional bank account was added and mapped to Northstar Demo LLC.",
  },
  "bank-rules": {
    title: "Add and test a rule",
    instructions: "Choose a fake condition and active target account, then save the browser-only rule.",
    startLabel: "Open Add Rule",
    finishLabel: "Create fake rule",
    feedback: "The fake rule was added with active target 6400 Demo Office Supplies.",
  },
  contacts: {
    title: "Add a contact alias",
    instructions: "Open Example Customer and add the fake alias EXAMPLE CUSTOMER INC.",
    startLabel: "Open demo contact",
    finishLabel: "Add fake alias",
    feedback: "The fake alias is now shown in the browser-only contact preview.",
  },
  coa: {
    title: "Disable an unused account",
    instructions: "Open fake account 2460 Demo Intercompany and disable it.",
    startLabel: "Open account 2460",
    finishLabel: "Disable fake account",
    feedback: "Account 2460 is disabled in the training preview and blocked from new activity.",
  },
  users: {
    title: "Add an SSO user",
    instructions: "Choose a fictional name and email, leave the account active, and create it without a password.",
    startLabel: "Open Add New User",
    finishLabel: "Create fake SSO user",
    feedback: "The fictional SSO user was added without a password field.",
  },
  roles: {
    title: "Create a role",
    instructions: "Choose a fictional role name, code, and department, then save it.",
    startLabel: "Open Create Role",
    finishLabel: "Create fake role",
    feedback: "The fictional role was added to the browser-only hierarchy.",
  },
  "role-assignments": {
    title: "Assign a role",
    instructions: "Select Morgan Sample and assign the Demo Accountant role.",
    startLabel: "Select pending user",
    finishLabel: "Assign fake role",
    feedback: "Morgan Sample now has Demo Accountant in the browser-only preview.",
  },
  "role-permissions": {
    title: "Grant a module permission",
    instructions: "Select Demo Accountant, open General Ledger, and allow View access.",
    startLabel: "Select demo role",
    finishLabel: "Save fake module access",
    feedback: "Demo Accountant now has fake View access to General Ledger; unrelated actions were unchanged.",
  },
  "role-api-permissions": {
    title: "Grant an API permission",
    instructions: "Select Demo Accountant, open Accounting / General Ledger, and allow Read access.",
    startLabel: "Open fake API module",
    finishLabel: "Save fake endpoint access",
    feedback: "The selected fake Accounting API now allows Read; Create, Update, and Delete were unchanged.",
  },
  "mcp-permissions": {
    title: "Grant an AI tool permission",
    instructions: "Select Demo Accountant and allow only search_chart_of_accounts.",
    startLabel: "Select fake tool",
    finishLabel: "Save fake tool access",
    feedback: "Demo Accountant can now use the fake chart search tool; save_general_ledger remains blocked.",
  },
  xgboost: {
    title: "Inspect a model prediction",
    instructions: "Open the fake office-supplies prediction and review its training evidence.",
    startLabel: "Load fake prediction",
    finishLabel: "Review evidence",
    feedback: "The fake prediction, confidence, and guarded training evidence were reviewed.",
  },
  audit: {
    title: "Find an audit event",
    instructions: "Filter Actions for the fake account-disable event.",
    startLabel: "Filter fake events",
    finishLabel: "Open audit detail",
    feedback: "The fake audit event shows who, what, when, and the successful result.",
  },
  search: {
    title: "Run a global search",
    instructions: "Search for fake account 6400 Demo Office Supplies.",
    startLabel: "Enter fake search",
    finishLabel: "View results",
    feedback: "The fake active account appears in the permitted search results.",
  },
  assistant: {
    title: "Ask the assistant",
    instructions: "Send a fake question asking why account 2460 is disabled.",
    startLabel: "Prepare fake question",
    finishLabel: "Send training question",
    feedback: "ZenaBot explains that the fake account is historical and blocked from new activity.",
  },
};

type PracticeKind =
  | "filter"
  | "search"
  | "add"
  | "disable"
  | "assign"
  | "permission"
  | "generate"
  | "review"
  | "assistant";

const PRACTICE_KINDS: Record<string, PracticeKind> = {
  dashboard: "filter",
  "uploaded-files": "search",
  "trial-balance": "filter",
  "consolidated-matrix": "review",
  reports: "generate",
  companies: "add",
  banks: "add",
  "bank-accounts": "add",
  "bank-rules": "add",
  contacts: "add",
  coa: "disable",
  users: "add",
  roles: "add",
  "role-assignments": "assign",
  "role-permissions": "permission",
  "role-api-permissions": "permission",
  "mcp-permissions": "permission",
  xgboost: "review",
  audit: "search",
  search: "search",
  assistant: "assistant",
};

interface PracticeControls {
  primaryLabel: string;
  primaryOptions: string[];
  secondaryLabel?: string;
  secondaryOptions?: string[];
  toggleLabel?: string;
}

const PRACTICE_CONTROLS: Record<string, PracticeControls> = {
  dashboard: {
    primaryLabel: "Company",
    primaryOptions: ["Northstar Demo LLC"],
    secondaryLabel: "Period",
    secondaryOptions: ["Monthly"],
  },
  "uploaded-files": {
    primaryLabel: "Search query",
    primaryOptions: ["demo-gl-july.csv"],
  },
  "trial-balance": {
    primaryLabel: "Company",
    primaryOptions: ["Northstar Demo LLC"],
    secondaryLabel: "Account",
    secondaryOptions: ["1000 Demo Checking"],
  },
  "consolidated-matrix": {
    primaryLabel: "Matrix tab",
    primaryOptions: ["Demo Eliminations"],
    toggleLabel: "I verified account 2460 totals $0.00",
  },
  reports: {
    primaryLabel: "Report",
    primaryOptions: ["Reconciliation Report"],
    secondaryLabel: "Format",
    secondaryOptions: ["Browser preview"],
  },
  companies: {
    primaryLabel: "Company name",
    primaryOptions: ["Northstar Training Co."],
    secondaryLabel: "GL book",
    secondaryOptions: ["Demo Standard GL"],
    toggleLabel: "Active company",
  },
  banks: {
    primaryLabel: "Bank name",
    primaryOptions: ["Training Savings Bank"],
    secondaryLabel: "Type",
    secondaryOptions: ["Commercial"],
    toggleLabel: "Active bank",
  },
  "bank-accounts": {
    primaryLabel: "Company",
    primaryOptions: ["Northstar Demo LLC"],
    secondaryLabel: "Bank and account",
    secondaryOptions: ["Demo Community Bank · •••• 7788"],
    toggleLabel: "Active account",
  },
  "bank-rules": {
    primaryLabel: "Condition",
    primaryOptions: ["Description contains DEMO OFFICE"],
    secondaryLabel: "Target account",
    secondaryOptions: ["6400 Demo Office Supplies"],
    toggleLabel: "Active rule",
  },
  contacts: {
    primaryLabel: "Contact",
    primaryOptions: ["Example Customer"],
    secondaryLabel: "Alias",
    secondaryOptions: ["EXAMPLE CUSTOMER INC."],
    toggleLabel: "Active contact",
  },
  coa: {
    primaryLabel: "Account",
    primaryOptions: ["2460 Demo Intercompany"],
  },
  users: {
    primaryLabel: "Full name",
    primaryOptions: ["Taylor Training"],
    secondaryLabel: "SSO email",
    secondaryOptions: ["taylor.training@demo.invalid"],
    toggleLabel: "Active account",
  },
  roles: {
    primaryLabel: "Role",
    primaryOptions: ["Demo Reviewer"],
    secondaryLabel: "Department",
    secondaryOptions: ["Finance Training"],
    toggleLabel: "Active role",
  },
  "role-assignments": {
    primaryLabel: "Pending user",
    primaryOptions: ["Morgan Sample"],
    secondaryLabel: "Role",
    secondaryOptions: ["Demo Accountant"],
  },
  "role-permissions": {
    primaryLabel: "Role",
    primaryOptions: ["Demo Accountant"],
    secondaryLabel: "Module",
    secondaryOptions: ["General Ledger"],
    toggleLabel: "Allow View",
  },
  "role-api-permissions": {
    primaryLabel: "Role",
    primaryOptions: ["Demo Accountant"],
    secondaryLabel: "API module",
    secondaryOptions: ["Accounting / General Ledger"],
    toggleLabel: "Allow Read",
  },
  "mcp-permissions": {
    primaryLabel: "Role",
    primaryOptions: ["Demo Accountant"],
    secondaryLabel: "AI tool",
    secondaryOptions: ["search_chart_of_accounts"],
    toggleLabel: "Allow tool",
  },
  xgboost: {
    primaryLabel: "Prediction",
    primaryOptions: ["Demo Office Supply Co. → 6400"],
    toggleLabel: "I reviewed the fake training evidence",
  },
  audit: {
    primaryLabel: "Action filter",
    primaryOptions: ["Disabled demo account 2460"],
  },
  search: {
    primaryLabel: "Search query",
    primaryOptions: ["6400 Demo Office Supplies"],
  },
  assistant: {
    primaryLabel: "Training question",
    primaryOptions: ["Why is demo account 2460 disabled?"],
  },
};

const DEFAULT_TABS: TrainingTab[] = [
  {
    label: "Overview",
    description: "See the purpose of this area and the main actions available here.",
  },
];

const TRAINING_TABS: Record<string, TrainingTab[]> = {
  welcome: [{ label: "Tour", description: "Learn the portal with fake, browser-only examples." }],
  dashboard: [
    { label: "Overview", description: "Review sample totals and items needing attention." },
    { label: "Cash & Banking", description: "Compare fake cash positions and bank activity." },
    { label: "Activity", description: "See recent sample workflow activity." },
  ],
  "uploaded-files": [
    { label: "All Files", description: "Browse files saved by real completed workflows." },
    { label: "General Ledgers", description: "Filter the archive to saved GL source files." },
    { label: "Bank Statements", description: "Filter the archive to saved statement files." },
  ],
  "general-ledger": [
    { label: "Company Books", description: "Open the explicitly assigned ledger for a company." },
    { label: "Upload Queue", description: "Monitor pending imports before they are saved." },
    { label: "Import History", description: "Review completed and cancelled import activity." },
  ],
  "gl-demo": [
    { label: "Select Book", description: "Choose the company and assigned GL book." },
    { label: "Upload", description: "Add a source file for browser-only validation." },
    { label: "Review", description: "Check mappings, dates, debits, and credits." },
    { label: "Save", description: "In a real workflow, confirm only after review." },
  ],
  "bank-statements": [
    { label: "Statements", description: "Review saved statements by company and bank account." },
    { label: "Upload Queue", description: "See statements waiting for review." },
    { label: "Review", description: "Validate extracted transactions before confirmation." },
  ],
  "bank-demo": [
    { label: "Upload", description: "Choose a sample statement file." },
    { label: "Extract", description: "Preview locally extracted sample transactions." },
    { label: "Reconcile", description: "Compare opening, activity, and ending balances." },
    { label: "Confirm", description: "In a real workflow, approve the reviewed statement." },
  ],
  "trial-balance": [
    { label: "Trial Balance", description: "Compare fake debit, credit, and closing balances." },
    { label: "Account Detail", description: "Drill into the sample activity behind a balance." },
  ],
  "consolidated-overview": [
    { label: "Overview", description: "See sample group-level balances." },
    { label: "Companies", description: "Compare each demo company's contribution." },
    { label: "Eliminations", description: "Review sample intercompany eliminations." },
  ],
  "consolidated-matrix": [
    { label: "Group Matrix", description: "Compare sample reporting groups across columns." },
    { label: "Company Matrix", description: "Compare demo companies account by account." },
    { label: "Reconciliation", description: "Find sample differences requiring review." },
  ],
  reports: [
    { label: "Financial Reports", description: "Run sample balance sheet and income reports." },
    { label: "Operational Reports", description: "Review fake workflow and exception reporting." },
  ],
  companies: [
    { label: "Companies", description: "Maintain company identity and active status." },
    { label: "GL Books", description: "Maintain the available ledger formats." },
    { label: "Assignments", description: "Explicitly connect companies to GL books." },
  ],
  banks: [
    { label: "Banks", description: "Maintain financial institutions used in the portal." },
    { label: "Details", description: "Review identifiers and status for a selected bank." },
  ],
  "bank-accounts": [
    { label: "Accounts", description: "Maintain company bank accounts." },
    { label: "Company Mapping", description: "Connect each account to the correct demo company." },
  ],
  "bank-rules": [
    { label: "Rules", description: "Maintain deterministic transaction coding rules." },
    { label: "Import", description: "Review rules prepared for import." },
    { label: "Classification Test", description: "Test a fake description without saving it." },
  ],
  contacts: [
    { label: "Customers", description: "Maintain sample customer references." },
    { label: "Vendors", description: "Maintain sample vendor references." },
    { label: "Aliases", description: "Match alternate payment names to a contact." },
  ],
  coa: [
    { label: "All Accounts", description: "Review the complete sample chart of accounts." },
    { label: "Active", description: "See accounts available to uploads, rules, and AI." },
    { label: "Disabled", description: "See historical accounts blocked from new activity." },
  ],
  users: [
    { label: "Users", description: "Manage SSO-backed user records and active status." },
    { label: "Pending Access", description: "Review signed-in users awaiting a role." },
    { label: "Login Activity", description: "Review sample authentication activity." },
  ],
  roles: [
    { label: "Roles", description: "Maintain role names and responsibilities." },
    { label: "Hierarchy", description: "Understand inherited access relationships." },
  ],
  "role-assignments": [
    { label: "Pending Users", description: "Review people waiting for access." },
    { label: "Assignments", description: "Connect approved users to suitable roles." },
  ],
  "role-permissions": [
    { label: "Permission Groups", description: "Review module access for a role." },
    { label: "Actions", description: "Control view, create, update, and delete abilities." },
  ],
  "role-api-permissions": [
    { label: "Modules", description: "Browse detailed backend permission areas." },
    { label: "Endpoints", description: "Inspect actions allowed for individual routes." },
  ],
  "mcp-permissions": [
    { label: "Tools", description: "Review AI tools registered with the portal." },
    { label: "Role Access", description: "Control which roles may invoke each tool." },
  ],
  xgboost: [
    { label: "Overview", description: "Review fake model health and guarded coverage." },
    { label: "Training Data", description: "Inspect sanitized sample features and labels." },
    { label: "Model Tree", description: "Understand sample decision paths." },
    { label: "Predictions", description: "Review fake classifications and confidence." },
  ],
  audit: [
    { label: "Audit Events", description: "Review sample administrative changes." },
    { label: "Login Activity", description: "Review fake authentication events." },
  ],
  search: [
    { label: "Results", description: "Find permitted records across portal modules." },
    { label: "Ask AI", description: "Turn a search into a permitted assistant question." },
  ],
  assistant: [
    { label: "Chat", description: "Ask questions about permitted portal information." },
    { label: "Attachments", description: "Add supported files for an assistant task." },
    { label: "Tools", description: "See the actions your role allows the assistant to use." },
  ],
  finish: [{ label: "Complete", description: "Finish now or replay the tour later from Help." }],
};

const ORIGINAL_TABS: Partial<Record<string, TrainingTab[]>> = {
  "bank-statements": [
    { label: "Statements", description: "Browse and review uploaded statements." },
    { label: "Summary", description: "Review summarized bank activity." },
  ],
  "consolidated-matrix": [
    { label: "Demo DaaS", description: "Compare the fake DaaS company group." },
    { label: "Demo SaaS", description: "Compare the fake SaaS company group." },
    { label: "Demo Eliminations", description: "Review fake elimination balances." },
  ],
  contacts: [
    { label: "A/R Customers (3)", description: "Sample customer contacts mapped to receivables." },
    { label: "A/P Payees (4)", description: "Sample payees mapped to accounts payable." },
  ],
  audit: [
    { label: "Actions", description: "Sample administrative changes." },
    { label: "Login Activities", description: "Sample SSO authentication events." },
  ],
};

interface TrainingPageFormat {
  title: string;
  subtitle: string;
  action?: string;
  search?: string;
  filters?: string[];
  columns: string[];
  rows: string[][];
  metrics?: Array<[string, string]>;
  layout?: "dashboard" | "split" | "upload" | "model" | "table";
}

const PAGE_FORMATS: Partial<Record<string, TrainingPageFormat>> = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Overview of financial position, bank activity, and accounting workflow.",
    filters: ["All Companies", "Monthly"],
    columns: ["Date", "Description", "Company", "Amount"],
    rows: [
      ["Jul 22, 2026", "Demo customer receipt", "Northstar Demo LLC", "$1,250.00"],
      ["Jul 21, 2026", "Sample office purchase", "Practice Company Ltd.", "($128.45)"],
    ],
    metrics: [["Cash Balance", "$84,250"], ["Revenue", "$32,100"], ["Expenses", "$18,640"], ["Net Income", "$13,460"]],
    layout: "dashboard",
  },
  "uploaded-files": {
    title: "Upload Files",
    subtitle: "Manage uploaded source files and their storage status.",
    search: "Search files...",
    columns: ["File", "Type", "Context", "Uploaded", "Size", "Stored", "Actions"],
    rows: [
      ["demo-gl-july.csv", "General Ledger", "Northstar Demo LLC", "Jul 22, 2026", "24 KB", "Yes", "View"],
      ["sample-statement.pdf", "Bank Statement", "Practice Company Ltd.", "Jul 21, 2026", "118 KB", "Yes", "View"],
    ],
  },
  "general-ledger": {
    title: "General Ledger Dashboard",
    subtitle: "View GL imports and transactions by company, book, and period.",
    action: "Upload New GL",
    filters: ["All Companies", "Select Period", "2026", "All Books"],
    columns: ["Company", "Book / Entity", "Imports", "GL Lines", "Last Import", "Actions"],
    rows: [
      ["Northstar Demo LLC", "Demo Standard GL", "3", "1,248", "Jul 22, 2026", "Open"],
      ["Practice Company Ltd.", "Demo Standard GL", "2", "814", "Jul 18, 2026", "Open"],
    ],
    metrics: [["Companies", "3"], ["Imports", "7"], ["GL Lines", "2,486"], ["Pending", "1"]],
  },
  "gl-demo": {
    title: "Upload General Ledger",
    subtitle: "Select a company book, upload a file, review it, then save.",
    action: "Use sample file",
    filters: ["Northstar Demo LLC", "Demo Standard GL"],
    columns: ["Date", "Type", "Name", "Current Target", "Suggested Target", "Debit", "Credit", "Status"],
    rows: [
      ["Jul 1, 2026", "Check", "Demo Office Supply Co.", "—", "6400 Demo Office Supplies", "—", "$128.45", "Review"],
      ["Jul 3, 2026", "Deposit", "Example Customer", "1200 Demo A/R", "1200 Demo A/R", "$1,250.00", "—", "Ready"],
    ],
    layout: "upload",
  },
  "bank-statements": {
    title: "Bank Statements",
    subtitle: "Upload bank statements, review extracted data, and confirm before saving to the database.",
    action: "Upload Statement",
    search: "Search statements...",
    columns: ["Statement", "Company", "Bank Account", "Period", "Ending Balance", "Status"],
    rows: [
      ["sample-july-statement.pdf", "Northstar Demo LLC", "Demo Bank • 0042", "Jul 2026", "$6,121.55", "Ready"],
      ["practice-june-statement.csv", "Practice Company Ltd.", "Sample Credit Union • 8831", "Jun 2026", "$9,842.10", "Confirmed"],
    ],
  },
  "bank-demo": {
    title: "Upload Statement",
    subtitle: "Select a target company and statement account, then review the document pipeline.",
    action: "Use sample file",
    filters: ["Northstar Demo LLC", "Demo Bank • 0042"],
    columns: ["Date", "Description", "Reference", "Debit", "Credit", "Balance"],
    rows: [
      ["Jul 1, 2026", "Opening Balance", "OPEN", "—", "—", "$5,000.00"],
      ["Jul 2, 2026", "Demo Office Supply Co.", "POS-1001", "$128.45", "—", "$4,871.55"],
      ["Jul 3, 2026", "Example Customer", "ACH-220", "—", "$1,250.00", "$6,121.55"],
    ],
    layout: "upload",
  },
  "trial-balance": {
    title: "Trial Balance",
    subtitle: "Review account balances for a selected company and period.",
    filters: ["Northstar Demo LLC", "Select Period"],
    search: "Search account code or description...",
    columns: ["Account Number", "Account Name", "Type", "Debit", "Credit", "Balance"],
    rows: [
      ["1000", "Demo Checking", "Bank", "$8,250.00", "—", "$8,250.00"],
      ["6400", "Demo Office Supplies", "Expense", "$128.45", "—", "$128.45"],
    ],
  },
  "consolidated-overview": {
    title: "Consolidated Trial Balance",
    subtitle: "View reconciled book and bank balances across companies.",
    filters: ["Annual", "2026"],
    columns: ["Company", "Entity", "Book Balance", "Bank Balance", "Difference", "Status"],
    rows: [
      ["Northstar Demo LLC", "Demo DaaS", "$84,250.00", "$84,250.00", "$0.00", "Balanced"],
      ["Practice Company Ltd.", "Demo SaaS", "$41,800.00", "$41,750.00", "$50.00", "Review"],
    ],
  },
  "consolidated-matrix": {
    title: "Consolidated Trial Balance",
    subtitle: "Chart of Accounts matrix by company group.",
    filters: ["Annual", "2026", "Companies"],
    columns: ["Account", "Description", "Northstar Demo", "Practice Company", "Total"],
    rows: [
      ["1000", "Demo Checking", "$8,250.00", "$4,100.00", "$12,350.00"],
      ["2460", "Demo Intercompany", "($2,000.00)", "$2,000.00", "$0.00"],
    ],
  },
  reports: {
    title: "Reports",
    subtitle: "Generate financial and reconciliation reports.",
    columns: ["Report", "Description", "Format", "Action"],
    rows: [
      ["Reconciliation Report", "Compare fake book and bank balances", "PDF / Excel", "Generate"],
      ["Trial Balance Report", "Export the demo trial balance", "Excel", "Generate"],
    ],
  },
  companies: {
    title: "Company Settings",
    subtitle: "Manage companies and their accounting configuration.",
    action: "Add Company",
    search: "Search companies...",
    columns: ["Name", "Entity", "Group", "State", "Country", "Description", "Actions"],
    rows: [["Northstar Demo LLC", "Demo DaaS", "Training Group", "Ontario", "Canada", "Fake onboarding company", "Edit"]],
  },
  banks: {
    title: "Bank Settings",
    subtitle: "Manage banks used by statement and account workflows.",
    action: "Add Bank",
    search: "Search banks...",
    columns: ["Name", "Type", "Notes", "Actions"],
    rows: [["Demo Community Bank", "Commercial", "Fictional training institution", "Edit"]],
  },
  "bank-accounts": {
    title: "Bank Account Settings",
    subtitle: "Manage company bank accounts.",
    action: "Add Bank Account",
    search: "Search accounts...",
    columns: ["Company", "Bank", "Account Number", "Actions"],
    rows: [["Northstar Demo LLC", "Demo Community Bank", "•••• 0042", "Edit"]],
  },
  "bank-rules": {
    title: "Bank Feed Rules",
    subtitle: "Manage deterministic transaction classification rules.",
    action: "Add Rule",
    search: "Search rules...",
    columns: ["Rule", "Conditions", "Target Account", "Priority", "Status", "Actions"],
    rows: [["Demo office supplies", "Description contains “DEMO OFFICE”", "6400 Demo Office Supplies", "10", "Active", "Edit"]],
  },
  contacts: {
    title: "Business Contacts",
    subtitle: "Maintain customer and payee references for payment recognition.",
    action: "Add Contact",
    search: "Search AR and AP contacts...",
    columns: ["Contact", "Aliases", "Mapped Account", "Status", "Actions"],
    rows: [["Example Customer", "EXAMPLE CUSTOMER INC", "1100 Demo Accounts Receivable", "Active", "Edit"]],
  },
  coa: {
    title: "Chart of Accounts",
    subtitle: "Manage the permanent account list used by the accounting system.",
    action: "Add Account",
    search: "Search accounts...",
    columns: ["Account Number", "Account Name", "Account Type", "Detail Type", "Status", "Actions"],
    rows: [
      ["1000", "Demo Checking", "Bank", "Checking", "Active", "Edit"],
      ["2460", "Demo Intercompany", "Other Current Liabilities", "Other Current Liabilities", "Disabled", "Enable"],
      ["6400", "Demo Office Supplies", "Expense", "Office Expenses", "Active", "Edit"],
    ],
  },
  users: {
    title: "Users",
    subtitle: "Manage SSO-backed users and portal access.",
    action: "Add New User",
    search: "Search users...",
    columns: ["Full Name", "Email", "Status", "Roles", "Actions"],
    rows: [
      ["Avery Example", "avery.example@demo.invalid", "Active", "Demo Accountant", "Edit"],
      ["Morgan Sample", "morgan.sample@demo.invalid", "Pending", "Pending User", "Assign Role"],
    ],
  },
  roles: {
    title: "Roles",
    subtitle: "Manage portal roles and role hierarchy.",
    action: "Create Role",
    columns: ["Role", "Code", "Department", "Users", "Status", "Actions"],
    rows: [["Demo Accountant", "DEMO_ACCOUNTANT", "Finance", "4", "Active", "Edit"]],
    layout: "split",
  },
  "role-assignments": {
    title: "Role Assignment",
    subtitle: "Select a user and assign their approved portal roles.",
    search: "Search users...",
    columns: ["User", "Email", "Current Roles", "Available Roles", "Action"],
    rows: [["Morgan Sample", "morgan.sample@demo.invalid", "Pending User", "Demo Accountant", "Assign"]],
    layout: "split",
  },
  "role-permissions": {
    title: "Role Permissions",
    subtitle: "Configure module actions for the selected role.",
    search: "Search roles...",
    columns: ["Permission Group", "View", "Create", "Update", "Delete"],
    rows: [["General Ledger", "Blocked", "Allowed", "Allowed", "Blocked"], ["Administration", "Allowed", "Blocked", "Blocked", "Blocked"]],
    layout: "split",
  },
  "role-api-permissions": {
    title: "Role API Permissions",
    subtitle: "Configure detailed API access for the selected role.",
    search: "Search APIs/Modules...",
    columns: ["Module / API", "Read", "Create", "Update", "Delete"],
    rows: [["Accounting / General Ledger", "Blocked", "Allowed", "Allowed", "Blocked"]],
    layout: "split",
  },
  "mcp-permissions": {
    title: "Role MCP Tool Permissions",
    subtitle: "Configure AI tool access for the selected role.",
    search: "Search tools...",
    columns: ["MCP Tool", "Description", "Allowed"],
    rows: [["search_chart_of_accounts", "Search active demo accounts", "Blocked"], ["save_general_ledger", "Save reviewed ledger data", "Blocked"]],
    layout: "split",
  },
  xgboost: {
    title: "XGBoost Model",
    subtitle: "Understand how the accounting classifier learns patterns, evaluates trees, and produces account scores.",
    action: "Refresh",
    columns: ["Training Account", "Approved Rows", "Share", "Safeguard"],
    rows: [["6400 Demo Office Supplies", "384", "32%", "Ready"], ["6500 Demo Software", "291", "24%", "Ready"]],
    metrics: [["Training Rows", "1,200"], ["Accounts", "14"], ["Holdout Accuracy", "91.4%"], ["Review Workload", "8.6%"]],
    layout: "model",
  },
  audit: {
    title: "Audit Log",
    subtitle: "Track system actions and login activity.",
    search: "Search actions...",
    columns: ["Timestamp", "User", "Action", "Entity", "Result"],
    rows: [["Jul 22, 2026 10:42", "Avery Example", "Disabled demo account 2460", "Chart of Accounts", "Success"]],
  },
  search: {
    title: "Global Search",
    subtitle: "Search permitted companies, accounts, transactions, and files.",
    search: "Search the training portal...",
    columns: ["Type", "Result", "Context", "Status"],
    rows: [
      ["Account", "6400 Demo Office Supplies", "Chart of Accounts", "Available"],
      ["Company", "Northstar Demo LLC", "Company Settings", "Available"],
    ],
  },
  assistant: {
    title: "Ask ZenaBot",
    subtitle: "Ask questions and perform permitted portal tasks.",
    columns: ["Message", "Response", "Source", "Status"],
    rows: [
      ["Why is demo account 2460 disabled?", "Waiting for training question", "Fake chart of accounts", "Draft"],
    ],
  },
};

const DEMO_FILES = {
  gl: {
    filename: "demo-general-ledger.csv",
    csv:
      "Date,Type,Num,Name,Memo,Account,Split,Debit,Credit\n" +
      "2026-07-01,Check,1001,Office Supply Co,Printer paper,1000 Checking,6400 Office Supplies,,128.45\n" +
      "2026-07-03,Deposit,DEP-22,Example Customer,Invoice payment,1000 Checking,1200 Accounts Receivable,1250.00,\n" +
      "2026-07-05,Bill,2044,Cloud Software Ltd,Monthly subscription,1000 Checking,6500 Software,,89.00\n",
    rows: [
      ["2026-07-01", "Office Supply Co", "6400 Office Supplies", "$128.45"],
      ["2026-07-03", "Example Customer", "1200 Accounts Receivable", "$1,250.00"],
      ["2026-07-05", "Cloud Software Ltd", "6500 Software", "$89.00"],
    ],
    summary: "3 rows parsed · Debits $1,250.00 · Credits $217.45",
  },
  bank: {
    filename: "demo-bank-statement.csv",
    csv:
      "Date,Description,Reference,Debit,Credit,Balance\n" +
      "2026-07-01,Opening Balance,OPEN,,,5000.00\n" +
      "2026-07-02,Office Supply Co,POS-1001,128.45,,4871.55\n" +
      "2026-07-03,Example Customer,ACH-220,,1250.00,6121.55\n",
    rows: [
      ["2026-07-01", "Opening Balance", "—", "$5,000.00"],
      ["2026-07-02", "Office Supply Co", "$128.45", "$4,871.55"],
      ["2026-07-03", "Example Customer", "+$1,250.00", "$6,121.55"],
    ],
    summary: "3 rows extracted · Ending balance $6,121.55 · Reconciled",
  },
} as const;

type DemoStatus =
  | "idle"
  | "selected"
  | "reading"
  | "validating"
  | "review"
  | "confirmed";

function downloadDemo(kind: DemoKind) {
  const demo = DEMO_FILES[kind];
  const url = URL.createObjectURL(new Blob([demo.csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = demo.filename;
  link.click();
  URL.revokeObjectURL(url);
}

function PracticeTaskPanel({
  stepId,
  task,
  completed,
  onComplete,
  onContinue,
  continueLabel,
}: {
  stepId: string;
  task: PracticeTask;
  completed: boolean;
  onComplete: () => void;
  onContinue: () => void;
  continueLabel: string;
}) {
  const [started, setStarted] = useState(completed);
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [toggled, setToggled] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const kind = PRACTICE_KINDS[stepId];
  const controls = PRACTICE_CONTROLS[stepId];
  const selectionsComplete = Boolean(
    primary &&
    (!controls?.secondaryOptions || secondary) &&
    (!controls?.toggleLabel || toggled)
  );

  useEffect(() => {
    setStarted(completed);
    setPrimary("");
    setSecondary("");
    setToggled(false);
    setConfirming(false);
  }, [completed, stepId, task.title]);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event(ONBOARDING_TARGET_REFRESH_EVENT));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [completed, confirming, primary, secondary, started, stepId, toggled]);

  useEffect(() => {
    const startPractice = (event: Event) => {
      const detail = (event as CustomEvent<{ stepId: string }>).detail;
      if (detail.stepId === stepId && !completed) setStarted(true);
    };
    window.addEventListener(ONBOARDING_PRACTICE_EVENT, startPractice);
    return () =>
      window.removeEventListener(ONBOARDING_PRACTICE_EVENT, startPractice);
  }, [completed, stepId]);

  function finishInteraction() {
    if (!selectionsComplete) return;
    if (kind === "disable" && !confirming) {
      setConfirming(true);
      return;
    }
    onComplete();
  }

  if (completed) {
    return (
      <div
        data-onboarding-practice={stepId}
        className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200 bg-white px-4 py-3 text-xs shadow-[inset_4px_0_0_0_rgb(16_185_129)] dark:border-emerald-800 dark:bg-slate-950"
      >
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
            <Check className="h-3.5 w-3.5" />
          </span>
          <span><strong>Practice applied:</strong> {task.feedback}</span>
        </div>
        <Button size="sm" onClick={onContinue}>
          {continueLabel}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      data-onboarding-practice={stepId}
      className="relative m-3 overflow-hidden rounded-xl border-2 border-blue-500 bg-white p-4 shadow-[0_12px_32px_-12px_rgb(37_99_235_/_0.55),0_0_0_4px_rgb(59_130_246_/_0.14)] dark:bg-slate-950"
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-blue-600" />
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
          {completed ? <Check className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
              Current guide step
            </p>
            <Badge className="bg-blue-600 text-[10px] text-white hover:bg-blue-600">
              DO THIS NOW
            </Badge>
          </div>
          <h3 className="mt-1 text-sm font-semibold">{task.title}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{task.instructions}</p>
        </div>
      </div>

      {started ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-lg border bg-background p-3">
            <div className="flex items-center justify-between gap-3 border-b pb-2">
              <p className="text-xs font-semibold">
                {kind === "add"
                  ? task.startLabel.replace("Open ", "")
                  : kind === "disable"
                    ? "Disable account"
                    : task.title}
              </p>
              <Badge variant="outline">Browser only</Badge>
            </div>

            {controls ? (
              <div className="mt-3 grid gap-3">
                <label className="grid gap-1 text-xs font-medium">
                  {controls.primaryLabel}
                  <select
                    value={primary}
                    onChange={(event) => {
                      setPrimary(event.target.value);
                      setConfirming(false);
                    }}
                    className="h-9 rounded-md border bg-background px-3 text-xs"
                  >
                    <option value="">Select fake value...</option>
                    {controls.primaryOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                {controls.secondaryOptions && (
                  <label className="grid gap-1 text-xs font-medium">
                    {controls.secondaryLabel}
                    <select
                      value={secondary}
                      onChange={(event) => setSecondary(event.target.value)}
                      className="h-9 rounded-md border bg-background px-3 text-xs"
                    >
                      <option value="">Select fake value...</option>
                      {controls.secondaryOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                )}

                {controls.toggleLabel && (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={toggled}
                    onClick={() => setToggled((value) => !value)}
                    className="flex items-center gap-2 rounded-md border p-2 text-left text-xs"
                  >
                    <span className={`flex h-4 w-4 items-center justify-center rounded border ${
                      toggled ? "border-emerald-600 bg-emerald-600 text-white" : "bg-background"
                    }`}>
                      {toggled && <Check className="h-3 w-3" />}
                    </span>
                    {controls.toggleLabel}
                  </button>
                )}
              </div>
            ) : (
              <p className="mt-3 text-xs">Complete the highlighted fake action.</p>
            )}

            {kind === "disable" && confirming && (
              <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                Confirm disabling 2460 Demo Intercompany. It will remain visible in
                fake history but be blocked from uploads, rules, AI, and XGBoost.
              </div>
            )}

            {kind === "search" && primary && (
              <div className="mt-3 rounded-md bg-muted/60 p-2 text-xs">
                1 fake result found for <span className="font-semibold">{primary}</span>.
              </div>
            )}

            {kind === "assistant" && primary && (
              <div className="mt-3 rounded-md bg-muted/60 p-2 text-xs">
                Ready to send this fictional training question to the simulated assistant.
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={finishInteraction} disabled={!selectionsComplete}>
              {kind === "disable" && !confirming ? (
                <X className="mr-2 h-4 w-4" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {kind === "disable" && confirming ? "Confirm disable" : task.finishLabel}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setStarted(false);
                setPrimary("");
                setSecondary("");
                setToggled(false);
                setConfirming(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" className="mt-3" onClick={() => setStarted(true)}>
          <Play className="mr-2 h-4 w-4" />
          {task.startLabel}
        </Button>
      )}
    </div>
  );
}

function DemoUpload({
  kind,
  completed,
  onComplete,
  onReset,
  onContinue,
  continueLabel,
  onStatusChange,
}: {
  kind: DemoKind;
  completed: boolean;
  onComplete: () => void;
  onReset?: () => void;
  onContinue: () => void;
  continueLabel: string;
  onStatusChange?: (status: DemoStatus) => void;
}) {
  const [status, setStatus] = useState<DemoStatus>(
    completed ? "confirmed" : "idle"
  );
  const [fileSummary, setFileSummary] = useState<string | null>(
    completed ? "Training sample CSV" : null
  );
  const timersRef = useRef<number[]>([]);
  const demo = DEMO_FILES[kind];
  const workflowSteps = [
    ["Select", status !== "idle"],
    ["Read", ["validating", "review", "confirmed"].includes(status)],
    ["Validate", ["review", "confirmed"].includes(status)],
    ["Review", ["review", "confirmed"].includes(status)],
    ["Confirm", status === "confirmed"],
  ] as const;

  useEffect(() => onStatusChange?.(status), [onStatusChange, status]);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event(ONBOARDING_TARGET_REFRESH_EVENT));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [fileSummary, kind, status]);

  useEffect(
    () => () => {
      timersRef.current.forEach(window.clearTimeout);
    },
    []
  );

  useEffect(() => {
    const useSample = (event: Event) => {
      const detail = (event as CustomEvent<{ kind: DemoKind }>).detail;
      if (detail.kind !== kind) return;
      timersRef.current.forEach(window.clearTimeout);
      timersRef.current = [];
      onReset?.();
      setFileSummary("Generated sample CSV · safe training data");
      setStatus("selected");
    };
    window.addEventListener(ONBOARDING_DEMO_SAMPLE_EVENT, useSample);
    return () =>
      window.removeEventListener(ONBOARDING_DEMO_SAMPLE_EVENT, useSample);
  }, [kind, onReset]);

  function clearTimers() {
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current = [];
  }

  function chooseSample() {
    clearTimers();
    onReset?.();
    setFileSummary("Generated sample CSV · safe training data");
    setStatus("selected");
  }

  function processFile() {
    if (status !== "selected") return;
    clearTimers();
    setStatus("reading");
    timersRef.current = [
      window.setTimeout(() => setStatus("validating"), 650),
      window.setTimeout(() => setStatus("review"), 1300),
    ];
  }

  function resetDemo() {
    clearTimers();
    onReset?.();
    setStatus("idle");
    setFileSummary(null);
  }

  function confirmDemo() {
    clearTimers();
    setStatus("confirmed");
    onComplete();
  }

  return (
    <div
      data-onboarding-demo={kind}
      className="mt-4 rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/30"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold">
              {kind === "gl" ? "General Ledger training upload" : "Bank statement training upload"}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            The provided sample is generated locally and is never transmitted.
          </p>
        </div>
        <Badge variant="outline" className="border-blue-300 text-blue-700 dark:text-blue-300">
          <Database className="mr-1 h-3 w-3" />
          No database write
        </Badge>
      </div>

      <div className="mb-4 grid grid-cols-5 gap-1">
        {workflowSteps.map(([label, complete], index) => (
          <div key={label} className="text-center">
            <div className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
              complete ? "bg-emerald-600 text-white" : "border bg-background text-muted-foreground"
            }`}>
              {complete ? <Check className="h-3 w-3" /> : index + 1}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {status === "idle" && (
        <div className="rounded-lg border-2 border-dashed border-blue-200 bg-background/70 p-5 text-center dark:border-blue-900">
          <UploadCloud className="mx-auto h-7 w-7 text-blue-600" />
          <p className="mt-2 text-sm font-semibold">Use the provided sample file</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {demo.filename} · fictional training data only
          </p>
          <Button size="sm" className="mt-3" onClick={chooseSample}>
            <Play className="mr-2 h-4 w-4" />
            Use sample file
          </Button>
        </div>
      )}

      {status === "selected" && (
        <div className="space-y-3">
          <div className="rounded-lg border bg-background p-3">
            <p className="text-xs font-semibold">File ready</p>
            <p className="mt-1 text-xs text-muted-foreground">{fileSummary}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={processFile}>
              <Play className="mr-2 h-4 w-4" />
              Process in training mode
            </Button>
            <Button size="sm" variant="outline" onClick={resetDemo}>Reset sample</Button>
          </div>
        </div>
      )}

      {(status === "reading" || status === "validating") && (
        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            {status === "reading" ? "Reading the file locally..." : "Validating the training import..."}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {status === "reading"
              ? "Checking file type, size, sheets, and expected columns."
              : "Checking dates, amounts, balances, mappings, and disabled accounts."}
          </p>
          <Progress value={status === "reading" ? 45 : 78} className="mt-3 h-1.5" />
        </div>
      )}

      {status === "review" && (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              ["File structure", "Passed"],
              ["Account safety", "Passed"],
              ["Rows needing review", kind === "gl" ? "1" : "0"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border bg-background p-2">
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className="mt-1 text-xs font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg border bg-background p-3 text-xs">
            Review the updated fake rows in the page table below, including
            suggested targets, balances, and row status.
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <Check className="h-4 w-4" />
            {demo.summary}
          </div>
          <p className="text-xs text-muted-foreground">
            Feedback uses only the fictional rows from the provided sample file.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={confirmDemo}>
              <Check className="mr-2 h-4 w-4" />
              Confirm training import
            </Button>
            <Button size="sm" variant="outline" onClick={resetDemo}>Start over</Button>
          </div>
        </div>
      )}

      {status === "confirmed" && (
        <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-start gap-2 text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Training import confirmed</p>
              <p className="mt-1 text-xs">
                You completed every step. Nothing was uploaded, queued, archived, or saved.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={onContinue}>
            {continueLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <Button size="sm" variant="ghost" onClick={() => downloadDemo(kind)}>
            <Download className="mr-2 h-4 w-4" />
            Download sample CSV
        </Button>
      </div>
    </div>
  );
}

function TrainingPreview({
  step,
  rect,
}: {
  step: ResolvedTourStep;
  rect: DOMRect | null;
}) {
  const tabs = TRAINING_TABS[step.id] || DEFAULT_TABS;
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => setActiveTab(0), [step.id]);

  const selectedTab = tabs[Math.min(activeTab, tabs.length - 1)];
  const style = rect
    ? {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }
    : {
        left: "min(18rem, 22vw)",
        top: "4rem",
        right: 0,
        bottom: 0,
      };

  return (
    <div
      className="fixed z-[1] overflow-auto border-l bg-slate-50 p-5 text-slate-950 dark:bg-slate-950 dark:text-slate-50"
      style={style}
      aria-label={`Fake training preview for ${step.title}`}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-blue-200 bg-white p-4 shadow-sm dark:border-blue-900 dark:bg-slate-900">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge className="bg-blue-600 text-white hover:bg-blue-600">
                TRAINING DATA — NOT LIVE
              </Badge>
              {!step.hasAccess && (
                <Badge variant="outline" className="border-violet-300 text-violet-700 dark:text-violet-300">
                  Permission preview
                </Badge>
              )}
            </div>
            <h3 className="text-xl font-bold">{step.title}</h3>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Everything in this workspace is invented for onboarding. It does not
              read from or write to your company database.
            </p>
          </div>
          <div className="rounded-lg bg-blue-50 px-3 py-2 text-right dark:bg-blue-950/40">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
              Demo company
            </p>
            <p className="text-sm font-semibold">Northstar Demo LLC</p>
          </div>
        </div>

        <div className="mb-4 overflow-x-auto rounded-xl border bg-white px-2 pt-2 shadow-sm dark:bg-slate-900">
          <div className="flex min-w-max gap-1" role="tablist" aria-label={`${step.title} training tabs`}>
            {tabs.map((tab, index) => (
              <button
                key={tab.label}
                type="button"
                role="tab"
                aria-selected={activeTab === index}
                onClick={() => setActiveTab(index)}
                className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === index
                    ? "bg-blue-600 text-white"
                    : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div className="rounded-xl border bg-white p-5 shadow-sm dark:bg-slate-900">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                {selectedTab.label}
              </p>
              <h4 className="mt-1 text-lg font-semibold">What this tab does</h4>
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedTab.description}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Demo records", "24"],
                ["Needs review", "3"],
                ["Sample total", "$12,480"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xl font-bold">{value}</p>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-slate-900">
              <div className="border-b px-4 py-3 text-sm font-semibold">
                Fake example records
              </div>
              {[
                ["Northstar Demo LLC", "1000 Demo Checking", "$8,250.00", "Ready"],
                ["Sample Operations Inc.", "2460 Demo Intercompany", "$0.00", "Disabled"],
                ["Practice Company Ltd.", "6400 Demo Office Supplies", "$128.45", "Review"],
              ].map((row) => (
                <div
                  key={row[1]}
                  className="grid grid-cols-[1.2fr_1.4fr_0.7fr_0.6fr] gap-3 border-b px-4 py-3 text-xs last:border-0"
                >
                  {row.map((cell) => (
                    <span key={cell} className="truncate">{cell}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
              Tabs in this area
            </p>
            <div className="mt-3 space-y-3">
              {tabs.map((tab, index) => (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setActiveTab(index)}
                  className="block w-full rounded-lg bg-white p-3 text-left shadow-sm transition hover:ring-2 hover:ring-blue-300 dark:bg-slate-900"
                >
                  <span className="block text-sm font-semibold">{tab.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {tab.description}
                  </span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function OriginalFormatTrainingPreview({
  step,
  rect,
  demoCompleted,
  onDemoComplete,
  onDemoReset,
  onContinue,
  continueLabel,
  taskCompleted,
  onTaskComplete,
}: {
  step: ResolvedTourStep;
  rect: DOMRect | null;
  demoCompleted: boolean;
  onDemoComplete: () => void;
  onDemoReset: () => void;
  onContinue: () => void;
  continueLabel: string;
  taskCompleted: boolean;
  onTaskComplete: () => void;
}) {
  const format = PAGE_FORMATS[step.id];
  const tabs = ORIGINAL_TABS[step.id] || [];
  const [activeTab, setActiveTab] = useState(0);
  const [demoStage, setDemoStage] = useState<DemoStatus>(
    demoCompleted ? "confirmed" : "idle"
  );

  useEffect(() => setActiveTab(0), [step.id]);
  useEffect(
    () => setDemoStage(demoCompleted ? "confirmed" : "idle"),
    [demoCompleted, step.id]
  );

  if (!format) return <TrainingPreview step={step} rect={rect} />;

  const selectedTab = tabs[Math.min(activeTab, Math.max(0, tabs.length - 1))];
  const addedRows: Partial<Record<string, string[]>> = {
    companies: ["Northstar Training Co.", "Demo DaaS", "Training Group", "Ontario", "Canada", "Added during practice", "Edit"],
    banks: ["Training Savings Bank", "Commercial", "Added during practice", "Edit"],
    "bank-accounts": ["Northstar Demo LLC", "Demo Community Bank", "•••• 7788", "Edit"],
    "bank-rules": ["Demo office rule", "Description contains DEMO OFFICE", "6400 Demo Office Supplies", "10", "Active", "Edit"],
    users: ["Taylor Training", "taylor.training@demo.invalid", "Active", "Pending User", "Edit"],
    roles: ["Demo Reviewer", "DEMO_REVIEWER", "Finance Training", "0", "Active", "Edit"],
  };
  let displayRows = format.rows;
  if (taskCompleted && addedRows[step.id]) {
    displayRows = [...format.rows, addedRows[step.id]!];
  } else if (step.id === "coa") {
    displayRows = format.rows.map((row) =>
      row[0] === "2460"
        ? row.map((cell, index) =>
            index === 4
              ? (taskCompleted ? "Disabled" : "Active")
              : index === 5
                ? (taskCompleted ? "Enable" : "Disable")
                : cell
          )
        : row
    );
  } else if (taskCompleted && step.id === "contacts") {
    displayRows = format.rows.map((row) =>
      row.map((cell, index) =>
        index === 1 ? "EXAMPLE CO., EXAMPLE CUSTOMER INC." : cell
      )
    );
  } else if (taskCompleted && step.id === "role-assignments") {
    displayRows = format.rows.map((row) =>
      row.map((cell, index) => index === 2 ? "Demo Accountant" : cell)
    );
  } else if (taskCompleted && step.id === "role-permissions") {
    displayRows = format.rows.map((row) =>
      row[0] === "General Ledger"
        ? row.map((cell, index) => index === 1 ? "Allowed" : cell)
        : row
    );
  } else if (taskCompleted && step.id === "role-api-permissions") {
    displayRows = format.rows.map((row) =>
      row[0] === "Accounting / General Ledger"
        ? row.map((cell, index) => index === 1 ? "Allowed" : cell)
        : row
    );
  } else if (taskCompleted && step.id === "mcp-permissions") {
    displayRows = format.rows.map((row) =>
      row[0] === "search_chart_of_accounts"
        ? row.map((cell, index) => index === 2 ? "Allowed" : cell)
        : row
    );
  } else if (taskCompleted && step.id === "dashboard") {
    displayRows = format.rows.filter((row) => row[2] === "Northstar Demo LLC");
  } else if (taskCompleted && step.id === "uploaded-files") {
    displayRows = format.rows
      .filter((row) => row[0] === "demo-gl-july.csv")
      .map((row) => row.map((cell, index) => index === 6 ? "Preview opened" : cell));
  } else if (taskCompleted && step.id === "trial-balance") {
    displayRows = format.rows.filter((row) => row[0] === "1000");
  } else if (taskCompleted && step.id === "consolidated-matrix") {
    displayRows = format.rows.map((row) =>
      row[0] === "2460"
        ? row.map((cell, index) => index === 4 ? "$0.00 · Verified" : cell)
        : row
    );
  } else if (taskCompleted && step.id === "reports") {
    displayRows = format.rows.map((row) =>
      row[0] === "Reconciliation Report"
        ? row.map((cell, index) => index === 3 ? "Preview ready" : cell)
        : row
    );
  } else if (taskCompleted && step.id === "xgboost") {
    displayRows = format.rows.map((row, rowIndex) =>
      row.map((cell, index) =>
        rowIndex === 0 && index === 3 ? "Evidence reviewed" : cell
      )
    );
  } else if (taskCompleted && step.id === "audit") {
    displayRows = format.rows.map((row) =>
      row.map((cell, index) => index === 4 ? "Detail opened" : cell)
    );
  } else if (taskCompleted && step.id === "search") {
    displayRows = format.rows
      .filter((row) => row[1] === "6400 Demo Office Supplies")
      .map((row) => row.map((cell, index) => index === 3 ? "Result opened" : cell));
  } else if (taskCompleted && step.id === "assistant") {
    displayRows = format.rows.map((row) =>
      row.map((cell, index) => {
        if (index === 1) return "Account 2460 is historical and blocked from new activity.";
        if (index === 3) return "Answered";
        return cell;
      })
    );
  }
  if (step.demo) {
    const readyForReview = ["review", "confirmed"].includes(demoStage);
    displayRows = format.rows.map((row) =>
      row.map((cell, index) => {
        if (index === row.length - 1) {
          if (demoStage === "confirmed") return "Confirmed";
          if (demoStage === "review") return "Ready";
          return "Waiting";
        }
        if (!readyForReview && step.demo === "gl" && index === 4) return "—";
        return cell;
      })
    );
  }
  const useDemoSample = () => {
    if (!step.demo) return;
    window.dispatchEvent(
      new CustomEvent(ONBOARDING_DEMO_SAMPLE_EVENT, {
        detail: { kind: step.demo },
      })
    );
  };
  const openPracticeTask = () => {
    if (!PRACTICE_TASKS[step.id]) return;
    window.dispatchEvent(
      new CustomEvent(ONBOARDING_PRACTICE_EVENT, {
        detail: { stepId: step.id },
      })
    );
  };
  const style = rect
    ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
    : { left: "min(18rem, 22vw)", top: "4rem", right: 0, bottom: 0 };

  return (
    <div
      className="fixed z-[1] overflow-auto border-l bg-background p-5 text-foreground"
      style={style}
      aria-label={`Fake training preview for ${format.title}`}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className="bg-blue-600 text-white hover:bg-blue-600">
                TRAINING DATA — NOT LIVE
              </Badge>
              {!step.hasAccess && (
                <Badge variant="outline" className="border-violet-300 text-violet-700 dark:text-violet-300">
                  Permission preview
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{format.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{format.subtitle}</p>
          </div>
          {format.action && (
            <Button
              onClick={
                step.demo
                  ? useDemoSample
                  : PRACTICE_KINDS[step.id] === "add"
                    ? openPracticeTask
                    : undefined
              }
            >
              {format.action}
            </Button>
          )}
        </header>

        {tabs.length > 0 && (
          <div>
            <div className="flex min-w-max border-b" role="tablist" aria-label={`${format.title} training tabs`}>
              {tabs.map((tab, index) => (
                <button
                  key={tab.label}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === index}
                  onClick={() => setActiveTab(index)}
                  className={`relative px-5 py-3 text-sm font-semibold transition-colors ${
                    activeTab === index
                      ? "text-primary after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {selectedTab && (
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{selectedTab.label}:</span>{" "}
                {selectedTab.description}
              </p>
            )}
          </div>
        )}

        {step.demo && (
          <DemoUpload
            kind={step.demo}
            completed={demoCompleted}
            onComplete={onDemoComplete}
            onReset={onDemoReset}
            onContinue={onContinue}
            continueLabel={continueLabel}
            onStatusChange={setDemoStage}
          />
        )}

        {(format.filters || format.search) && (
          <section
            className={`rounded-xl border bg-card p-4 shadow-sm ${
              format.filters && format.filters.length >= 4
                ? "grid gap-4 md:grid-cols-4"
                : "flex flex-wrap items-center gap-3"
            }`}
          >
            {format.filters?.map((filter, index) => (
              <div key={`${filter}-${index}`} className={format.filters!.length >= 4 ? "space-y-2" : ""}>
                {format.filters!.length >= 4 && (
                  <p className="text-xs font-medium text-muted-foreground">
                    {["Company", "Period", "Year", "Book / Entity"][index] || "Filter"}
                  </p>
                )}
                <button type="button" className="min-w-36 rounded-md border bg-background px-3 py-2 text-left text-sm">
                  {filter}
                  <span className="float-right ml-3 text-muted-foreground">⌄</span>
                </button>
              </div>
            ))}
            {format.search && (
              <div className="relative min-w-64 flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">⌕</span>
                <div className="rounded-md border bg-background py-2 pl-9 pr-3 text-sm text-muted-foreground">
                  {format.search}
                </div>
              </div>
            )}
            <Button variant="outline" className="ml-auto">Columns</Button>
          </section>
        )}

        {format.metrics && (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {format.metrics.map(([label, value]) => (
              <div key={label} className="rounded-xl border bg-card p-5 shadow-sm">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-bold">{value}</p>
                <p className="mt-1 text-xs text-blue-600 dark:text-blue-300">Demo value</p>
              </div>
            ))}
          </section>
        )}

        {format.layout === "dashboard" && (
          <section className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
              <h2 className="font-semibold">Monthly P&amp;L Trend</h2>
              <div className="mt-8 flex h-40 items-end justify-around gap-3 border-b border-l px-4">
                {[48, 68, 55, 82, 72, 90].map((height, index) => (
                  <div key={index} className="flex h-full flex-1 items-end justify-center gap-1">
                    <div className="w-4 rounded-t bg-blue-500" style={{ height: `${height}%` }} />
                    <div className="w-4 rounded-t bg-violet-400" style={{ height: `${Math.max(25, height - 22)}%` }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h2 className="font-semibold">Financial Position Snapshot</h2>
              <div className="mt-5 space-y-4">
                {[["Assets", "$126,050"], ["Liabilities", "$41,800"], ["Equity", "$84,250"]].map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b pb-3 text-sm">
                    <span>{label}</span><strong>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {format.layout === "model" && (
          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h2 className="font-semibold">Latest guarded training decision</h2>
              <p className="mt-1 text-sm text-muted-foreground">Fake holdout metrics for onboarding only.</p>
              <Badge className="mt-4">Activated</Badge>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h2 className="font-semibold">How a suggestion is made</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                {["Read transaction", "Build signals", "Score trees", "Apply safeguards"].map((label, index) => (
                  <div key={label} className="flex items-center gap-2 rounded-md border p-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white">{index + 1}</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className={format.layout === "split" ? "grid gap-4 lg:grid-cols-[240px_1fr]" : ""}>
          {format.layout === "split" && (
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <h2 className="font-semibold">{step.id === "role-assignments" ? "Users" : "Roles"}</h2>
              <div className="mt-3 rounded-md bg-blue-50 p-3 text-sm font-medium text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                {step.id === "role-assignments" ? "Morgan Sample" : "Demo Accountant"}
              </div>
              <div className="mt-2 rounded-md p-3 text-sm text-muted-foreground">Demo Reviewer</div>
            </div>
          )}

          <div className={`overflow-hidden rounded-xl bg-white shadow-sm dark:bg-slate-950 ${
            PRACTICE_TASKS[step.id] && !taskCompleted
              ? "border-2 border-blue-400 shadow-[0_14px_40px_-20px_rgb(37_99_235_/_0.7)]"
              : "border"
          }`}>
            {PRACTICE_TASKS[step.id] && (
              <PracticeTaskPanel
                stepId={step.id}
                task={PRACTICE_TASKS[step.id]}
                completed={taskCompleted}
                onComplete={onTaskComplete}
                onContinue={onContinue}
                continueLabel={continueLabel}
              />
            )}
            <div className="overflow-x-auto">
              <div
                className="grid min-w-max bg-muted/60 text-xs font-semibold"
                style={{ gridTemplateColumns: `repeat(${format.columns.length}, minmax(130px, 1fr))` }}
              >
                {format.columns.map((column) => (
                  <div key={column} className="border-b px-4 py-3">{column}</div>
                ))}
              </div>
              {displayRows.map((row, rowIndex) => (
                <div
                  key={`${step.id}-${rowIndex}`}
                  onClick={PRACTICE_TASKS[step.id] ? openPracticeTask : undefined}
                  className={`grid min-w-max text-xs hover:bg-muted/40 ${
                    PRACTICE_TASKS[step.id] ? "cursor-pointer" : ""
                  }`}
                  style={{ gridTemplateColumns: `repeat(${format.columns.length}, minmax(130px, 1fr))` }}
                >
                  {row.map((cell, cellIndex) => (
                    <div key={`${cell}-${cellIndex}`} className="border-b px-4 py-3">
                      {["Disabled", "Blocked"].includes(cell) ? (
                        <Badge variant="outline" className="text-muted-foreground">{cell}</Badge>
                      ) : ["Active", "Ready", "Allowed", "Balanced", "Success"].includes(cell) ? (
                        <Badge variant="secondary">{cell}</Badge>
                      ) : cell}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground">
              <span>
                {taskCompleted
                  ? "Practice change applied to this fake table"
                  : "Showing fake onboarding records only"}
              </span>
              <span>Page 1 of 1</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function OnboardingTour() {
  const {
    user,
    roles,
    isLoading,
    canAccessNavigationItem,
    refreshPermissions,
  } = useAuth();
  const completeMutation = useCompleteOnboarding();
  const [isActive, setIsActive] = useState(false);
  const [isRequired, setIsRequired] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [completedDemos, setCompletedDemos] = useState<Set<DemoKind>>(
    () => new Set()
  );
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(
    () => new Set()
  );
  const [skippedModules, setSkippedModules] = useState<Set<string>>(
    () => new Set()
  );
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [contentRect, setContentRect] = useState<DOMRect | null>(null);
  const automaticStartRef = useRef<string | null>(null);
  const isAuditor = roles.some(
    (role) => role.code === "AUDITOR" || role.code.endsWith("_AUDITOR")
  );

  const steps = useMemo<ResolvedTourStep[]>(
    () =>
      TOUR_STEPS.map((step) => ({
        ...step,
        hasAccess:
          !step.navigationCode ||
          canAccessNavigationItem(
            step.navigationCode,
            step.actionCode || "VIEW"
          ),
      })),
    [canAccessNavigationItem]
  );
  const step = steps[Math.min(stepIndex, Math.max(steps.length - 1, 0))];

  const startTour = useCallback((required = false) => {
    setStepIndex(0);
    setCompletedDemos(new Set());
    setCompletedTasks(new Set());
    setSkippedModules(new Set());
    setIsRequired(required);
    setIsActive(true);
  }, []);

  useEffect(() => {
    const listener = () => startTour(false);
    window.addEventListener("start-onboarding", listener);
    return () => window.removeEventListener("start-onboarding", listener);
  }, [startTour]);

  useEffect(() => {
    document.documentElement.dataset[ONBOARDING_ACTIVE_DATASET_KEY] = String(
      isActive
    );
    window.dispatchEvent(
      new CustomEvent<OnboardingSessionState>(ONBOARDING_SESSION_EVENT, {
        detail: { active: isActive },
      })
    );

    return () => {
      document.documentElement.dataset[ONBOARDING_ACTIVE_DATASET_KEY] = "false";
      window.dispatchEvent(
        new CustomEvent<OnboardingSessionState>(ONBOARDING_SESSION_EVENT, {
          detail: { active: false },
        })
      );
    };
  }, [isActive]);

  useEffect(() => {
    if (
      isLoading ||
      !user ||
      isAuditor ||
      user.onboarding_version >= CURRENT_ONBOARDING_VERSION ||
      automaticStartRef.current === user.id
    ) {
      return;
    }
    automaticStartRef.current = user.id;
    startTour(true);
  }, [isAuditor, isLoading, startTour, user]);

  useEffect(() => {
    if (!isActive || !step) return;
    window.dispatchEvent(
      new CustomEvent<OnboardingNavigationFocus>(
        ONBOARDING_NAVIGATION_EVENT,
        { detail: { path: step.path } }
      )
    );
  }, [isActive, step]);

  useEffect(() => {
    if (!isActive) {
      setContentRect(null);
      return;
    }

    const updateContentRect = () => {
      const content = document.querySelector("[data-onboarding='app-content']");
      setContentRect(
        content instanceof HTMLElement ? content.getBoundingClientRect() : null
      );
    };
    updateContentRect();
    const timers = [
      window.setTimeout(updateContentRect, 100),
      window.setTimeout(updateContentRect, 350),
    ];
    window.addEventListener("resize", updateContentRect);
    return () => {
      timers.forEach(window.clearTimeout);
      window.removeEventListener("resize", updateContentRect);
    };
  }, [isActive, step]);

  useEffect(() => {
    if (!isActive || !step) {
      setTargetRect(null);
      return;
    }

    let timer: number | null = null;
    let frame: number | null = null;
    let targetObserver: ResizeObserver | null = null;
    const findTarget = () => {
      const selector =
        (step.demo ? `[data-onboarding-demo="${step.demo}"]` : null) ||
        (PRACTICE_TASKS[step.id]
          ? `[data-onboarding-practice="${step.id}"]`
          : null) ||
        step.selector ||
        (step.path ? `[data-onboarding-path="${step.path}"]` : null);
      const target = selector ? document.querySelector(selector) : null;
      return target instanceof HTMLElement ? target : null;
    };
    const measureTarget = () => {
      const target = findTarget();
      setTargetRect(target ? target.getBoundingClientRect() : null);
    };
    const centerAndMeasureTarget = (target: HTMLElement) => {
      target.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "auto",
      });
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setTargetRect(target.getBoundingClientRect());
      });
    };
    const updateTarget = () => {
      const target = findTarget();
      if (target) {
        centerAndMeasureTarget(target);
        targetObserver?.disconnect();
        targetObserver = new ResizeObserver(() => {
          centerAndMeasureTarget(target);
        });
        targetObserver.observe(target);
      } else {
        targetObserver?.disconnect();
        targetObserver = null;
        setTargetRect(null);
      }
    };
    timer = window.setTimeout(updateTarget, 220);
    window.addEventListener("resize", updateTarget);
    window.addEventListener(ONBOARDING_TARGET_REFRESH_EVENT, updateTarget);
    document.addEventListener("scroll", measureTarget, true);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      if (frame !== null) window.cancelAnimationFrame(frame);
      targetObserver?.disconnect();
      window.removeEventListener("resize", updateTarget);
      window.removeEventListener(ONBOARDING_TARGET_REFRESH_EVENT, updateTarget);
      document.removeEventListener("scroll", measureTarget, true);
    };
  }, [isActive, step]);

  function finishTour() {
    completeMutation.mutate(undefined, {
      onSuccess: async () => {
        setIsActive(false);
        await refreshPermissions();
        toast.success("Onboarding complete", {
          description: "Use the help button any time to replay the tour.",
        });
      },
      onError: (error: Error) => {
        toast.error("Could not save onboarding progress", {
          description: error.message,
        });
      },
    });
  }

  if (!isActive || !step) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const currentModuleIndex = TOUR_MODULES.findIndex((module) =>
    module.stepIds.includes(step.id)
  );
  const currentModule =
    currentModuleIndex >= 0 ? TOUR_MODULES[currentModuleIndex] : null;
  const moduleStepIndex = currentModule
    ? currentModule.stepIds.indexOf(step.id)
    : 0;
  const isLastStepInModule = Boolean(
    currentModule && moduleStepIndex === currentModule.stepIds.length - 1
  );
  const nextModule =
    currentModuleIndex >= 0 ? TOUR_MODULES[currentModuleIndex + 1] : TOUR_MODULES[0];
  const progress = currentModule
    ? ((moduleStepIndex + 1) / currentModule.stepIds.length) * 100
    : isLast
      ? 100
      : 0;
  const guideItems = isLast ? [] : TRAINING_TABS[step.id] || DEFAULT_TABS;
  const practiceTask = PRACTICE_TASKS[step.id];
  const taskIncomplete = Boolean(
    practiceTask && !completedTasks.has(step.id)
  );
  const demoIncomplete = Boolean(
    step.demo && !completedDemos.has(step.demo)
  );
  const nextLabel = isLast
    ? "Finish onboarding"
    : isLastStepInModule && nextModule
      ? `Start Tour ${currentModuleIndex + 2}`
      : currentModule
        ? "Next step"
        : "Start Tour 1";
  const guidePosition =
    isFirst || isLast
      ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      : targetRect
        ? `${
            targetRect.left + targetRect.width / 2 >
            document.documentElement.clientWidth / 2
              ? "left-6"
              : "right-6"
          } ${
            targetRect.top + targetRect.height / 2 >
            document.documentElement.clientHeight / 2
              ? "top-6"
              : "bottom-6"
          }`
        : "bottom-6 right-6";
  const tutorialResults = TOUR_MODULES.map((module) => {
    const outcomes = module.stepIds.flatMap((stepId) => {
      const task = PRACTICE_TASKS[stepId];
      const tourStep = TOUR_STEPS.find((candidate) => candidate.id === stepId);
      if (task) {
        return [{
          completed: completedTasks.has(stepId),
          detail: task.feedback,
        }];
      }
      if (tourStep?.demo) {
        return [{
          completed: completedDemos.has(tourStep.demo),
          detail:
            tourStep.demo === "gl"
              ? "The fake General Ledger sample was reviewed and confirmed without saving data."
              : "The fake bank statement sample was reviewed and confirmed without saving data.",
        }];
      }
      return [];
    });
    const skipped = skippedModules.has(module.id);
    const completed =
      outcomes.length === 0 || outcomes.every((outcome) => outcome.completed);
    return {
      ...module,
      status: skipped ? "Skipped" : completed ? "Completed" : "Incomplete",
      detail: skipped
        ? "This tour was skipped; the following tour still remained available."
        : outcomes.map((outcome) => outcome.detail).join(" "),
    };
  });
  const completedTourCount = tutorialResults.filter(
    (result) => result.status === "Completed"
  ).length;
  const skippedTourCount = tutorialResults.filter(
    (result) => result.status === "Skipped"
  ).length;

  function skipCurrentModule() {
    if (!currentModule) return;
    const targetStepId = nextModule?.stepIds[0] || "finish";
    const targetIndex = steps.findIndex((candidate) => candidate.id === targetStepId);
    if (targetIndex < 0) return;
    setSkippedModules((current) => new Set(current).add(currentModule.id));
    setStepIndex(targetIndex);
    toast.info(`${currentModule.title} tour skipped`, {
      description: nextModule
        ? `Tour ${currentModuleIndex + 2}: ${nextModule.title} is still required.`
        : "Continue to the final onboarding summary.",
    });
  }

  function goToNextStep() {
    if (isLast) {
      finishTour();
      return;
    }
    setStepIndex((value) => Math.min(steps.length - 1, value + 1));
  }

  return (
    <div className="fixed inset-0 z-[200] pointer-events-auto">
      <div className={`fixed inset-0 z-0 ${targetRect ? "bg-transparent" : "bg-slate-950/78"}`} />
      <OriginalFormatTrainingPreview
        step={step}
        rect={contentRect}
        demoCompleted={Boolean(step.demo && completedDemos.has(step.demo))}
        onDemoComplete={() => {
          if (!step.demo) return;
          setCompletedDemos((current) => new Set(current).add(step.demo!));
          if (currentModule) {
            setSkippedModules((current) => {
              const next = new Set(current);
              next.delete(currentModule.id);
              return next;
            });
          }
        }}
        onDemoReset={() => {
          if (!step.demo) return;
          setCompletedDemos((current) => {
            const next = new Set(current);
            next.delete(step.demo!);
            return next;
          });
        }}
        onContinue={goToNextStep}
        continueLabel={nextLabel}
        taskCompleted={completedTasks.has(step.id)}
        onTaskComplete={() => {
          setCompletedTasks((current) => new Set(current).add(step.id));
          if (currentModule) {
            setSkippedModules((current) => {
              const next = new Set(current);
              next.delete(currentModule.id);
              return next;
            });
          }
        }}
      />
      {targetRect ? (
        <>
          <div
            className="pointer-events-none fixed z-[2] rounded-xl border-2 border-blue-500 bg-transparent shadow-[0_0_0_4px_rgb(255_255_255_/_0.98),0_0_0_9999px_rgb(15_23_42_/_0.72)] transition-all duration-300"
            style={{
              left: Math.max(8, targetRect.left - 6),
              top: Math.max(8, targetRect.top - 6),
              width: targetRect.width + 12,
              height: targetRect.height + 12,
            }}
          />
          <div
            className="pointer-events-none fixed z-[2] animate-pulse rounded-xl border border-blue-300/80 transition-all duration-300"
            style={{
              left: Math.max(4, targetRect.left - 11),
              top: Math.max(4, targetRect.top - 11),
              width: targetRect.width + 22,
              height: targetRect.height + 22,
            }}
          />
        </>
      ) : null}

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Application onboarding"
        className={`pointer-events-auto fixed z-[3] max-h-[calc(100vh-3rem)] w-[min(92vw,520px)] overflow-y-auto rounded-2xl border bg-card p-0 text-card-foreground shadow-2xl ${guidePosition}`}
      >
        <div className="border-b px-5 py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {step.demo ? (
                  <FlaskConical className="h-5 w-5" />
                ) : isLast ? (
                  <ShieldCheck className="h-5 w-5" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {currentModule
                    ? `Tour ${currentModuleIndex + 1} of ${TOUR_MODULES.length} · Step ${moduleStepIndex + 1} of ${currentModule.stepIds.length}`
                    : isLast
                      ? "All module tours complete"
                      : "Onboarding introduction"}
                </p>
                <h2 className="text-lg font-bold">{step.title}</h2>
              </div>
            </div>
            {!isRequired && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close onboarding"
                onClick={() => setIsActive(false)}
                disabled={completeMutation.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        <div className="px-5 py-4">
          <p className="text-sm leading-6 text-muted-foreground">
            {step.description}
          </p>
          {isLast && (
            <div className="mt-4 overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-slate-950">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-slate-50 px-4 py-3 dark:bg-slate-900">
                <div>
                  <p className="text-sm font-semibold">Tutorial results</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    All practice changes below used fake browser-only data.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                    {completedTourCount} completed
                  </Badge>
                  {skippedTourCount > 0 && (
                    <Badge variant="outline" className="border-amber-300 text-amber-700">
                      {skippedTourCount} skipped
                    </Badge>
                  )}
                </div>
              </div>
              <div className="max-h-72 divide-y overflow-y-auto">
                {tutorialResults.map((result, index) => (
                  <div key={result.id} className="flex items-start gap-3 px-4 py-3">
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      result.status === "Completed"
                        ? "bg-emerald-100 text-emerald-700"
                        : result.status === "Skipped"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                    }`}>
                      {result.status === "Completed" ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold">
                          Tour {index + 1}: {result.title}
                        </p>
                        <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide ${
                          result.status === "Completed"
                            ? "text-emerald-700"
                            : result.status === "Skipped"
                              ? "text-amber-700"
                              : "text-slate-500"
                        }`}>
                          {result.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                        {result.detail || "This informational workflow was reviewed."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {guideItems.length > 0 && (
            <div className="mt-4 rounded-xl border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                What you’ll use here
              </p>
              <div className="mt-2 space-y-2">
                {guideItems.map((item) => (
                  <div key={item.label} className="text-xs leading-5">
                    <span className="font-semibold text-foreground">{item.label}:</span>{" "}
                    <span className="text-muted-foreground">{item.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!step.hasAccess && step.path && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 p-3 text-violet-900 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-200">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="text-xs font-semibold">Training preview</p>
                <p className="mt-1 text-xs leading-5">
                  Your current role cannot open this page. The tour still explains
                  the workflow without changing your permissions or exposing its data.
                </p>
              </div>
            </div>
          )}
          {step.bullets && (
            <ul className="mt-4 space-y-2">
              {step.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
          {(step.demo || practiceTask) && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              <UploadCloud className="h-4 w-4 shrink-0" />
              Complete the highlighted browser-only task in the training page.
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t px-5 py-4">
          {currentModule ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={skipCurrentModule}
              disabled={completeMutation.isPending}
            >
              Skip this tour
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isFirst}
              onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              size="sm"
              disabled={
                completeMutation.isPending ||
                taskIncomplete ||
                demoIncomplete
              }
              onClick={goToNextStep}
            >
              {completeMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isLast ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              {nextLabel}
            </Button>
          </div>
        </div>
        {(taskIncomplete || demoIncomplete) && (
          <p className="px-5 pb-4 text-right text-xs font-medium text-amber-700 dark:text-amber-300">
            Complete this tour’s practice task to continue, or skip only this tour.
          </p>
        )}
      </section>
    </div>
  );
}
