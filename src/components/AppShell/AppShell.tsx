import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import FloatingChat from "./FloatingChat";
import Breadcrumbs from "./Breadcrumbs";
import SessionTimeout from "./SessionTimeout";
import { useAuth } from "@/lib/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound } from "lucide-react";
import { apiClient } from "@/services/apiClient";

interface Props {
  children: ReactNode;
}

export default function AppShell({ children }: Props) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, refreshPermissions } = useAuth();
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    
    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleForcePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    
    try {
      setIsSaving(true);
      setPasswordError("");
      await apiClient.put("/api/me/password", { new_password: newPassword });
      await refreshPermissions(); // This will fetch the updated user with force_password_change: false
    } catch (err: any) {
      setPasswordError(err.response?.data?.detail || "Failed to update password");
    } finally {
      setIsSaving(false);
    }
  };

  const showForcePasswordDialog = user?.force_password_change === true;

  return (
    <div className="flex h-screen min-w-[375px] min-h-[400px] overflow-hidden bg-background text-foreground">
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

      <SessionTimeout />

      <Dialog open={showForcePasswordDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[425px] [&>button]:hidden outline-none">
          <DialogHeader className="flex flex-col items-center space-y-4 pt-4">
            <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
              <KeyRound className="h-8 w-8" />
            </div>
            <DialogTitle className="text-xl text-center">Set Your Password</DialogTitle>
            <DialogDescription className="text-center">
              Welcome! Since this is your first time logging in, you must set a new secure password before continuing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="forceNewPass">New Password</Label>
              <Input
                id="forceNewPass"
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); }}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forceConfirmPass">Confirm Password</Label>
              <Input
                id="forceConfirmPass"
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }}
                placeholder="Confirm new password"
              />
            </div>
            {passwordError && (
              <p className="text-sm text-red-500 font-medium">{passwordError}</p>
            )}
          </div>

          <DialogFooter>
            <Button 
              className="w-full" 
              onClick={handleForcePasswordChange}
              disabled={isSaving || !newPassword || !confirmPassword}
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
