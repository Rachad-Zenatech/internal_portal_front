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

const navItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "AI Assistant",
    icon: Sparkles,
  },
  {
    label: "Upload Files",
    icon: Upload,
  },
  {
    label: "General Ledger",
    icon: FileSpreadsheet,
  },
  {
    label: "Trial Balance",
    icon: Scale,
  },
  {
    label: "Bank Reconciliation",
    icon: Layers,
  },
  {
    label: "Reports",
    icon: Download,
  },
  {
    label: "Settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  return (
    <div className="w-72 border-r bg-white">
      <div className="p-6 font-bold text-xl">
        Zenatech Portal
      </div>

      <div className="space-y-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              className="flex w-full items-center gap-3 rounded-lg p-3 hover:bg-slate-100"
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}