import {
  LayoutDashboard,
  Upload,
  FileSpreadsheet,
  Scale,
  Layers,
  Download,
  Settings,
  Sparkles,
} from "lucide-react";

export const navigation = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    section: "GENERAL",
  },
  {
    label: "AI Assistant",
    path: "/ai-assistant",
    icon: Sparkles,
    section: "GENERAL",
  },
  {
    label: "Upload Files",
    path: "/upload-files",
    icon: Upload,
    section: "GENERAL",
  },
  {
    label: "General Ledger",
    path: "/general-ledger",
    icon: FileSpreadsheet,
    section: "ACCOUNTING",
  },
  {
    label: "Trial Balance",
    path: "/trial-balance",
    icon: Scale,
    section: "ACCOUNTING",
  },
  {
    label: "Consolidated Trial Balance",
    path: "/consolidated-trial-balance-matrix",
    icon: Scale,
    section: "ACCOUNTING",
  },
  {
    label: "Bank Statements",
    path: "/bank-statements",
    icon: Layers,
    section: "FINANCE",
  },
  {
    label: "Chart of Accounts",
    path: "/chart-of-accounts",
    icon: FileSpreadsheet,
    section: "FINANCE",
  },
  {
    label: "Reports",
    path: "/reports",
    icon: Download,
    section: "FINANCE",
  },
  {
    label: "Settings",
    icon: Settings,
    section: "SETTINGS",
    subItems: [
      { label: "Company", path: "/settings/company" },
      { label: "Bank", path: "/settings/bank" },
      { label: "Bank Account", path: "/settings/bank-account" },
    ]
  },
];