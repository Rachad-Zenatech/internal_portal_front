// src/components/AppShell/AppShell.tsx
import { useState, type ReactNode } from "react";
import Sidebar from "./Sidebar";

interface Props {
  children: ReactNode;
}

export default function AppShell({ children }: Props) {

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
      
      isOpen={isSidebarOpen}
      onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <main className="flex-1 overflow-auto bg-slate-50">
        {children}
      </main>
    </div>
  );
}