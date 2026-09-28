import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';
import {
  FileText,
  Send,
  CheckCircle2,
  Download,
  Printer,
  ChevronDown,
  ShieldCheck,
  BookOpen,
  Clock,
  Lock,
  Sliders
} from 'lucide-react';
import type {
  SecFilingDocument
} from '../../types/secFiling';
import { useSecFiling } from '../../hooks/useSecFiling';
import { exportSecFilingToDocx, downloadBlob, printSecFiling } from '../../utils/secFilingExport';
import { BlockBuilder } from './components/BlockBuilder';
import { BlockInspector } from './components/BlockInspector';
import { DocumentOutline } from './components/DocumentOutline';
import { SubmitProposalModal } from './components/SubmitProposalModal';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function SecFilingContributorPage() {
  const location = useLocation();
  const { setTheme } = useTheme();

  // Parse invite query parameters
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const nameFromUrl = queryParams.get('name') || 'Financial Contributor';
  const roleFromUrl = queryParams.get('role') || 'External Contributor';
  const sectionFromUrl = queryParams.get('section') || 'ALL';
  const titleFromUrl = queryParams.get('title') || 'Assigned Section Update Draft';
  const descFromUrl =
    queryParams.get('desc') ||
    'Please review and update this section. All edits are saved automatically in your private branch.';

  // Force Normal Light Mode: SEC filing contributor share link is always a clean, bright, professional paper sheet experience
  useEffect(() => {
    // 1. Force next-themes to light
    setTheme('light');

    // 2. Remove 'dark' class from <html> and <body>, add 'light'
    const root = document.documentElement;
    const body = document.body;
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';
    if (body) {
      body.classList.remove('dark');
      body.classList.add('light');
      body.style.colorScheme = 'light';
    }

    // 3. Guard against any theme watcher or react-re-render re-injecting 'dark'
    const observer = new MutationObserver(() => {
      if (root.classList.contains('dark')) {
        root.classList.remove('dark');
        root.classList.add('light');
      }
      if (body && body.classList.contains('dark')) {
        body.classList.remove('dark');
        body.classList.add('light');
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
    };
  }, [setTheme]);

  const {
    mainDoc,
    activeProposal,
    workingBlocks,
    filteredBlocks,
    documentSections,
    selectedBlockId,
    selectedBlockIds,
    activeDiffs,
    sectionFilter,
    setSelectedBlockId,
    toggleBlockSelection,
    selectAllBlocks,
    clearBlockSelection,
    setSectionFilter,
    addBlock,
    updateBlock,
    moveBlock,
    moveMultipleBlocks,
    duplicateBlock,
    duplicateMultipleBlocks,
    deleteBlock,
    deleteMultipleBlocks,
    moveMultipleBlocksToSection,
    updateMultipleBlocksSpacing,
    moveSection,
    reorderSection,
    createSection,
    handleSubmitForReview
  } = useSecFiling();

  const [showOutline, setShowOutline] = useState<boolean>(true);
  const [showInspector, setShowInspector] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'word' | 'blocks'>('word');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [isExportingDocx, setIsExportingDocx] = useState<boolean>(false);

  // Selected block for inspector
  const selectedBlock = workingBlocks.find((b) => b.id === selectedBlockId) || null;
  const isSubmitted = activeProposal?.status === 'pending_review' || activeProposal?.status === 'merged';

  // Contributor initials
  const initials = useMemo(() => {
    return (
      nameFromUrl
        .split(' ')
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'FC'
    );
  }, [nameFromUrl]);

  // Export handlers
  const handleExportDocx = async () => {
    try {
      setIsExportingDocx(true);
      toast.info('Generating formatted Word Document (.docx)...');
      const docToExport: SecFilingDocument = {
        ...mainDoc,
        blocks: workingBlocks,
        version: `${mainDoc.version} (Contributor Draft: ${activeProposal?.title || titleFromUrl})`
      };
      const blob = await exportSecFilingToDocx(docToExport);
      const filename = `ZenaTech_SEC_Filing_Draft_${nameFromUrl.replace(/\s+/g, '_')}.docx`;
      downloadBlob(blob, filename);
      toast.success(`Downloaded ${filename}`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to export to Word Document');
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleExportPdf = () => {
    const docToExport: SecFilingDocument = {
      ...mainDoc,
      blocks: workingBlocks,
      version: `${mainDoc.version} (Contributor Draft: ${activeProposal?.title || titleFromUrl})`
    };
    printSecFiling(docToExport);
  };

  const modifiedCount = activeDiffs.filter((d) => d.status !== 'unchanged').length;

  return (
    <div className="light min-h-screen bg-[#F1F5F9] flex flex-col text-slate-900 font-sans selection:bg-blue-500/20" style={{ colorScheme: 'light' }}>
      {/* ========================================================================= */}
      {/* 1. STANDALONE APPLICATION HEADER (Clean, Professional Light Mode) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 lg:px-8 py-2.5 shadow-xs">
        <div className="max-w-[1850px] w-full mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Left Brand & Document Identity */}
          <div className="flex items-center gap-3.5">
            {/* Custom EDGAR Studio Brand Badge */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold tracking-tight text-slate-900">
                    EDGAR Studio
                  </span>
                  <Badge className="bg-blue-50 text-blue-700 text-[9px] font-bold border border-blue-200 px-1.5 py-0 uppercase tracking-wider">
                    Contributor Edition
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">{mainDoc.title || 'ZenaTech, Inc.'}</span>
                  <span>•</span>
                  <span>Form {mainDoc.formType} ({mainDoc.period})</span>
                  <span>•</span>
                  <span className="font-mono text-[10px] text-slate-400">{mainDoc.symbol}</span>
                </div>
              </div>
            </div>

            <div className="h-6 w-[1px] bg-slate-200 hidden sm:block mx-1" />

            {/* Contributor Persona Pill */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full py-1 px-3 shadow-2xs">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shadow-xs">
                {initials}
              </div>
              <div className="text-[11px] leading-tight pr-1">
                <span className="font-semibold text-slate-800">{nameFromUrl}</span>
                <span className="text-slate-500 text-[10px] block">{roleFromUrl}</span>
              </div>
            </div>
          </div>

          {/* Right Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Outline Toggle */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowOutline(!showOutline)}
              className={`h-8 text-xs gap-1.5 font-medium transition-all ${
                showOutline
                  ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Headings</span>
            </Button>

            {/* Inspector Toggle */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowInspector(!showInspector)}
              className={`h-8 text-xs gap-1.5 font-medium transition-all ${
                showInspector
                  ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Formatting</span>
            </Button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('word')}
                className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all ${
                  viewMode === 'word'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Word Sheet
              </button>
              <button
                type="button"
                onClick={() => setViewMode('blocks')}
                className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all ${
                  viewMode === 'blocks'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Blocks Flow
              </button>
            </div>

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-medium text-slate-700">
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden md:inline">Export</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1 text-xs">
                <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-500">Export Contributor Draft</div>
                <DropdownMenuItem onClick={handleExportDocx} disabled={isExportingDocx} className="gap-2 cursor-pointer py-2">
                  <Download className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="font-semibold text-slate-800">Word Document (.docx)</div>
                    <div className="text-[10px] text-slate-400">Formatted EDGAR filing structure</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPdf} className="gap-2 cursor-pointer py-2">
                  <Printer className="w-4 h-4 text-slate-600" />
                  <div>
                    <div className="font-semibold text-slate-800">Printable / PDF Preview</div>
                    <div className="text-[10px] text-slate-400">Official filing print preview</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Primary Action Button: Submit Changes for Review */}
            {!isSubmitted ? (
              <Button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="h-8 px-3.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Send className="w-3.5 h-3.5 text-white" />
                <span>Submit for Review</span>
              </Button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Badge className="bg-emerald-600 text-white font-semibold text-xs py-1 px-2.5 gap-1.5 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Draft Submitted</span>
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="h-8 text-[11px] text-slate-600 hover:text-slate-900 border-slate-300"
                >
                  Edit Notes
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. DEDICATED MISSION & INSTRUCTIONS TASK RIBBON (Clean Light Notification) */}
      {/* ========================================================================= */}
      <div className="bg-white border-b border-slate-200 px-4 lg:px-8 py-3 shadow-2xs relative">
        <div className="max-w-[1850px] w-full mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm tracking-tight text-slate-900 flex items-center gap-1.5">
                  <span>Task: {activeProposal?.title || titleFromUrl}</span>
                </span>
                {sectionFromUrl && sectionFromUrl !== 'ALL' && (
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-semibold">
                    Assigned Section: {sectionFromUrl}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] uppercase font-mono border-slate-200 text-slate-600 bg-slate-50">
                  {activeProposal?.status.replace('_', ' ') || 'DRAFT'}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 max-w-4xl leading-relaxed">
                {descFromUrl}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Isolated Contributor Draft (Main Filing Safe)</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-medium">Auto-saved in real-time</span>
                </span>
                <span>•</span>
                <span>{modifiedCount} proposed block modification(s)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
            {!isSubmitted ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setIsSubmitModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8 px-3.5 gap-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Final Review</span>
              </Button>
            ) : (
              <div className="text-right text-xs text-emerald-700 font-medium bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                ✓ Awaiting Lead Controller Approval
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CENTER DOCUMENT WORKSPACE (Standard High-End Sheet Canvas) */}
      {/* ========================================================================= */}
      <main className="flex-1 w-full max-w-[1850px] mx-auto px-2 sm:px-4 md:px-6 py-5 flex gap-4 lg:gap-6 items-start justify-center">
        {/* Left Column: Headings Outline Navigation */}
        {showOutline && (
          <aside className="w-64 shrink-0 sticky top-20 space-y-4 animate-in slide-in-from-left duration-200">
            <DocumentOutline
              sections={documentSections}
              activeSection={sectionFilter}
              onSelectSection={setSectionFilter}
              totalBlocks={workingBlocks.length}
              blocks={workingBlocks}
              onMoveSection={moveSection}
              onReorderSection={reorderSection}
              onCreateSection={createSection}
            />

            {/* Quick Contributor Scope Box */}
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs space-y-2">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>Assigned Scope</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="text-[11px] text-slate-600">
                You are assigned to:{' '}
                <strong className="text-blue-700">
                  {sectionFromUrl === 'ALL' ? 'Entire Document' : sectionFromUrl}
                </strong>
              </div>
              {sectionFilter !== sectionFromUrl && sectionFromUrl !== 'ALL' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSectionFilter(sectionFromUrl)}
                  className="w-full h-7 text-[10px] text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  Return to Assigned Section
                </Button>
              )}
            </div>
          </aside>
        )}

        {/* Center Column: The Prominent Word Document Sheet */}
        <div className="flex-1 w-full min-w-0">
          <BlockBuilder
            blocks={workingBlocks}
            filteredBlocks={filteredBlocks}
            selectedBlockId={selectedBlockId}
            selectedBlockIds={selectedBlockIds}
            onSelectBlock={(id) => setSelectedBlockId(id)}
            onToggleBlockSelection={toggleBlockSelection}
            onSelectAllBlocks={selectAllBlocks}
            onClearSelection={clearBlockSelection}
            onAddBlock={(index, type) =>
              addBlock(index, type, sectionFilter !== 'ALL' ? sectionFilter : undefined)
            }
            onUpdateBlock={updateBlock}
            onMoveBlock={moveBlock}
            onMoveMultipleBlocks={moveMultipleBlocks}
            onDuplicateBlock={duplicateBlock}
            onDuplicateMultipleBlocks={duplicateMultipleBlocks}
            onDeleteBlock={deleteBlock}
            onDeleteMultipleBlocks={deleteMultipleBlocks}
            onMoveMultipleBlocksToSection={moveMultipleBlocksToSection}
            onUpdateMultipleBlocksSpacing={updateMultipleBlocksSpacing}
            documentSections={documentSections}
            diffs={activeDiffs}
            viewMode={viewMode}
            onToggleViewMode={setViewMode}
          />
        </div>

        {/* Right Column: Format & Block Inspector */}
        {showInspector && (
          <aside className="w-72 shrink-0 sticky top-20 space-y-4 animate-in slide-in-from-right duration-200">
            <BlockInspector
              block={selectedBlock}
              onUpdate={(updates) => selectedBlockId && updateBlock(selectedBlockId, updates)}
              onClose={() => setShowInspector(false)}
              sections={documentSections}
            />
          </aside>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 4. MODALS & SUBMISSION CONTROLS */}
      {/* ========================================================================= */}
      <SubmitProposalModal
        open={isSubmitModalOpen}
        onOpenChange={setIsSubmitModalOpen}
        proposal={activeProposal}
        diffs={activeDiffs}
        onSubmit={handleSubmitForReview}
      />

      {/* Standalone Application Footer */}
      <footer className="mt-auto py-3 px-6 border-t border-slate-200 bg-white text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">ZenaTech EDGAR Studio™</span>
          <span>•</span>
          <span>SEC Filing Contributor Edition</span>
          <span>•</span>
          <span>Confidential Draft Workspace</span>
        </div>
        <div>
          Editing as: <strong className="text-slate-700">{nameFromUrl}</strong> ({roleFromUrl})
        </div>
      </footer>
    </div>
  );
}
