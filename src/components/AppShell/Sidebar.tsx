import { Menu } from "lucide-react";
import { NavLink } from "react-router-dom";
import { navigation } from "./Navigation";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

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
          <Menu size={20} />
        </button>
      </div>

      <nav className="space-y-1 px-2">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `
                  flex w-full items-center rounded-lg p-3 transition-colors
                  ${isOpen ? "gap-3 justify-start" : "justify-center"}
                  ${
                    isActive
                      ? "bg-blue-100 text-blue-600"
                      : "hover:bg-slate-100"
                  }
                `
              }
            >
              <Icon size={20} />

              {isOpen && (
                <span className="text-sm font-medium">
                  {item.label}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}