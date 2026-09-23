import React, { useState } from 'react';
import {
  Plus,
  Heading,
  AlignLeft,
  Table as TableIcon,
  AlertCircle,
  FileSignature,
  Minus,
  Tag,
  Image as ImageIcon
} from 'lucide-react';
import type { SecBlockType } from '../../../types/secFiling';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';

interface InlineAddBlockProps {
  onAdd: (type: SecBlockType) => void;
  className?: string;
  isAlwaysVisible?: boolean;
}

const BLOCK_OPTIONS: {
  type: SecBlockType;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  {
    type: 'paragraph',
    label: 'Paragraph / Disclosure',
    desc: 'Standard financial text and narrative disclosure',
    icon: AlignLeft,
    color: 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
  },
  {
    type: 'heading',
    label: 'Section Heading',
    desc: 'H1–H4 Title or statement section header',
    icon: Heading,
    color: 'text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40'
  },
  {
    type: 'image',
    label: 'Picture / Corporate Logo',
    desc: 'Embed company logos, charts, or images',
    icon: ImageIcon,
    color: 'text-pink-500 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/40'
  },
  {
    type: 'financial_table',
    label: 'Financial Statement Table',
    desc: 'Multi-column statement grid with notes and totals',
    icon: TableIcon,
    color: 'text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
  },
  {
    type: 'callout',
    label: 'Auditor / Notice Box',
    desc: 'Highlighted unreviewed or regulatory callout',
    icon: AlertCircle,
    color: 'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
  },
  {
    type: 'signature',
    label: 'Officer Signatures',
    desc: 'CEO/CFO certification sign-off block',
    icon: FileSignature,
    color: 'text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
  },
  {
    type: 'divider',
    label: 'Section / Page Break',
    desc: 'Visual divider or hard print page break',
    icon: Minus,
    color: 'text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800'
  },
  {
    type: 'metadata',
    label: 'SEC Filing Header & CIK',
    desc: 'SEC EDGAR taxonomy and period metadata',
    icon: Tag,
    color: 'text-sky-500 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40'
  }
];

const InlineAddBlockComponent: React.FC<InlineAddBlockProps> = ({
  onAdd,
  className = '',
  isAlwaysVisible = false
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`group relative flex items-center justify-center select-none h-6 my-1 transition-opacity ${
        isAlwaysVisible || open
          ? 'opacity-100'
          : 'opacity-0 hover:opacity-100'
      } ${className}`}
    >
      <div className="absolute inset-x-0 h-px border-t border-dashed border-slate-200 dark:border-zinc-800 group-hover:border-blue-400 dark:group-hover:border-blue-600 transition-colors" />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="relative z-10 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[11px] font-medium text-slate-600 dark:text-zinc-300 shadow-sm hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 hover:scale-105 active:scale-95 transition-transform"
          >
            <Plus className="w-3 h-3" />
            <span>Add Block</span>
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="center"
          className="w-80 p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl rounded-xl z-50"
        >
          <div className="px-2 py-1.5 border-b border-slate-100 dark:border-zinc-800 mb-1">
            <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
              Insert SEC Filing Block
            </p>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Select a block type to add to the document
            </p>
          </div>

          <div className="grid grid-cols-1 gap-1 max-h-72 overflow-y-auto pr-1">
            {BLOCK_OPTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => {
                    onAdd(item.type);
                    setOpen(false);
                  }}
                  className="flex items-start gap-3 p-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-zinc-800/70 transition-colors group/btn"
                >
                  <div className={`p-1.5 rounded-md ${item.color} shrink-0 mt-0.5`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-900 dark:text-zinc-100 group-hover/btn:text-blue-600 dark:group-hover/btn:text-blue-400">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                      {item.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export const InlineAddBlock = React.memo(InlineAddBlockComponent);
