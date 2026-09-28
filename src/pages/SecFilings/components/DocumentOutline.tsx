import React, { useMemo } from 'react';
import {
  ListFilter,
  Layers,
  FileSpreadsheet,
  BookOpen,
  Bookmark,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  MoreVertical,
} from 'lucide-react';
import type { SecBlock } from '../../../types/secFiling';
import { Badge } from '../../../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../../../components/ui/dropdown-menu';

interface DocumentOutlineProps {
  sections: string[];
  activeSection: string;
  onSelectSection: (section: string) => void;
  totalBlocks: number;
  blocks?: SecBlock[];
  onMoveSection?: (sectionName: string, direction: 'up' | 'down') => void;
  onReorderSection?: (sectionName: string, targetIndex: number) => void;
}

const DocumentOutlineComponent: React.FC<DocumentOutlineProps> = ({
  sections,
  activeSection,
  onSelectSection,
  totalBlocks,
  blocks = [],
  onMoveSection,
  onReorderSection
}) => {
  const getSectionIcon = (section: string) => {
    if (
      section.includes('Statements of') ||
      section.includes('Position') ||
      section.includes('Loss') ||
      section.includes('Cash')
    ) {
      return FileSpreadsheet;
    }
    if (
      section.startsWith('Note') ||
      section.startsWith('NOTE') ||
      section.includes('NATURE') ||
      section.includes('ACCOUNTING')
    ) {
      return BookOpen;
    }
    if (section.includes('Cover') || section.includes('Header')) {
      return Bookmark;
    }
    return Layers;
  };

  // Block counts per section
  const sectionCounts = useMemo(() => {
    const map: Record<string, number> = {};
    blocks.forEach((b) => {
      if (b.section) {
        map[b.section] = (map[b.section] || 0) + 1;
      }
    });
    return map;
  }, [blocks]);

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-3 space-y-3 shadow-xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-xs text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
              Document Sections
            </h3>
          </div>
          <p className="text-[10px] text-slate-400">Reorder whole sections or filter view</p>
        </div>
        <Badge variant="secondary" className="text-[10px] bg-slate-100 dark:bg-zinc-800 font-mono">
          {totalBlocks} blocks
        </Badge>
      </div>

      <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
        {/* All Sections View Button */}
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

        {/* Section List with Full Section Movement Controls */}
        {sections.map((sec, idx) => {
          const Icon = getSectionIcon(sec);
          const isSelected = activeSection === sec;
          const isFirst = idx === 0;
          const isLast = idx === sections.length - 1;
          const count = sectionCounts[sec] || 0;

          return (
            <div
              key={sec}
              className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs transition-colors group ${
                isSelected
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/60'
              }`}
            >
              {/* Click to filter section */}
              <button
                type="button"
                onClick={() => onSelectSection(sec)}
                className="flex items-center gap-2 truncate flex-1 text-left py-1 cursor-pointer min-w-0"
                title={`Filter to section: ${sec} (${count} blocks)`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="truncate flex-1">{sec}</span>
                {count > 0 && (
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono shrink-0 pr-1">
                    ({count})
                  </span>
                )}
              </button>

              {/* Move Whole Section Controls */}
              {onMoveSection && (
                <div className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity ml-1 shrink-0">
                  {/* Move Up */}
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveSection(sec, 'up');
                    }}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 hover:text-blue-600 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
                    title={isFirst ? 'Section is already at the top' : `Move whole section "${sec}" UP`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  {/* Move Down */}
                  <button
                    type="button"
                    disabled={isLast}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveSection(sec, 'down');
                    }}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 hover:text-blue-600 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
                    title={isLast ? 'Section is already at the bottom' : `Move whole section "${sec}" DOWN`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {/* More Move Section Options Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-700 transition-colors"
                        title="More section reorder options"
                      >
                        <MoreVertical className="w-3 h-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 p-1 text-xs">
                      <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Move Whole Section ({count} blocks)
                      </div>
                      <DropdownMenuItem
                        disabled={isFirst}
                        onClick={() => onMoveSection(sec, 'up')}
                        className="gap-2 cursor-pointer py-1.5"
                      >
                        <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                        <span>Move Section Up (1 Step)</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={isLast}
                        onClick={() => onMoveSection(sec, 'down')}
                        className="gap-2 cursor-pointer py-1.5"
                      >
                        <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                        <span>Move Section Down (1 Step)</span>
                      </DropdownMenuItem>

                      {onReorderSection && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={isFirst}
                            onClick={() => onReorderSection(sec, 0)}
                            className="gap-2 cursor-pointer py-1.5"
                          >
                            <ChevronsUp className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Move to Top of Document</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={isLast}
                            onClick={() => onReorderSection(sec, sections.length - 1)}
                            className="gap-2 cursor-pointer py-1.5"
                          >
                            <ChevronsDown className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Move to Bottom of Document</span>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {isSelected && <ChevronRight className="w-3.5 h-3.5 shrink-0 ml-1 text-blue-600" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const DocumentOutline = React.memo(DocumentOutlineComponent);