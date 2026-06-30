import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, ArrowUpDown, Loader2, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AuditLog() {
  const { data: auditLogs, isLoading: isAuditLoading } = useQuery({
    queryKey: ["auditLogs"],
    queryFn: () => apiClient.get<any[]>("/api/audit-logs"),
  });

  const { data: loginActivities, isLoading: isLoginLoading } = useQuery({
    queryKey: ["loginActivities"],
    queryFn: () => apiClient.get<any[]>("/api/login-activities"),
  });

  // Audit Logs State
  const [auditSearchQuery, setAuditSearchQuery] = useState("");
  const [auditSortConfig, setAuditSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'created_at', direction: 'desc' });

  // Login Activities State
  const [loginSearchQuery, setLoginSearchQuery] = useState("");
  const [loginSortConfig, setLoginSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'created_at', direction: 'desc' });

  // Audit Logs Logic
  const sortedAuditLogs = useMemo(() => {
    if (!auditLogs) return [];
    
    let filtered = auditLogs.filter(l => 
      (l.actor_name || "").toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
      (l.action || "").toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
      (l.entity_type || "").toLowerCase().includes(auditSearchQuery.toLowerCase())
    );

    if (auditSortConfig) {
      filtered.sort((a: any, b: any) => {
        let valA = a[auditSortConfig.key];
        let valB = b[auditSortConfig.key];
        
        if (auditSortConfig.key === 'created_at') {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        }

        if (valA < valB) {
          return auditSortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return auditSortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return filtered;
  }, [auditLogs, auditSortConfig, auditSearchQuery]);

  const requestAuditSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (auditSortConfig && auditSortConfig.key === key && auditSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setAuditSortConfig({ key, direction });
  };

  const getActionBadgeColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('CREATE')) return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400';
    if (act.includes('UPDATE')) return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400';
    if (act.includes('DELETE')) return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400';
    return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-slate-300';
  };

  // Login Activities Logic
  const sortedLoginActivities = useMemo(() => {
    if (!loginActivities) return [];
    
    let filtered = loginActivities.filter(l => 
      (l.user_full_name || "").toLowerCase().includes(loginSearchQuery.toLowerCase()) ||
      (l.email || "").toLowerCase().includes(loginSearchQuery.toLowerCase()) ||
      (l.ip_address || "").toLowerCase().includes(loginSearchQuery.toLowerCase()) ||
      (l.failure_reason || "").toLowerCase().includes(loginSearchQuery.toLowerCase())
    );

    if (loginSortConfig) {
      filtered.sort((a: any, b: any) => {
        let valA = a[loginSortConfig.key];
        let valB = b[loginSortConfig.key];
        
        if (loginSortConfig.key === 'created_at') {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        }

        if (valA < valB) {
          return loginSortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return loginSortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return filtered;
  }, [loginActivities, loginSortConfig, loginSearchQuery]);

  const requestLoginSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (loginSortConfig && loginSortConfig.key === key && loginSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setLoginSortConfig({ key, direction });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full gap-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-blue-600" />
            Audit & Security Logs
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track system activity, configuration changes, and login attempts.</p>
        </div>
      </div>

      <Tabs defaultValue="actions" className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-[400px] grid-cols-2 mb-4" variant="line">
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="logins">Login Activities</TabsTrigger>
        </TabsList>
        
        <TabsContent value="actions" className="flex-1 flex flex-col min-h-0 m-0 data-[state=active]:flex">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                type="text" 
                placeholder="Search actions..." 
                value={auditSearchQuery}
                onChange={e => setAuditSearchQuery(e.target.value)}
                className="pl-9 w-[280px] bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl"
              />
            </div>
          </div>
          
          <div className="flex-1 min-h-0 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-auto shadow-sm flex flex-col">
            <Table>
              <TableHeader className="bg-slate-50/80 dark:bg-zinc-950/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead onClick={() => requestAuditSort("created_at")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                    <div className="flex items-center">Date & Time <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                  <TableHead onClick={() => requestAuditSort("actor_name")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                    <div className="flex items-center">Actor <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                  <TableHead onClick={() => requestAuditSort("action")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                    <div className="flex items-center">Action <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                  <TableHead onClick={() => requestAuditSort("entity_type")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                    <div className="flex items-center">Entity Type <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                  <TableHead onClick={() => requestAuditSort("entity_id")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                    <div className="flex items-center">Entity ID <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isAuditLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
                    </TableCell>
                  </TableRow>
                ) : sortedAuditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">No logs found.</TableCell>
                  </TableRow>
                ) : (
                  sortedAuditLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900 dark:text-slate-100">{log.actor_name || 'System'}</span>
                          {log.actor_email && <span className="text-xs text-slate-500">{log.actor_email}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getActionBadgeColor(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{log.entity_type}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-500 max-w-[150px] truncate" title={log.entity_id}>
                        {log.entity_id}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="logins" className="flex-1 flex flex-col min-h-0 m-0 data-[state=active]:flex">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                type="text" 
                placeholder="Search activities..." 
                value={loginSearchQuery}
                onChange={e => setLoginSearchQuery(e.target.value)}
                className="pl-9 w-[280px] bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl"
              />
            </div>
          </div>
          
          <div className="flex-1 min-h-0 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-auto shadow-sm flex flex-col">
            <Table>
              <TableHeader className="bg-slate-50/80 dark:bg-zinc-950/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead onClick={() => requestLoginSort("created_at")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors w-[200px]">
                    <div className="flex items-center">Date & Time <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                  <TableHead onClick={() => requestLoginSort("email")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                    <div className="flex items-center">Account <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                  <TableHead onClick={() => requestLoginSort("success")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                    <div className="flex items-center">Status <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                  <TableHead onClick={() => requestLoginSort("ip_address")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                    <div className="flex items-center">IP Address <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                  <TableHead className="w-[300px]">
                    User Agent
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoginLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
                    </TableCell>
                  </TableRow>
                ) : sortedLoginActivities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">No login activities found.</TableCell>
                  </TableRow>
                ) : (
                  sortedLoginActivities.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900 dark:text-slate-100">{log.user_full_name || 'Unknown'}</span>
                          <span className="text-xs text-slate-500">{log.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.success ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 gap-1.5">
                            <CheckCircle2 className="h-3 w-3" />
                            Success
                          </Badge>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 gap-1.5 w-fit">
                              <XCircle className="h-3 w-3" />
                              Failed
                            </Badge>
                            <span className="text-xs text-red-600 dark:text-red-400 font-medium truncate max-w-[200px]" title={log.failure_reason}>
                              {log.failure_reason}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{log.ip_address || 'N/A'}</TableCell>
                      <TableCell className="text-xs text-slate-500 truncate max-w-[300px]" title={log.user_agent}>
                        {log.user_agent || 'Unknown'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
