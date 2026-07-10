import { useMemo, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BankFeedRuleCreate, BankFeedRuleUpdate, RuleCondition, RuleAction, BankFeedRule } from "../../types/bankFeedRule";
import type { ChartOfAccount } from "../../types/chartOfAccount";
import { useChartOfAccounts } from "../../hooks/useChartOfAccount";

interface BankFeedRuleFormProps {
  initialData?: BankFeedRule | null;
  onSave: (data: BankFeedRuleCreate | BankFeedRuleUpdate) => void;
  onCancel: () => void;
  isSaving: boolean;
}

const FIELD_OPTIONS = [
  { value: '1', label: 'Description' },
  { value: '6', label: 'Bank text' },
  { value: '2', label: 'Amount' },
  { value: '10', label: 'Money direction' },
];

const ACTION_OPTIONS = [
  { value: '0', label: 'Category' },
  { value: '5', label: 'Payee' },
  { value: '1', label: 'Description / Memo' },
  { value: '2', label: 'Class' },
  { value: '3', label: 'Location' },
];

type RuleFormCondition = {
  id: string;
  rule_type: number;
  operator: string;
  val: string;
};

type RuleFormAction = {
  id: string;
  action_type: number;
  val: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNestedRuleValue(value: unknown) {
  return isRecord(value) && "value" in value ? value.value : value;
}

function toFormValue(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(toFormValue).join(", ");
  if (isRecord(value) && typeof value.account_name === "string") return value.account_name;
  return JSON.stringify(value);
}

const getOperatorsForField = (fieldId: string) => {
  if (fieldId === '1' || fieldId === '6') {
    return [
      { value: 'contains', label: 'Contains' },
      { value: 'does_not_contain', label: 'Does not contain' },
      { value: 'equals', label: 'Equals' },
      { value: 'not_equals', label: 'Does not equal' },
    ];
  }
  if (fieldId === '2') {
    return [
      { value: 'equals', label: 'Equals' },
      { value: 'greater_than', label: 'Greater than' },
      { value: 'less_than', label: 'Less than' },
      { value: 'greater_than_or_equal', label: 'Greater than or equal to' },
      { value: 'less_than_or_equal', label: 'Less than or equal to' },
    ];
  }
  if (fieldId === '10') {
    return [
      { value: 'equals', label: 'Is' },
    ];
  }
  return [];
};

export default function BankFeedRuleForm({ initialData, onSave, onCancel, isSaving }: BankFeedRuleFormProps) {
  const [ruleName, setRuleName] = useState(initialData?.rule_name || '');
  const [isAndRule, setIsAndRule] = useState(initialData?.is_and_rule ?? true);
  
  // Transform existing condition values for UI, extracting operator and value if it's a rich JSON
  const initialConditions = useMemo(() => {
    if (!initialData?.conditions || initialData.conditions.length === 0) {
      return [{ id: "condition-new", rule_type: 1, operator: 'contains', val: '' }];
    }
    return initialData.conditions.map((c, index) => {
      let operator = 'contains';
      let val = toFormValue(c.value);
      if (isRecord(c.value)) {
        operator = typeof c.value.operator === "string" ? c.value.operator : 'contains';
        val = toFormValue(c.value.value);
      } else {
        if (c.rule_type === 10 || c.rule_type === 2) {
          operator = 'equals';
        }
      }
      
      if (c.rule_type === 10 && operator !== 'equals') {
        operator = 'equals';
      }

      return { id: c.id ? `condition-${c.id}` : `condition-${index}`, rule_type: c.rule_type, operator, val };
    });
  }, [initialData]);

  const [conditions, setConditions] = useState<RuleFormCondition[]>(initialConditions);

  const initialActions = useMemo(() => {
    if (!initialData?.actions || initialData.actions.length === 0) {
      return [{ id: "action-new", action_type: 0, val: '' }];
    }
    return initialData.actions
      .filter(a => {
        const v = getNestedRuleValue(a.value);
        return !(Array.isArray(v) && v.length === 0);
      })
      .map((a, index) => {
        const val = toFormValue(getNestedRuleValue(a.value));
        
        let type = a.action_type;
        if (type === 9) type = 1; // consolidate Memo into Description/Memo
        
        return { id: a.id ? `action-${a.id}` : `action-${index}`, action_type: type, val };
      });
  }, [initialData]);

  const [actions, setActions] = useState<RuleFormAction[]>(initialActions);

  const { data: coaData } = useChartOfAccounts();

  const handleSave = () => {
    if (!ruleName.trim()) {
      alert("Rule name is required.");
      return;
    }
    if (conditions.length === 0) {
      alert("At least one condition is required.");
      return;
    }
    if (actions.length === 0) {
      alert("At least one action is required.");
      return;
    }

    const payloadConditions: RuleCondition[] = conditions.map((c, idx) => ({
      rule_type: c.rule_type,
      position: idx,
      value: {
        operator: c.operator,
        value: c.val
      }
    }));

    const payloadActions: RuleAction[] = actions.map((a, idx) => {
      let finalValue: RuleAction["value"] = a.val;
      if (a.action_type === 0 && coaData?.chart_of_accounts) {
        // Try to match category name to provide rich object if needed, but simple string value usually works
        // The backend expects string for chart of account or object with accountName/accountNumber
        const account = coaData.chart_of_accounts.find((acc: ChartOfAccount) => acc.account_name === a.val || String(acc.account_number) === a.val);
        if (account) {
           finalValue = { account_number: String(account.account_number), account_name: account.account_name };
        }
      }

      return {
        action_type: a.action_type,
        position: idx,
        value: finalValue
      };
    });

    onSave({
      rule_name: ruleName,
      is_and_rule: isAndRule,
      conditions: payloadConditions,
      actions: payloadActions
    });
  };

  return (
    <div className="flex flex-col h-full bg-background dark:bg-slate-950 text-foreground">
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="ruleName" className="text-sm font-semibold">Rule Name</Label>
            <Input 
              id="ruleName" 
              value={ruleName} 
              onChange={e => setRuleName(e.target.value)} 
              placeholder="e.g. Office Supplies from Amazon"
              className="mt-1.5"
            />
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <input 
              type="checkbox" 
              id="isAndRule" 
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer bg-transparent"
              checked={isAndRule} 
              onChange={e => setIsAndRule(e.target.checked)} 
            />
            <Label htmlFor="isAndRule" className="text-sm font-medium cursor-pointer">
              {isAndRule ? "Match ALL of the following conditions" : "Match ANY of the following conditions"}
            </Label>
          </div>
        </div>

        {/* Conditions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Conditions</h3>
          </div>
          
          <div className="space-y-3">
            {conditions.map((c, i) => (
              <div key={c.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="w-full sm:w-[200px] shrink-0">
                  <Select value={String(c.rule_type)} onValueChange={v => {
                    const newType = parseInt(v);
                    const ops = getOperatorsForField(v);
                    const newConditions = [...conditions];
                    newConditions[i] = { 
                      ...c, 
                      rule_type: newType, 
                      operator: ops[0]?.value || 'contains',
                      val: newType === 10 ? 'money_out' : ''
                    };
                    setConditions(newConditions);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Field" />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full sm:w-[180px] shrink-0">
                  <Select value={c.operator} onValueChange={v => {
                    const newConditions = [...conditions];
                    newConditions[i].operator = v;
                    setConditions(newConditions);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Operator" />
                    </SelectTrigger>
                    <SelectContent>
                      {getOperatorsForField(String(c.rule_type)).map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 w-full flex items-center gap-2">
                  {c.rule_type === 10 ? (
                    <Select value={String(c.val)} onValueChange={v => {
                      const newConditions = [...conditions];
                      newConditions[i].val = v;
                      setConditions(newConditions);
                    }}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Value" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="money_out">Money out</SelectItem>
                        <SelectItem value="money_in">Money in</SelectItem>
                        <SelectItem value="-1">Money out (-1)</SelectItem>
                        <SelectItem value="1">Money in (1)</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : c.rule_type === 2 ? (
                    <Input 
                      type="number" 
                      value={c.val} 
                      onChange={e => {
                        const newConditions = [...conditions];
                        newConditions[i].val = e.target.value;
                        setConditions(newConditions);
                      }}
                      className="flex-1"
                      placeholder="e.g. 50.00"
                    />
                  ) : (
                    <Input 
                      value={c.val} 
                      onChange={e => {
                        const newConditions = [...conditions];
                        newConditions[i].val = e.target.value;
                        setConditions(newConditions);
                      }}
                      className="flex-1"
                      placeholder="Value"
                    />
                  )}
                  
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 shrink-0" onClick={() => {
                    setConditions(conditions.filter(cond => cond.id !== c.id));
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          <Button variant="outline" size="sm" onClick={() => {
            setConditions([...conditions, { id: `condition-${Date.now()}`, rule_type: 1, operator: 'contains', val: '' }]);
          }} className="mt-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Condition
          </Button>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Assign</h3>
          </div>
          
          <div className="space-y-3">
            {actions.map((a, i) => (
              <div key={a.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-blue-50/30 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800/50">
                <div className="w-full sm:w-[200px] shrink-0">
                  <Select value={String(a.action_type)} onValueChange={v => {
                    const newActions = [...actions];
                    newActions[i].action_type = parseInt(v);
                    newActions[i].val = '';
                    setActions(newActions);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 w-full flex items-center gap-2">
                  {a.action_type === 0 ? (
                    <Select value={a.val} onValueChange={v => {
                      const newActions = [...actions];
                      newActions[i].val = v;
                      setActions(newActions);
                    }}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select Category/Account..." />
                      </SelectTrigger>
                      <SelectContent>
                        {coaData?.chart_of_accounts?.map((acc: ChartOfAccount) => (
                          <SelectItem key={acc.id} value={acc.account_name}>
                            {acc.account_number} - {acc.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input 
                      value={a.val} 
                      onChange={e => {
                        const newActions = [...actions];
                        newActions[i].val = e.target.value;
                        setActions(newActions);
                      }}
                      className="flex-1"
                      placeholder="Value"
                    />
                  )}
                  
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 shrink-0" onClick={() => {
                    setActions(actions.filter(act => act.id !== a.id));
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={() => {
            setActions([...actions, { id: `action-${Date.now()}`, action_type: 0, val: '' }]);
          }} className="mt-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Action
          </Button>
        </div>

      </div>

      <div className="p-6 border-t border-border bg-muted/20 shrink-0 flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>Cancel</Button>
        <Button onClick={handleSave} disabled={isSaving} className="bg-[#18181b] hover:bg-[#27272a] text-white">
          {isSaving ? "Saving..." : "Save Rule"}
        </Button>
      </div>
    </div>
  );
}
