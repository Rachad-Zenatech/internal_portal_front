import { useState, useEffect, useRef } from "react";
import { Search, Bell, CircleHelp, Building2, BookText, FileText, Banknote, Loader2, LogOut, User, Camera, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import ThemeSwitch from "./ThemeSwitch";
import { useGlobalSearch } from "@/hooks/useSearch";

export default function TopBar() {
  const [inputValue, setInputValue] = useState("");
  const [debouncedValue, setDebouncedValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dayName = currentTime.toLocaleDateString("en-US", { weekday: "short" });
  const monthName = currentTime.toLocaleDateString("en-US", { month: "short" });
  const dateNum = currentTime.getDate();
  const yearNum = currentTime.getFullYear();
  const formattedDate = `${monthName}, ${dateNum} ${yearNum} (${dayName})`;
  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });

  // Debounce input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(inputValue);
    }, 300);
    return () => clearTimeout(handler);
  }, [inputValue]);

  const { data: results = [], isLoading, isFetching } = useGlobalSearch(debouncedValue);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "company": return <Building2 className="h-4 w-4 text-blue-500" />;
      case "gl_account": return <BookText className="h-4 w-4 text-emerald-500" />;
      case "gl_entry": return <FileText className="h-4 w-4 text-amber-500" />;
      case "bank_transaction": return <Banknote className="h-4 w-4 text-purple-500" />;
      default: return <Search className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleResultClick = (url: string) => {
    setIsOpen(false);
    setInputValue("");
    setDebouncedValue("");
    if (url) {
      navigate(url);
    }
  };

  return (
    <header className="h-20 border-b border-border bg-card text-card-foreground flex items-center justify-between px-4 sm:px-6 md:px-8 shrink-0 transition-all duration-300 gap-4">
      <div className="flex-1 flex items-center min-w-0">
        <div ref={containerRef} className="relative w-full max-w-md z-50">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search for anything here..." 
            className="w-full pl-11 bg-muted border-none rounded-full h-11 text-sm shadow-inner focus-visible:ring-1 focus-visible:ring-ring"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (inputValue.trim().length > 0) setIsOpen(true);
            }}
          />
          
          {isOpen && debouncedValue.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border shadow-lg rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              {isLoading || isFetching ? (
                <div className="p-6 flex items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm">Searching...</span>
                </div>
              ) : results.length > 0 ? (
                <div className="max-h-[400px] overflow-y-auto py-2">
                  {results.map((result, idx) => (
                    <div 
                      key={`${result.type}-${result.id}-${idx}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleResultClick(result.url || "/")}
                    >
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border/50 shadow-sm">
                        {getIcon(result.type)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-foreground truncate">{result.title}</span>
                        {result.subtitle && (
                          <span className="text-xs text-muted-foreground truncate">{result.subtitle}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <div className="px-4 py-2 border-t border-border/50 mt-2">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start gap-3 h-14 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300"
                      onClick={() => {
                        setIsOpen(false);
                        setInputValue("");
                        setDebouncedValue("");
                        window.dispatchEvent(new CustomEvent('ask-ai', { detail: { query: debouncedValue } }));
                      }}
                    >
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col items-start min-w-0">
                        <span className="text-sm font-semibold truncate">Ask AI "{debouncedValue}"</span>
                        <span className="text-xs opacity-80 truncate">Can't find what you need? Ask our AI assistant</span>
                      </div>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-8 flex flex-col items-center justify-center text-center">
                  <span className="text-sm text-muted-foreground mb-4">
                    No results found for "{debouncedValue}"
                  </span>
                  <Button 
                    variant="outline" 
                    className="gap-2 rounded-xl border-blue-200 hover:border-blue-300 hover:bg-blue-50 dark:border-blue-900/50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors"
                    onClick={() => {
                      setIsOpen(false);
                      setInputValue("");
                      setDebouncedValue("");
                      window.dispatchEvent(new CustomEvent('ask-ai', { detail: { query: debouncedValue } }));
                    }}
                  >
                    <Sparkles className="h-4 w-4" />
                    Ask AI "{debouncedValue}"
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4 md:gap-5 shrink-0">
        <div className="hidden lg:flex flex-col items-end justify-center mr-2">
          <span className="text-sm font-bold text-foreground leading-tight tracking-tight">
            {formattedTime}
          </span>
          <span className="text-[11px] font-semibold text-muted-foreground mt-0.5">
            {formattedDate}
          </span>
        </div>
        <ThemeSwitch />
        <div className="hidden sm:flex items-center gap-1.5 border-r pr-2 sm:pr-4 md:pr-5 mr-1">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full h-10 w-10">
            <CircleHelp className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full h-10 w-10">
            <Bell className="h-5 w-5" />
          </Button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:bg-muted p-1.5 sm:p-2 sm:pr-3 rounded-xl transition-colors border border-transparent hover:border-border outline-none">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0 border border-border shadow-sm">
                <img src="https://ui-avatars.com/api/?name=Darrell+Steward&background=eff6ff&color=2563eb&rounded=true&bold=true" alt="User avatar" className="h-full w-full object-cover" />
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-sm font-bold text-foreground leading-tight">Darrell Steward</span>
                <span className="text-[11px] font-semibold text-muted-foreground mt-0.5">Super admin</span>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setIsProfileOpen(true)} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setIsLogoutOpen(true)} 
              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-100 dark:focus:bg-red-900/30"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-border/50 shadow-2xl rounded-2xl">
          <div className="h-32 bg-gradient-to-r from-primary to-primary/60 relative">
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
              <div className="relative group">
                <div className="h-24 w-24 rounded-full border-4 border-card bg-muted overflow-hidden shadow-lg">
                  <img src="https://ui-avatars.com/api/?name=Darrell+Steward&background=eff6ff&color=2563eb&rounded=true&bold=true" alt="User avatar" className="h-full w-full object-cover" />
                </div>
                <button className="absolute bottom-0 right-0 h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform">
                  <Camera className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="pt-16 px-6 pb-6">
            <div className="text-center mb-6 flex flex-col items-center space-y-1.5">
              <DialogTitle className="text-2xl font-bold">Darrell Steward</DialogTitle>
              <DialogDescription className="text-sm">
                Super admin · darrell.steward@example.com
              </DialogDescription>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  defaultValue="Darrell"
                  className="bg-muted/50 border-transparent focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  defaultValue="Steward"
                  className="bg-muted/50 border-transparent focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue="darrell.steward@example.com"
                  className="bg-muted/50 border-transparent focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all rounded-xl h-11"
                />
              </div>
            </div>

            <DialogFooter className="mt-8 flex gap-3 sm:justify-end">
              <Button variant="outline" onClick={() => setIsProfileOpen(false)} className="rounded-xl flex-1 sm:flex-none font-semibold">
                Cancel
              </Button>
              <Button type="button" onClick={() => setIsProfileOpen(false)} className="rounded-xl flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all font-semibold">
                Save changes
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
        <DialogContent className="sm:max-w-[400px] border-border/50 shadow-2xl rounded-2xl p-0 overflow-hidden">
          <div className="p-8 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mb-6 shadow-sm ring-8 ring-red-50 dark:ring-red-500/10">
              <LogOut className="h-8 w-8 ml-1" />
            </div>
            
            <div className="mb-2 w-full flex flex-col items-center text-center space-y-1.5">
              <DialogTitle className="text-2xl font-bold text-center">Logout Confirmation</DialogTitle>
            </div>
            
            <p className="text-muted-foreground text-center text-base mb-8 px-2">
              Are you sure you want to do logout?
            </p>

            <DialogFooter className="flex w-full gap-3 sm:justify-center">
              <Button variant="outline" onClick={() => setIsLogoutOpen(false)} className="flex-1 rounded-xl h-11 font-semibold">
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setIsLogoutOpen(false)} 
                className="flex-1 rounded-xl h-11 bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all border-none font-semibold"
              >
                Confirm
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
