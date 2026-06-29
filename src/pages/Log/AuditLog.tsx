import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, ArrowUpDown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AuditLog() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["auditLogs"],
    queryFn: () => apiClient.get<any[]>("/api/audit-logs"),
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'created_at', direction: 'desc' });

  const sortedLogs = useMemo(() => {
    if (!logs) return [];
    
    let filtered = logs.filter(l => 
      (l.actor_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.action || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.entity_type || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortConfig) {
      filtered.sort((a: any, b: any) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return filtered;
  }, [logs, sortConfig, searchQuery]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getActionBadgeColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('CREATE')) return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400';
    if (act.includes('UPDATE')) return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400';
    if (act.includes('DELETE')) return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400';
    return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-slate-300';
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full gap-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Audit Log</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track system activity, configuration changes, and actions performed by users.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              type="text" 
              placeholder="Search logs..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 w-[280px] bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm flex flex-col">
        <Table>
          <TableHeader className="bg-slate-50/80 dark:bg-zinc-950/50">
            <TableRow>
              <TableHead onClick={() => requestSort("created_at")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                <div className="flex items-center">Date & Time <ArrowUpDown className="ml-2 h-4 w-4" /></div>
              </TableHead>
              <TableHead onClick={() => requestSort("actor_name")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                <div className="flex items-center">Actor <ArrowUpDown className="ml-2 h-4 w-4" /></div>
              </TableHead>
              <TableHead onClick={() => requestSort("action")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                <div className="flex items-center">Action <ArrowUpDown className="ml-2 h-4 w-4" /></div>
              </TableHead>
              <TableHead onClick={() => requestSort("entity_type")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                <div className="flex items-center">Entity Type <ArrowUpDown className="ml-2 h-4 w-4" /></div>
              </TableHead>
              <TableHead onClick={() => requestSort("entity_id")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                <div className="flex items-center">Entity ID <ArrowUpDown className="ml-2 h-4 w-4" /></div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
                </TableCell>
              </TableRow>
            ) : sortedLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">No logs found.</TableCell>
              </TableRow>
            ) : (
              sortedLogs.map((log: any) => (
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
    </div>
  );
}
