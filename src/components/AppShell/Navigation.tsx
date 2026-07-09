import {
  LayoutDashboard,
  FileSpreadsheet,
  Scale,
  Layers,
  Upload,
  Landmark,
  ScrollText,
  FileClock,
  Building,
  ShieldCheck
} from "lucide-react";

export const navigation = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    section: "MAIN",
    navigationCode: "DASHBOARD",
  },
  {
    label: "Upload Files",
    path: "/upload-files",
    icon: Upload,
    section: "MAIN",
    navigationCode: "UPLOAD_FILES",
  },
  {
    label: "General Ledger",
    path: "/general-ledger",
    icon: FileSpreadsheet,
    section: "FINANCIALS",
    navigationCode: "GENERAL_LEDGER",
  },
  {
    label: "Bank Statements",
    path: "/bank-statements",
    icon: Layers,
    section: "FINANCIALS",
    navigationCode: "BANK_STATEMENTS",
  },
  {
    label: "Trial Balance",
    path: "/trial-balance",
    icon: Scale,
    section: "FINANCIALS",
    navigationCode: "TRIAL_BALANCE",
  },
  {
    label: "Consolidated Trial Balance",
    path: "/consolidated-trial-balance-matrix",
    icon: Landmark,
    section: "FINANCIALS",
    navigationCode: "CONSOLIDATED_TRIAL_BALANCE",
  },
  {
    label: "Reports",
    path: "/reports",
    icon: ScrollText,
    section: "ANALYTICS",
    navigationCode: "REPORTS",
  },
  {
    label: "Business Configuration",
    icon: Building,
    section: "ADMINISTRATION",
    navigationCode: "CONFIGURATION",
    subItems: [
      { label: "Company", path: "/configurations/company", navigationCode: "CONFIG_COMPANY" },
      { label: "Bank", path: "/configurations/bank", navigationCode: "CONFIG_BANK" },
      { label: "Bank Account", path: "/configurations/bank-account", navigationCode: "CONFIG_BANK_ACCOUNT" },
      { label: "Bank Feed Rules", path: "/configurations/bank-feed-rules", navigationCode: "CONFIG_BANK_FEED_RULES" },
      { label: "Chart of Accounts", path: "/configurations/chart-of-accounts", navigationCode: "CONFIG_CHART_OF_ACCOUNTS" },
    ]
  },
  {
    label: "System & Security",
    icon: ShieldCheck,
    section: "ADMINISTRATION",
    navigationCode: "CONFIGURATION",
    subItems: [
      { label: "Users", path: "/configurations/users", navigationCode: "CONFIG_USERS" },
      { label: "Roles", path: "/configurations/roles", navigationCode: "CONFIG_ROLES" },
      { label: "Role Assignments", path: "/configurations/user-role-assignment", navigationCode: "CONFIG_USER_ROLE_ASSIGNMENT" },
      { label: "Role Permissions", path: "/configurations/role-group-permissions", navigationCode: "CONFIG_ROLE_API_PERMISSIONS" },
      { label: "MCP Tool Permissions", path: "/configurations/role-mcp-tool-permissions", navigationCode: "CONFIG_ROLE_MCP_TOOL_PERMISSIONS" },
    ]
  },
  {
    label: "Audit Log",
    path: "/log/audit-log",
    icon: FileClock,
    section: "ADMINISTRATION",
    navigationCode: "AUDIT_LOG",
  },
]