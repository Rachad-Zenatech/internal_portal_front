import type { ReactNode } from "react";
import { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import FloatingChat from "./FloatingChat";
import Breadcrumbs from "./Breadcrumbs";

interface Props {
  children: ReactNode;
}

export default function AppShell({ children }: Props) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <TopBar />
        <main className="flex-1 overflow-auto p-8 bg-background flex flex-col min-h-0">
          <Breadcrumbs />
          <div className="flex-1 flex flex-col min-h-0">
            {children}
          </div>
        </main>
        <FloatingChat />
      </div>
    </div>
  );
}
