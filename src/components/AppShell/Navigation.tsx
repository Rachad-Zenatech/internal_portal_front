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
    navigationCode: "DASHBOARD",
  },
  {
    label: "Upload Files",
    path: "/upload-files",
    icon: Upload,
    section: "GENERAL",
    navigationCode: "UPLOAD_FILES",
  },
  {
    label: "General Ledger",
    path: "/general-ledger",
    icon: FileSpreadsheet,
    section: "ACCOUNTING",
    navigationCode: "GENERAL_LEDGER",
  },
  {
    label: "Bank Statements",
    path: "/bank-statements",
    icon: Layers,
    section: "ACCOUNTING",
    navigationCode: "BANK_STATEMENTS",
  },
  {
    label: "Trial Balance",
    path: "/trial-balance",
    icon: Scale,
    section: "ACCOUNTING",
    navigationCode: "TRIAL_BALANCE",
  },
  {
    label: "Consolidated Trial Balance",
    path: "/consolidated-trial-balance-matrix",
    icon: Landmark,
    section: "ACCOUNTING",
    navigationCode: "CONSOLIDATED_TRIAL_BALANCE",
  },
  {
    label: "Reports",
    path: "/reports",
    icon: ScrollText,
    section: "REPORTS",
    navigationCode: "REPORTS",
  },
  {
    label: "Configurations",
    icon: Bolt,
    section: "Manage",
    navigationCode: "CONFIGURATION",
    subItems: [
      { label: "Company", path: "/configurations/company", navigationCode: "CONFIG_COMPANY" },
      { label: "Bank", path: "/configurations/bank", navigationCode: "CONFIG_BANK" },
      { label: "Bank Account", path: "/configurations/bank-account", navigationCode: "CONFIG_BANK_ACCOUNT" },
      { label: "Bank Feed Rules", path: "/configurations/bank-feed-rules", navigationCode: "CONFIG_BANK_FEED_RULES" },
      { label: "Chart of Accounts", path: "/configurations/chart-of-accounts", navigationCode: "CONFIG_CHART_OF_ACCOUNTS" },
      { label: "Users", path: "/configurations/users", navigationCode: "CONFIG_USERS" },
      { label: "Roles", path: "/configurations/roles", navigationCode: "CONFIG_ROLES" },
      { label: "Role Assignments", path: "/configurations/user-role-assignment", navigationCode: "CONFIG_USER_ROLE_ASSIGNMENT" },
      { label: "Navigation Permissions", path: "/configurations/role-navigation-permissions", navigationCode: "CONFIG_ROLE_NAVIGATION_PERMISSIONS" },
      { label: "MCP Tool Permissions", path: "/configurations/role-mcp-tool-permissions", navigationCode: "CONFIG_ROLE_MCP_TOOL_PERMISSIONS" },
    ]
  },
  {
    label: "Audit Log",
    path: "/log/audit-log",
    icon: FileClock,
    section: "LOG",
    navigationCode: "AUDIT_LOG",
  },
];