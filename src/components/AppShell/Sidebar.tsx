import { Menu, ChevronDown, ChevronRight } from "lucide-react";
import { NavLink } from "react-router-dom";
import { navigation } from "./Navigation";
import { useState } from "react";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({
  isOpen,
  onToggle,
}: SidebarProps) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpand = (label: string) => {
    setExpandedItems(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const groupedNavigation = navigation.reduce((acc, item) => {
    const section = item.section || "GENERAL";
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {} as Record<string, typeof navigation>);

  return (
    <aside
      className={`
        flex flex-col border-r bg-white transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap
        ${isOpen ? "w-72" : "w-20"}
      `}
    >
      <div className={`flex items-center h-16 px-4 transition-all duration-300 ease-in-out ${isOpen ? "justify-between" : "justify-center"}`}>
        <h1
          className={`font-bold text-xl transition-all duration-300 ease-in-out ${
            isOpen ? "opacity-100 translate-x-0 w-auto" : "opacity-0 -translate-x-4 w-0 overflow-hidden"
          }`}
        >
          Zenatech
        </h1>

        <button
          onClick={onToggle}
          className="rounded-lg p-2 hover:bg-slate-100 flex-shrink-0"
        >
          <Menu size={20} />
        </button>
      </div>

      <nav className="space-y-6 px-3 mt-6 pb-6 overflow-y-auto scrollbar-hide flex-1">
        {Object.entries(groupedNavigation).map(([section, items]) => (
          <div key={section} className="space-y-1">
            {isOpen ? (
              <div className="px-3 mb-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                {section}
              </div>
            ) : (
              <div className="h-4" /> // Spacing when collapsed
            )}
            
            {items.map((item) => {
              const Icon = item.icon;

          if (item.subItems) {
            const isExpanded = expandedItems[item.label];
            return (
              <div key={item.label} className="flex flex-col">
                <button
                  onClick={() => {
                    if (!isOpen) onToggle();
                    toggleExpand(item.label);
                  }}
                  title={!isOpen ? item.label : undefined}
                  className={`
                    flex items-center justify-between h-12 overflow-hidden rounded-lg transition-all duration-300 ease-in-out hover:bg-slate-100 text-slate-700
                    ${isOpen ? "px-3" : "px-0 justify-center"}
                  `}
                >
                  <div className={`flex items-center ${isOpen ? "justify-start" : "justify-center"}`}>
                    <div className="flex items-center justify-center flex-shrink-0">
                      <Icon size={20} />
                    </div>
                    <span className={`text-sm font-medium transition-all duration-300 ease-in-out ${isOpen ? "opacity-100 ml-3 translate-x-0" : "opacity-0 ml-0 -translate-x-4 hidden"}`}>
                      {item.label}
                    </span>
                  </div>
                  {isOpen && (
                    <div className="flex-shrink-0">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  )}
                </button>
                <div 
                  className={`ml-9 space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen && isExpanded ? "max-h-48 mt-1 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  {item.subItems.map((sub) => (
                    <NavLink
                      key={sub.path}
                      to={sub.path}
                      className={({ isActive }) => `
                        flex items-center h-10 px-3 rounded-lg text-sm transition-all duration-300
                        ${isActive ? "bg-blue-50 text-blue-600 font-semibold" : "text-slate-600 hover:bg-slate-50"}
                      `}
                    >
                      {sub.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path!}
              title={!isOpen ? item.label : undefined}
              className={({ isActive }) =>
                `
                  flex items-center h-12 overflow-hidden rounded-lg transition-all duration-300 ease-in-out
                  ${isOpen ? "px-3 justify-start" : "px-0 justify-center"}
                  ${
                    isActive
                      ? "bg-blue-50 text-blue-600 font-semibold"
                      : "hover:bg-slate-50 text-slate-700 font-medium"
                  }
                `
              }
            >
              <div className="flex items-center justify-center flex-shrink-0">
                <Icon size={20} />
              </div>
              <span
                className={`text-sm font-medium transition-all duration-300 ease-in-out ${
                  isOpen ? "opacity-100 ml-3 translate-x-0" : "opacity-0 ml-0 -translate-x-4 hidden"
                }`}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
        </div>
        ))}
      </nav>
    </aside>
  );
}