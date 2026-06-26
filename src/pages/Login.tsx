import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/services/apiClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const { refreshPermissions } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    const finalEmail = email.includes("@") ? email : `${email}@zenatech.com`;

    setIsLoading(true);
    try {
      const res = await apiClient.post<any>("/api/auth/login", { email: finalEmail, password });
      
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
      
      // Refresh AuthContext permissions so it knows the user is logged in
      await refreshPermissions();
      
      toast.success("Successfully logged in");
      navigate("/");
    } catch (error) {
      toast.error("Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-zinc-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-600/20 to-transparent dark:from-blue-900/20 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
        <div className="flex justify-center mb-8">
          <div className="h-16 w-16 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl flex items-center justify-center border border-slate-200 dark:border-zinc-800">
            <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-500" />
          </div>
        </div>

        <Card className="border-slate-200/60 dark:border-zinc-800/60 shadow-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-[24px] overflow-hidden">
          <CardHeader className="space-y-2 text-center pt-8 pb-6">
            <CardTitle className="text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
              Welcome
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-zinc-400 font-medium">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                  Email Address
                </Label>
                <div className="flex rounded-xl shadow-sm relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                  <Input 
                    id="email" 
                    type="text" 
                    placeholder="name" 
                    value={email.replace(/@zenatech\.com$/, "")}
                    onChange={(e) => setEmail(e.target.value.replace(/@.*$/, ""))}
                    className="pl-10 h-12 rounded-xl rounded-r-none bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 border-r-0 focus-visible:ring-blue-500/30 transition-all"
                    required
                  />
                  <span className="inline-flex items-center rounded-r-xl border border-l-0 border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                    @zenatech.com
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 rounded-xl bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 focus-visible:ring-blue-500/30 transition-all"
                    required
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center pb-8 pt-4 border-t border-slate-100 dark:border-zinc-800/50 mt-2 bg-slate-50/50 dark:bg-zinc-950/30">
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Don't have an account?{" "}
              <a href="#" className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                Contact your administrator
              </a>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
