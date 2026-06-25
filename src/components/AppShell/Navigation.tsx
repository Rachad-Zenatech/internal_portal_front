import {
  LayoutDashboard,
  FileSpreadsheet,
  Scale,
  Layers,
  Upload,
  Bolt,
  Landmark,
  ScrollText
} from "lucide-react";

export const navigation = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
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
    label: "Bank Statements",
    path: "/bank-statements",
    icon: Layers,
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
    icon: Landmark,
    section: "ACCOUNTING",
  },
  {
    label: "Reports",
    path: "/reports",
    icon: ScrollText,
    section: "REPORTS",
  },
  {
    label: "Configurations",
    icon: Bolt,
    section: "Manage",
    subItems: [
      { label: "Company", path: "/configurations/company" },
      { label: "Bank", path: "/configurations/bank" },
      { label: "Bank Account", path: "/configurations/bank-account" },
      { label: "Bank Feed Rules", path: "/configurations/bank-feed-rules" },
      { label: "Chart of Accounts", path: "/configurations/chart-of-accounts" },
    ]
  },
];