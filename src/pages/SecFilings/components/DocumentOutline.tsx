import React from 'react';
import {
  ListFilter,
  Layers,
  FileSpreadsheet,
  BookOpen,
  Bookmark,
  ChevronRight
} from 'lucide-react';
import { Badge } from '../../../components/ui/badge';

interface DocumentOutlineProps {
  sections: string[];
  activeSection: string;
  onSelectSection: (section: string) => void;
  totalBlocks: number;
}

const DocumentOutlineComponent: React.FC<DocumentOutlineProps> = ({
  sections,
  activeSection,
  onSelectSection,
  totalBlocks
}) => {
  const getSectionIcon = (section: string) => {
    if (section.includes('Statements of') || section.includes('Position') || section.includes('Loss') || section.includes('Cash')) {
      return FileSpreadsheet;
    }
    if (section.startsWith('Note') || section.startsWith('NOTE') || section.includes('NATURE') || section.includes('ACCOUNTING')) {
      return BookOpen;
    }
    if (section.includes('Cover') || section.includes('Header')) {
      return Bookmark;
    }
    return Layers;
  };

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-3 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-xs text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
            Document Sections
          </h3>
        </div>
        <Badge variant="secondary" className="text-[10px] bg-slate-100 dark:bg-zinc-800">
          {totalBlocks} blocks
        </Badge>
      </div>

      <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
        {/* All Sections Button */}
        <button
          type="button"
          onClick={() => onSelectSection('ALL')}
          className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-colors text-left ${
            activeSection === 'ALL'
              ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/60'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">View Entire Filing (All)</span>
          </div>
          {activeSection === 'ALL' && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
        </button>

        <div className="h-px bg-slate-100 dark:bg-zinc-800 my-1" />

        {/* Section List */}
        {sections.map((sec) => {
          const Icon = getSectionIcon(sec);
          const isSelected = activeSection === sec;

          return (
            <button
              key={sec}
              type="button"
              onClick={() => onSelectSection(sec)}
              className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors text-left group ${
                isSelected
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/60'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="truncate">{sec}</span>
              </div>
              {isSelected && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const DocumentOutline = React.memo(DocumentOutlineComponent);
