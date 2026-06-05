import {
  LayoutDashboard,
  Upload,
  FileSpreadsheet,
  Scale,
  Layers,
  Download,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "AI Assistant", icon: Sparkles },
  { label: "Upload Files", icon: Upload },
  { label: "General Ledger", icon: FileSpreadsheet },
  { label: "Trial Balance", icon: Scale },
  { label: "Bank Reconciliation", icon: Layers },
  { label: "Reports", icon: Download },
  { label: "Settings", icon: Settings },
];

export default function Sidebar({
  isOpen,
  onToggle,
}: SidebarProps) {
  return (
    <aside
      className={`
        border-r bg-white transition-all duration-300
        ${isOpen ? "w-72" : "w-20"}
      `}
    >
      <div className="flex items-center justify-between p-4">
        {isOpen && (
          <h1 className="font-bold text-xl">
            Zenatech
          </h1>
        )}

        <button
          onClick={onToggle}
          className="rounded-lg p-2 hover:bg-slate-100"
        >
          {isOpen ? (
            <ChevronLeft size={18} />
          ) : (
            <ChevronRight size={18} />
          )}
        </button>
      </div>

      <nav className="space-y-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              className="flex w-full items-center gap-3 rounded-lg p-3 hover:bg-slate-100"
            >
              <Icon size={20} />

              {isOpen && (
                <span>{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}