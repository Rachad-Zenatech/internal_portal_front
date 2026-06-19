import { Search, Bell, CircleHelp, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ThemeSwitch from "./ThemeSwitch";

export default function TopBar() {
  return (
    <header className="h-20 border-b border-border bg-card text-card-foreground flex items-center justify-between px-8 shrink-0 transition-all duration-300">
      <div className="flex-1 flex items-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search for anything here..." 
            className="w-full pl-11 bg-muted border-none rounded-full h-11 text-sm shadow-inner focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-5">
        <ThemeSwitch />
        <div className="flex items-center gap-1.5 border-r pr-5 mr-1">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full h-10 w-10">
            <CircleHelp className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full h-10 w-10">
            <Bell className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex items-center gap-3 cursor-pointer hover:bg-muted p-2 pr-3 rounded-xl transition-colors border border-transparent hover:border-border">
          <div className="h-10 w-10 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0 border border-border shadow-sm">
            <img src="https://ui-avatars.com/api/?name=Darrell+Steward&background=eff6ff&color=2563eb&rounded=true&bold=true" alt="User avatar" className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground leading-tight">Darrell Steward</span>
            <span className="text-[11px] font-semibold text-muted-foreground mt-0.5">Super admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}
