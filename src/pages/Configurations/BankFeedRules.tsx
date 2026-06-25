import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { BankFeedRule } from "../../types/bankFeedRule";
import { useBankFeedRules } from "../../hooks/useBankFeedRule";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const formatConditionValue = (type: number, value: any) => {
  if (type === 10) {
    if (String(value) === "1") return "Money in / deposit";
    if (String(value) === "-1") return "Money out / expense";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const formatActionValue = (value: any) => {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value) && value.length === 0) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export default function BankFeedRules() {
  const { data: rules, isPending: loadingRules } = useBankFeedRules();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRule, setSelectedRule] = useState<BankFeedRule | null>(null);

  const filteredRules = rules?.filter(r => r.rule_name.toLowerCase().includes(searchQuery.toLowerCase())) || [];

  return (
    <div className="w-full h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Feed Rules</h1>
          <p className="text-slate-500 mt-1">Manage rules for automatically categorizing bank transactions.</p>
        </div>
      </div>

      <div className="flex items-center justify-between shrink-0">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Search rules..." 
            className="pl-9 bg-white" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card className="flex-1 min-h-0 overflow-hidden border-slate-200 shadow-sm p-0 flex flex-col">
        <Table containerClassName="flex-1 overflow-auto">
          <TableHeader className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableHead className="h-12 font-semibold text-slate-700">Rule Name</TableHead>
              <TableHead className="h-12 font-semibold text-slate-700">Conditions</TableHead>
              <TableHead className="h-12 font-semibold text-slate-700">Match</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingRules ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                </TableRow>
              ))
            ) : filteredRules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center text-slate-500">
                  {searchQuery ? "No rules found matching your search." : "No bank feed rules have been created yet."}
                </TableCell>
              </TableRow>
            ) : (
              filteredRules.map((rule) => (
                <TableRow key={rule.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedRule(rule)}>
                  <TableCell className="font-medium text-slate-900">{rule.rule_name}</TableCell>
                  <TableCell className="text-slate-600">{rule.conditions.length} condition(s)</TableCell>
                  <TableCell className="text-slate-600">
                    {rule.is_and_rule ? "All" : "Any"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={selectedRule !== null} onOpenChange={(open) => { if (!open) setSelectedRule(null); }}>
        <DialogContent className="sm:max-w-6xl w-[90vw] max-h-[90vh] bg-white p-0 overflow-hidden resize border-none shadow-2xl min-w-[300px] min-h-[300px] flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-5 shrink-0">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-800">
                {selectedRule?.rule_name}
              </DialogTitle>
              <DialogDescription className="text-slate-500 mt-1">
                Rule configuration details for automatic matching.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="px-6 py-6 overflow-y-auto space-y-8 flex-1">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-500">Conditions</h3>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Match {selectedRule?.is_and_rule ? 'All' : 'Any'}
                </span>
              </div>
              
              <div className="space-y-2.5">
                {selectedRule?.conditions.map((c, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 bg-slate-50/80 border border-slate-100 p-3 rounded-lg text-sm">
                    <span className="font-medium text-slate-600 sm:w-1/3 shrink-0">{c.rule_type_name || `Type ${c.rule_type}`}</span>
                    <span className="text-slate-900 font-semibold break-words whitespace-normal flex-1">
                      {formatConditionValue(c.rule_type, c.value)}
                    </span>
                  </div>
                ))}
                {(!selectedRule?.conditions || selectedRule.conditions.length === 0) && (
                  <div className="text-sm text-slate-500 italic p-3 text-center bg-slate-50/50 rounded-lg">No conditions set.</div>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-500">Actions</h3>
              </div>
              
              <div className="space-y-2.5">
                {selectedRule?.actions.map((a, i) => {
                  if (Array.isArray(a.value) && a.value.length === 0) return null;
                  return (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 bg-blue-50/30 border border-blue-100/50 p-3 rounded-lg text-sm">
                      <span className="font-medium text-slate-600 sm:w-1/3 shrink-0">{a.action_type_name || `Action ${a.action_type}`}</span>
                      <span className="text-slate-900 font-semibold break-words whitespace-normal flex-1">
                        {formatActionValue(a.value)}
                      </span>
                    </div>
                  );
                })}
                {(!selectedRule?.actions || selectedRule.actions.length === 0) && (
                  <div className="text-sm text-slate-500 italic p-3 text-center bg-slate-50/50 rounded-lg">No actions set.</div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
