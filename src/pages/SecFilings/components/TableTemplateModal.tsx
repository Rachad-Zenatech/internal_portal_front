import React, { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import {
  Scale,
  TrendingDown,
  Activity,
  PieChart,
  FileSpreadsheet,
  Table,
  Check,
  Trash2,
  Save,
  RefreshCw,
  Sparkles,
  Layers,
  AlertTriangle
} from 'lucide-react';
import type { SecFinancialTableBlock } from '../../../types/secFiling';
import type {
  SecFinancialTableTemplate,
  SecFinancialTableTemplateCreate,
  SecFinancialTableTemplateUpdate,
  SecFinancialTableTemplateBlock
} from '../../../types/secFilingTemplate';
import {
  useFinancialTableTemplates,
  useCreateFinancialTableTemplate,
  useUpdateFinancialTableTemplate,
  useDeleteFinancialTableTemplate
} from '../../../hooks/useFinancialTableTemplates';
import { toast } from 'sonner';

export const ICON_OPTIONS: { key: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'scale', label: 'Balance / Scale', icon: Scale },
  { key: 'trending-down', label: 'Trend / Income', icon: TrendingDown },
  { key: 'activity', label: 'Activity / Cash', icon: Activity },
  { key: 'pie-chart', label: 'Pie / Equity', icon: PieChart },
  { key: 'file-spreadsheet', label: 'Spreadsheet / Notes', icon: FileSpreadsheet },
  { key: 'table', label: 'Generic Table', icon: Table }
];

export const COLOR_OPTIONS = [
  { key: 'emerald', label: 'Emerald', class: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300' },
  { key: 'blue', label: 'Blue', class: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-300' },
  { key: 'violet', label: 'Violet', class: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50 border-violet-300' },
  { key: 'amber', label: 'Amber', class: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-300' },
  { key: 'indigo', label: 'Indigo', class: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300' },
  { key: 'slate', label: 'Slate', class: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-zinc-800 border-slate-300' }
];

function sanitizeTableBlock(block: SecFinancialTableBlock): SecFinancialTableTemplateBlock {
  const colCount = Math.max(2, block.headers?.length || 2);
  const headers = block.headers && block.headers.length >= 2
    ? [...block.headers]
    : ['Description / Line Item', 'Value ($)'];
  
  const columnAlignments = block.columnAlignments && block.columnAlignments.length === colCount
    ? [...block.columnAlignments]
    : Array.from({ length: colCount }, (_, i) => (i === 0 ? 'left' : 'right'));

  const rows = (block.rows || []).map((r, idx) => {
    const rawCells = r.cells || [];
    const cells = Array.from({ length: colCount }, (_, cIdx) => rawCells[cIdx] ?? '');
    const cellAlignments = r.cellAlignments
      ? Array.from({ length: colCount }, (_, cIdx) => r.cellAlignments?.[cIdx] || null)
      : undefined;
    return {
      id: r.id || `r-${idx + 1}`,
      type: r.type || 'data',
      cells,
      ...(r.bold !== undefined ? { bold: r.bold } : {}),
      ...(r.italic !== undefined ? { italic: r.italic } : {}),
      ...(r.underline !== undefined ? { underline: r.underline } : {}),
      ...(r.doubleUnderline !== undefined ? { doubleUnderline: r.doubleUnderline } : {}),
      ...(r.shading ? { shading: r.shading } : {}),
      ...(r.indent !== undefined ? { indent: Math.max(0, Math.min(3, r.indent)) } : {}),
      ...(r.align ? { align: r.align } : {}),
      ...(cellAlignments && cellAlignments.some(Boolean) ? { cellAlignments } : {})
    };
  });

  const periodHeaders = block.periodHeaders
    ? block.periodHeaders
        .filter((ph) => ph.columnIndex < colCount)
        .map((ph) => ({
          columnIndex: ph.columnIndex,
          lines: ph.lines && ph.lines.length > 0 ? [...ph.lines] : ['Period']
        }))
    : undefined;

  return {
    title: block.title || 'Schedule of Financial Details',
    headers,
    ...(block.headerShading ? { headerShading: block.headerShading } : {}),
    ...(periodHeaders && periodHeaders.length > 0 ? { periodHeaders } : {}),
    columnAlignments,
    ...(block.columnWidths && block.columnWidths.length === colCount ? { columnWidths: [...block.columnWidths] } : {}),
    rows: rows.length > 0 ? rows : [
      { id: 'r-1', type: 'data', cells: Array.from({ length: colCount }, (_, i) => (i === 0 ? 'Sample Item' : '0')) }
    ],
    ...(block.footnotes && block.footnotes.length > 0 ? { footnotes: [...block.footnotes] } : {})
  };
}

export interface TableTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: SecFinancialTableBlock;
  initialMode?: 'update' | 'create';
  initialTemplateId?: string;
  onTemplateUpdated?: (template: SecFinancialTableTemplate) => void;
}

export const TableTemplateModal: React.FC<TableTemplateModalProps> = ({
  open,
  onOpenChange,
  block,
  initialMode = 'create',
  initialTemplateId,
  onTemplateUpdated
}) => {
  const { data: templateData, isLoading: isTemplatesLoading } = useFinancialTableTemplates();
  const createMutation = useCreateFinancialTableTemplate();
  const updateMutation = useUpdateFinancialTableTemplate();
  const deleteMutation = useDeleteFinancialTableTemplate();

  const templates = templateData?.templates || [];

  const [mode, setMode] = useState<'create' | 'update'>(initialMode);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplateId || '');
  
  // Form fields
  const [name, setName] = useState('');
  const [badge, setBadge] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('table');
  const [colorClass, setColorClass] = useState(COLOR_OPTIONS[0].class);
  const [overwriteLayout, setOverwriteLayout] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Sync mode and selected template when modal opens
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setConfirmDelete(false);
      if (initialTemplateId && templates.some((t) => t.id === initialTemplateId)) {
        setSelectedTemplateId(initialTemplateId);
      } else if (templates.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(templates[0].id);
      }
    }
  }, [open, initialMode, initialTemplateId, templates]);

  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  // Populate form fields based on mode / selection
  useEffect(() => {
    if (mode === 'update' && selectedTemplate) {
      setName(selectedTemplate.name || '');
      setBadge(selectedTemplate.badge || '');
      setDescription(selectedTemplate.description || '');
      setIcon(selectedTemplate.icon || 'table');
      setColorClass(selectedTemplate.color || COLOR_OPTIONS[0].class);
      setOverwriteLayout(true);
    } else if (mode === 'create') {
      setName(block.title ? `Custom: ${block.title.replace(/^Table:\s*/i, '')}` : 'Custom Financial Table');
      setBadge(`${block.headers.length} Cols`);
      setDescription(`Custom statement layout with ${block.rows.length} rows and ${block.headers.length} columns.`);
      setIcon('table');
      setColorClass(COLOR_OPTIONS[0].class);
    }
  }, [mode, selectedTemplate, block]);

  const isSaving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Template name is required.');
      return;
    }

    try {
      const sanitizedBlock = sanitizeTableBlock(block);

      if (mode === 'create') {
        const payload: SecFinancialTableTemplateCreate = {
          name: name.trim(),
          badge: badge.trim() || undefined,
          description: description.trim() || undefined,
          icon,
          color: colorClass,
          block: sanitizedBlock
        };
        const created = await createMutation.mutateAsync(payload);
        toast.success('Financial table template saved successfully!', {
          description: `"${created.name}" is now available across all filings.`
        });
        if (onTemplateUpdated) onTemplateUpdated(created);
        onOpenChange(false);
      } else {
        if (!selectedTemplate) {
          toast.error('Please select a template to update.');
          return;
        }
        const payload: SecFinancialTableTemplateUpdate = {
          name: name.trim(),
          badge: badge.trim() || undefined,
          description: description.trim() || undefined,
          icon,
          color: colorClass,
          ...(overwriteLayout ? { block: sanitizedBlock } : {})
        };
        const updated = await updateMutation.mutateAsync({
          id: selectedTemplate.id,
          payload
        });
        toast.success('Financial table template updated successfully!', {
          description: overwriteLayout
            ? `"${updated.name}" layout replaced with current table.`
            : `"${updated.name}" details updated.`
        });
        if (onTemplateUpdated) onTemplateUpdated(updated);
        onOpenChange(false);
      }
    } catch (err: any) {
      console.error('Failed to save table template:', err);
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to save template.');
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;
    if (selectedTemplate.isBuiltin) {
      toast.error('Built-in standard financial statement templates cannot be deleted.');
      return;
    }
    try {
      await deleteMutation.mutateAsync(selectedTemplate.id);
      toast.success(`Deleted template "${selectedTemplate.name}".`);
      setConfirmDelete(false);
      if (templates.length > 1) {
        const remaining = templates.filter((t) => t.id !== selectedTemplate.id);
        setSelectedTemplateId(remaining[0].id);
      } else {
        setMode('create');
      }
    } catch (err: any) {
      console.error('Failed to delete template:', err);
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to delete template.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl">
        <DialogHeader className="px-6 pt-5 pb-4 bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-slate-900 dark:text-zinc-100">
                  {mode === 'create' ? 'Save as Financial Table Template' : 'Update Financial Table Template'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                  {mode === 'create'
                    ? 'Save this table structure as a reusable template for future filings.'
                    : 'Modify an existing statement layout or metadata in the template database.'}
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 mt-3 p-0.5 bg-slate-200/70 dark:bg-zinc-800 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setMode('update')}
              className={`flex-1 py-1 px-3 rounded-md font-medium transition-all ${
                mode === 'update'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              Update Existing Template
            </button>
            <button
              type="button"
              onClick={() => setMode('create')}
              className={`flex-1 py-1 px-3 rounded-md font-medium transition-all ${
                mode === 'create'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              Save as New Template
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* In update mode: select template */}
          {mode === 'update' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Select Template to Update
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                disabled={isTemplatesLoading || templates.length === 0}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 text-slate-900 dark:text-zinc-100 focus:ring-1 focus:ring-emerald-500"
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} {tpl.badge ? `(${tpl.badge})` : ''} {tpl.isBuiltin ? '[Standard Built-in]' : '[Custom]'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Template Name & Badge */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Template Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Schedule of Intangible Assets"
                className="text-xs h-8"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Badge Tag
              </label>
              <Input
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="e.g. 4 Cols, Custom"
                className="text-xs h-8"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Description / Tooltip
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of statement rows, columns, and purpose..."
              rows={2}
              className="text-xs"
            />
          </div>

          {/* Icon and Color Customization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Menu Icon
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {ICON_OPTIONS.map((opt) => {
                  const IconComp = opt.icon;
                  const isSelected = icon === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setIcon(opt.key)}
                      className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-[11px] transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium'
                          : 'border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      <IconComp className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{opt.label.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Theme Color
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {COLOR_OPTIONS.map((opt) => {
                  const isSelected = colorClass === opt.class;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setColorClass(opt.class)}
                      className={`flex items-center justify-between p-1.5 rounded-lg border text-[11px] capitalize transition-all ${
                        isSelected
                          ? 'ring-2 ring-emerald-500 font-semibold'
                          : 'hover:opacity-90'
                      } ${opt.class}`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Active Table Structure Card */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Active Table Preview
              </span>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px] font-mono">
                  {block.headers.length} Columns
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {block.rows.length} Rows
                </Badge>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-zinc-400 truncate">
              <strong>Title:</strong> {block.title || '(No title)'}
            </p>

            {mode === 'update' && (
              <label className="flex items-start gap-2 pt-1 border-t border-slate-200 dark:border-zinc-700 cursor-pointer text-[11px] text-slate-700 dark:text-zinc-300 select-none">
                <input
                  type="checkbox"
                  checked={overwriteLayout}
                  onChange={(e) => setOverwriteLayout(e.target.checked)}
                  className="rounded text-emerald-600 mt-0.5"
                />
                <span>
                  <strong>Overwrite template layout</strong> with this table ({block.headers.length} cols, {block.rows.length} rows). Uncheck if only updating name/description/badge.
                </span>
              </label>
            )}
          </div>

          {/* Delete prompt if in update mode and non-builtin */}
          {mode === 'update' && selectedTemplate && !selectedTemplate.isBuiltin && (
            <div className="pt-1">
              {confirmDelete ? (
                <div className="p-3 rounded-lg border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-red-700 dark:text-red-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Delete this custom template permanently?</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmDelete(false)}
                      className="h-7 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isSaving}
                      className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                    >
                      Confirm Delete
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  className="text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 h-7 gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Template</span>
                </Button>
              )}
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5 shadow-xs"
            >
              {isSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{mode === 'create' ? 'Save New Template' : 'Update Template'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
