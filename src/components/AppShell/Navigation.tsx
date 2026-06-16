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
  },
  {
    label: "AI Assistant",
    path: "/ai-assistant",
    icon: Sparkles,
  },
  {
    label: "Upload Files",
    path: "/upload-files",
    icon: Upload,
  },
  {
    label: "General Ledger",
    path: "/general-ledger",
    icon: FileSpreadsheet,
  },
  {
    label: "Trial Balance",
    path: "/trial-balance",
    icon: Scale,
  },
  {
    label: "Consol. Bank Recon",
    path: "/consolidated-trial-balance",
    icon: Scale,
  },
  {
    label: "Consolidated Trial Balance",
    path: "/consolidated-trial-balance-matrix",
    icon: Scale,
  },
  {
    label: "Bank Statements",
    path: "/bank-statements",
    icon: Layers,
  },
  {
    label: "Chart of Accounts",
    path: "/chart-of-accounts",
    icon: FileSpreadsheet,
  },
  {
    label: "Reports",
    path: "/reports",
    icon: Download,
  },
  {
    label: "Settings",
    icon: Settings,
    subItems: [
      { label: "Company", path: "/settings/company" },
      { label: "Bank", path: "/settings/bank" },
      { label: "Bank Account", path: "/settings/bank-account" },
    ]
  },
];