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
    label: "Bank Reconciliation",
    path: "/bank-reconciliation",
    icon: Layers,
  },
  {
    label: "Reports",
    path: "/reports",
    icon: Download,
  },
  {
    label: "Settings",
    path: "/settings",
    icon: Settings,
  },
];