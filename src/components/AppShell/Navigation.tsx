import {
  LayoutDashboard,
  FileSpreadsheet,
  Scale,
  Layers,
  Upload,
  Bolt,
  Landmark,
  ScrollText,
  FileClock
} from "lucide-react";

export const navigation = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    section: "GENERAL",
    pageCode: "DASHBOARD",
  },
  {
    label: "Upload Files",
    path: "/upload-files",
    icon: Upload,
    section: "GENERAL",
    pageCode: "UPLOAD_FILES",
  },
  {
    label: "General Ledger",
    path: "/general-ledger",
    icon: FileSpreadsheet,
    section: "ACCOUNTING",
    pageCode: "GENERAL_LEDGER",
  },
  {
    label: "Bank Statements",
    path: "/bank-statements",
    icon: Layers,
    section: "ACCOUNTING",
    pageCode: "BANK_STATEMENTS",
  },
  {
    label: "Trial Balance",
    path: "/trial-balance",
    icon: Scale,
    section: "ACCOUNTING",
    pageCode: "TRIAL_BALANCE",
  },
  {
    label: "Consolidated Trial Balance",
    path: "/consolidated-trial-balance-matrix",
    icon: Landmark,
    section: "ACCOUNTING",
    pageCode: "CONSOLIDATED_TRIAL_BALANCE",
  },
  {
    label: "Reports",
    path: "/reports",
    icon: ScrollText,
    section: "REPORTS",
    pageCode: "REPORTS",
  },
  {
    label: "Configurations",
    icon: Bolt,
    section: "Manage",
    pageCode: "CONFIGURATION",
    subItems: [
      { label: "Company", path: "/configurations/company", pageCode: "CONFIG_COMPANY" },
      { label: "Bank", path: "/configurations/bank", pageCode: "CONFIG_BANK" },
      { label: "Bank Account", path: "/configurations/bank-account", pageCode: "CONFIG_BANK_ACCOUNT" },
      { label: "Bank Feed Rules", path: "/configurations/bank-feed-rules", pageCode: "CONFIG_BANK_FEED_RULES" },
      { label: "Chart of Accounts", path: "/configurations/chart-of-accounts", pageCode: "CONFIG_CHART_OF_ACCOUNTS" },
      { label: "Users", path: "/configurations/users", pageCode: "CONFIG_USERS" },
      { label: "Roles", path: "/configurations/roles", pageCode: "CONFIG_ROLES" },
      { label: "Role Assignments", path: "/configurations/user-role-assignment", pageCode: "CONFIG_USER_ROLE_ASSIGNMENT" },
      { label: "Page Permissions", path: "/configurations/role-page-permissions", pageCode: "CONFIG_ROLE_PAGE_PERMISSIONS" },
      { label: "MCP Tool Permissions", path: "/configurations/role-mcp-tool-permissions", pageCode: "CONFIG_ROLE_MCP_TOOL_PERMISSIONS" },
    ]
  },
  {
    label: "Audit Log",
    path: "/log/audit-log",
    icon: FileClock,
    section: "LOG",
    pageCode: "AUDIT_LOG",
  },
];