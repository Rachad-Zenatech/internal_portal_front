import { useState, useEffect, useRef } from "react";
import { Search, Bell, CircleHelp, Building2, BookText, FileText, Banknote, Loader2, LogOut, User, Camera, Sparkles, RefreshCw } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import ThemeSwitch from "./ThemeSwitch";
import { useGlobalSearch } from "@/hooks/useSearch";
import { useAuth } from "@/lib/AuthContext";
import { useNotifications, useUnreadNotificationCount, useMarkNotificationAsRead, useClearReadNotifications } from "@/hooks/useNotifications";


export default function TopBar() {
  const [inputValue, setInputValue] = useState("");
  const [debouncedValue, setDebouncedValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, roles, logout } = useAuth();
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
  const { data: notifications = [] } = useNotifications();
  const { data: unreadCountData } = useUnreadNotificationCount();
  const { mutate: markAsRead } = useMarkNotificationAsRead();
  const { mutate: clearRead } = useClearReadNotifications();
  const unreadCount = unreadCountData?.count || 0;
  const hasReadNotifications = notifications.some(n => n.is_read);

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
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div><ThemeSwitch /></div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Toggle Theme</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="hidden sm:flex items-center gap-1.5 border-r pr-2 sm:pr-4 md:pr-5 mr-1">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full h-10 w-10" onClick={() => window.location.reload()}>
                  <RefreshCw className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh Page</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full h-10 w-10">
                  <CircleHelp className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Help Center</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground hover:bg-muted rounded-full h-10 w-10 outline-none focus-visible:ring-0">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-card" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{unreadCount} new</span>
                  )}
                </div>
                {hasReadNotifications && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={(e) => { e.preventDefault(); e.stopPropagation(); clearRead(); }}>
                    Clear
                  </Button>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    You have no notifications.
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => {
                        if (!notification.is_read) {
                          markAsRead(notification.id);
                        }
                        if (notification.link_url) {
                          navigate(notification.link_url);
                        }
                      }}
                      className={`p-4 border-b last:border-0 cursor-pointer transition-colors ${
                        !notification.is_read ? "bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-900/10 dark:hover:bg-blue-900/20" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-1 space-y-1">
                          <p className={`text-sm leading-snug ${!notification.is_read ? "font-semibold text-foreground" : "font-medium text-muted-foreground"}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1.5 font-medium uppercase tracking-wider">
                            {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0 shadow-sm" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:bg-muted p-1.5 sm:p-2 sm:pr-3 rounded-xl transition-colors border border-transparent hover:border-border outline-none">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0 border border-border shadow-sm">
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || user?.email || "User")}&background=eff6ff&color=2563eb&rounded=true&bold=true`} alt="User avatar" className="h-full w-full object-cover" />
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-sm font-bold text-foreground leading-tight">{user?.full_name || "User"}</span>
                <span className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                  {user?.is_super_admin ? "Super Admin" : roles.length > 0 ? roles[0].name : "Standard User"}
                </span>
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
        <DialogContent className="w-[95vw] sm:max-w-[425px] p-0 overflow-hidden border-border/50 shadow-2xl rounded-2xl max-h-[90vh] flex flex-col">
          <div className="h-32 shrink-0 bg-gradient-to-r from-primary to-primary/60 relative">
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
              <div className="relative group">
                <div className="h-24 w-24 rounded-full border-4 border-card bg-muted overflow-hidden shadow-lg">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || user?.email || "User")}&background=eff6ff&color=2563eb&rounded=true&bold=true`} alt="User avatar" className="h-full w-full object-cover" />
                </div>
                <button className="absolute bottom-0 right-0 h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform">
                  <Camera className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="pt-16 px-4 sm:px-6 pb-6 overflow-y-auto flex-1">
            <div className="text-center mb-6 flex flex-col items-center space-y-1.5">
              <DialogTitle className="text-xl sm:text-2xl font-bold">{user?.full_name || "User"}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {user?.is_super_admin ? "Super Admin" : roles.length > 0 ? roles.map(r => r.name).join(", ") : "Standard User"} · {user?.email}
              </DialogDescription>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Full Name
                </Label>
                <Input
                  id="firstName"
                  readOnly
                  defaultValue={user?.full_name || ""}
                  className="bg-muted/50 border-transparent focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Email Address
                </Label>
                <div className="flex rounded-xl shadow-sm">
                  <Input
                    id="email"
                    type="text"
                    readOnly
                    defaultValue={user?.email ? user.email.replace(/@zenatech\.com$/, "") : ""}
                    className="bg-muted/50 border-transparent focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all rounded-xl rounded-tr-none rounded-br-none h-11 border-r-0"
                  />
                  <span className="inline-flex items-center rounded-r-xl border border-transparent border-l-0 bg-muted/50 px-3 text-sm text-slate-500 dark:text-zinc-400">
                    @zenatech.com
                  </span>
                </div>
              </div>

            </div>

            <DialogFooter className="mt-8 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <Button variant="outline" onClick={() => setIsProfileOpen(false)} className="rounded-xl w-full sm:w-auto font-semibold">
                Close
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
                onClick={() => {
                  setIsLogoutOpen(false);
                  logout();
                }} 
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
