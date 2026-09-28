import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type {
  SecFilingDocument,
  SecChangeProposal,
  SecVersionSnapshot,
  SecBlock,
  SecBlockType,
  SecBlockDiff,
  SecBlockSpacing,
  SecHeadingBlock,
  SecParagraphBlock
} from '../types/secFiling';
import { secFilingService } from '../services/secFilingService';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'sonner';
import { ZENATECH_LOGO_DATA_URL } from '../data/zenatechLogoAsset';

export type UserFilingRole = 'LEAD_CONTROLLER' | 'CONTRIBUTOR';

export function useSecFiling() {
  const { user } = useAuth();

  // --------------------------------------------------------------------------
  // 1. ALL STATE & REFS (Strictly ordered at the top)
  // --------------------------------------------------------------------------
  const [activeRole, setActiveRole] = useState<UserFilingRole>('LEAD_CONTROLLER');
  const [mainDoc, setMainDoc] = useState<SecFilingDocument>(() => secFilingService.getMainDocument());
  const [proposals, setProposals] = useState<SecChangeProposal[]>(() => secFilingService.getProposals());
  const [versionHistory, setVersionHistory] = useState<SecVersionSnapshot[]>(() =>
    secFilingService.getVersionHistory()
  );
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
  const [sectionFilter, setSectionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [contributorSession, setContributorSession] = useState<{
    isContributor: boolean;
    name?: string;
    role?: string;
    assignedSection?: string;
  }>({ isContributor: false });

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);

  const [undoStack, setUndoStack] = useState<SecBlock[][]>([]);
  const [redoStack, setRedoStack] = useState<SecBlock[][]>([]);
  const isUndoRedoActionRef = useRef<boolean>(false);

  // --------------------------------------------------------------------------
  // 2. CORE MEMOS (Derived working document & structure)
  // --------------------------------------------------------------------------
  const activeProposal = useMemo(() => {
    return proposals.find((p) => p.id === activeProposalId) || null;
  }, [proposals, activeProposalId]);

  const workingBlocks = useMemo(() => {
    if (activeProposal) {
      return activeProposal.blocks;
    }
    return mainDoc.blocks;
  }, [activeProposal, mainDoc.blocks]);

  const documentSections = useMemo(() => {
    const list: string[] = [];
    workingBlocks.forEach((b) => {
      if (b.section && !list.includes(b.section)) {
        list.push(b.section);
      }
    });
    return list;
  }, [workingBlocks]);

  const filteredBlocks = useMemo(() => {
    return workingBlocks.filter((b) => {
      if (sectionFilter !== 'ALL' && b.section !== sectionFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (b.type === 'heading' && b.text.toLowerCase().includes(q)) return true;
        if (b.type === 'paragraph' && b.text.toLowerCase().includes(q)) return true;
        if (b.type === 'callout' && (b.content.toLowerCase().includes(q) || b.title?.toLowerCase().includes(q)))
          return true;
        if (b.type === 'financial_table') {
          if (b.title?.toLowerCase().includes(q)) return true;
          if (b.headers.some((h) => h.toLowerCase().includes(q))) return true;
          if (b.rows.some((r) => r.cells.some((c) => c.toLowerCase().includes(q)))) return true;
        }
        return false;
      }
      return true;
    });
  }, [workingBlocks, sectionFilter, searchQuery]);

  // --------------------------------------------------------------------------
  // 3. ALL CALLBACKS
  // --------------------------------------------------------------------------
  const refreshAll = useCallback(() => {
    setMainDoc(secFilingService.getMainDocument());
    setProposals(secFilingService.getProposals());
    setVersionHistory(secFilingService.getVersionHistory());
  }, []);

  const toggleBlockSelection = useCallback((id: string, multiSelect = false) => {
    setSelectedBlockIds((prev) => {
      if (!multiSelect) {
        if (prev.length === 1 && prev[0] === id) {
          setSelectedBlockId(null);
          return [];
        }
        setSelectedBlockId(id);
        return [id];
      }
      const exists = prev.includes(id);
      const next = exists ? prev.filter((item) => item !== id) : [...prev, id];
      setSelectedBlockId(next.length > 0 ? next[next.length - 1] : null);
      return next;
    });
  }, []);

  const selectAllBlocks = useCallback(() => {
    const allIds = workingBlocks.map((b) => b.id);
    setSelectedBlockIds(allIds);
    if (allIds.length > 0) setSelectedBlockId(allIds[0]);
    toast.info(`Selected all ${allIds.length} blocks`);
  }, [workingBlocks]);

  const clearBlockSelection = useCallback(() => {
    setSelectedBlockIds([]);
    setSelectedBlockId(null);
  }, []);

  const calculateDiffForProposal = useCallback(
    (proposal: SecChangeProposal): SecBlockDiff[] => {
      // Find the base version snapshot if present in history
      const versionHistory = secFilingService.getVersionHistory();
      const baseSnap = versionHistory.find((v) => v.versionNumber === proposal.baseVersionNumber);
      return secFilingService.calculateDiffs(mainDoc.blocks, proposal.blocks, baseSnap?.blocks);
    },
    [mainDoc.blocks]
  );

  const applyWorkingBlocks = useCallback(
    (newBlocks: SecBlock[]) => {
      if (activeProposal) {
        const updatedProposal: SecChangeProposal = {
          ...activeProposal,
          blocks: newBlocks,
          updatedAt: new Date().toISOString()
        };
        const diffs = secFilingService.calculateDiffs(mainDoc.blocks, newBlocks);
        updatedProposal.changeSummary = {
          ...updatedProposal.changeSummary,
          addedCount: diffs.filter((d) => d.status === 'added').length,
          modifiedCount: diffs.filter((d) => d.status === 'modified').length,
          deletedCount: diffs.filter((d) => d.status === 'deleted').length
        };

        secFilingService.updateProposal(updatedProposal);
        setProposals((prev) => prev.map((p) => (p.id === updatedProposal.id ? updatedProposal : p)));
      } else {
        const updatedMain: SecFilingDocument = {
          ...mainDoc,
          blocks: newBlocks,
          updatedAt: new Date().toISOString(),
          lastModifiedBy: user?.full_name || 'Controller'
        };
        secFilingService.saveMainDocument(updatedMain);
        setMainDoc(updatedMain);
      }
    },
    [activeProposal, mainDoc, user]
  );

  const setWorkingBlocks = useCallback(
    (newBlocks: SecBlock[]) => {
      if (!isUndoRedoActionRef.current) {
        const currentStr = JSON.stringify(workingBlocks);
        const newStr = JSON.stringify(newBlocks);
        if (currentStr !== newStr) {
          const snapshot = JSON.parse(currentStr);
          setUndoStack((prev) => {
            const next = [...prev, snapshot];
            if (next.length > 60) return next.slice(next.length - 60);
            return next;
          });
          setRedoStack([]);
        }
      }
      applyWorkingBlocks(newBlocks);
    },
    [workingBlocks, applyWorkingBlocks]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) {
      toast.info('Nothing to undo');
      return;
    }

    const previousSnapshot = undoStack[undoStack.length - 1];
    const currentSnapshot = JSON.parse(JSON.stringify(workingBlocks));

    isUndoRedoActionRef.current = true;
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [...prev, currentSnapshot]);
    applyWorkingBlocks(previousSnapshot);
    isUndoRedoActionRef.current = false;

    toast.info('Undid last change (Ctrl+Z / ⌘Z)');
  }, [undoStack, workingBlocks, applyWorkingBlocks]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) {
      toast.info('Nothing to redo');
      return;
    }

    const nextSnapshot = redoStack[redoStack.length - 1];
    const currentSnapshot = JSON.parse(JSON.stringify(workingBlocks));

    isUndoRedoActionRef.current = true;
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setUndoStack((prev) => [...prev, currentSnapshot]);
    applyWorkingBlocks(nextSnapshot);
    isUndoRedoActionRef.current = false;

    toast.info('Redid change (Ctrl+Y / ⌘⇧Z)');
  }, [redoStack, workingBlocks, applyWorkingBlocks]);

  const addBlock = useCallback(
    (index: number, type: SecBlockType, defaultSection?: string) => {
      let section = defaultSection && defaultSection !== 'ALL' ? defaultSection : '';
      if (!section && type === 'heading') {
        let sName = 'New Section';
        let c = 1;
        const existingSections = new Set(workingBlocks.map((b) => b.section).filter(Boolean));
        while (existingSections.has(sName)) {
          c++;
          sName = `New Section ${c}`;
        }
        section = sName;
      } else if (!section) {
        section = workingBlocks[index]?.section || 'General Disclosures';
      }

      const blockId = `block-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      let newBlock: SecBlock;

      switch (type) {
        case 'heading': {
          const isNewNamedSection = !defaultSection || defaultSection === 'ALL';
          const headingText = isNewNamedSection ? section : 'New Section Heading';
          newBlock = {
            id: blockId,
            type: 'heading',
            section,
            level: 2,
            text: headingText,
            alignment: 'left',
            bold: true,
            spacingTop: 12,
            spacing: 'normal'
          };
          break;
        }
        case 'paragraph':
          newBlock = {
            id: blockId,
            type: 'paragraph',
            section,
            text: 'Enter paragraph disclosure text here...',
            alignment: 'left',
            spacingTop: 6,
            spacing: 'normal'
          };
          break;
        case 'financial_table':
          newBlock = {
            id: blockId,
            type: 'financial_table',
            section,
            title: 'Schedule of Financial Details',
            headers: ['Description / Line Item', 'Note Ref', 'Q2 2026 ($)', 'Q2 2025 ($)'],
            periodHeaders: [
              { columnIndex: 2, lines: ['As of', 'June 30,', '2026'] },
              { columnIndex: 3, lines: ['As of', 'December 31,', '2025'] }
            ],
            columnAlignments: ['left', 'center', 'right', 'right'],
            columnWidths: ['50%', '10%', '20%', '20%'],
            rows: [
              { id: `r-${Date.now()}-1`, type: 'data', cells: ['Item Revenue or Asset', '', '1,250,000', '980,000'] },
              { id: `r-${Date.now()}-2`, type: 'data', cells: ['Direct Operating Cost', '', '(450,000)', '(320,000)'] },
              { id: `r-${Date.now()}-3`, type: 'total', cells: ['Total Net Amount', '', '800,000', '660,000'], bold: true, underline: true, doubleUnderline: true }
            ],
            spacingTop: 12,
            spacing: 'normal'
          };
          break;
        case 'callout':
          newBlock = {
            id: blockId,
            type: 'callout',
            section,
            variant: 'notice',
            title: 'Regulatory Compliance Note',
            content: 'This section contains unaudited forward-looking statements subject to safe harbor provisions.',
            spacingTop: 10,
            spacing: 'normal'
          };
          break;
        case 'signature':
          newBlock = {
            id: blockId,
            type: 'signature',
            section,
            title: 'Authorized Corporate Signatures',
            officers: [
              {
                id: `off-${Date.now()}-1`,
                name: user?.full_name || 'Authorized Officer',
                title: 'Principal Financial Officer',
                date: new Date().toISOString().split('T')[0],
                signatureText: `/s/ ${user?.full_name || 'Authorized Officer'}`,
                signed: true
              }
            ],
            spacingTop: 16,
            spacing: 'normal'
          };
          break;
        case 'divider':
          newBlock = {
            id: blockId,
            type: 'divider',
            section,
            pageBreak: true,
            label: 'New Section Break',
            spacingTop: 16,
            spacing: 'normal'
          };
          break;
        case 'metadata':
          newBlock = {
            id: blockId,
            type: 'metadata',
            section,
            companyName: 'ZenaTech, Inc.',
            symbol: 'ZENA',
            cik: '0001987654',
            formType: 'Form 6-K',
            periodEnded: 'June 30, 2026',
            currency: 'CAD ($)',
            fiscalYear: '2026',
            filingDate: new Date().toISOString().split('T')[0],
            documentTitle: 'Interim Financial Report',
            jurisdiction: 'SEC EDGAR',
            spacingTop: 12,
            spacing: 'normal'
          };
          break;
        case 'image':
          newBlock = {
            id: blockId,
            type: 'image',
            section,
            url: ZENATECH_LOGO_DATA_URL,
            alt: 'ZenaTech Logo',
            caption: '',
            alignment: 'center',
            width: 260,
            spacingTop: 10,
            spacing: 'normal'
          };
          break;
        default:
          newBlock = {
            id: blockId,
            type: 'paragraph',
            section,
            text: '',
            alignment: 'left',
            spacingTop: 6,
            spacing: 'normal'
          };
      }

      const nextBlocks = [...workingBlocks];
      const targetIdx = index >= 0 && index <= nextBlocks.length ? index : nextBlocks.length;
      nextBlocks.splice(targetIdx, 0, newBlock);
      setWorkingBlocks(nextBlocks);
      setSelectedBlockId(newBlock.id);
      toast.success(`Added new ${type.replace('_', ' ')} block`);
    },
    [workingBlocks, setWorkingBlocks, user]
  );

  const updateBlock = useCallback(
    (id: string, updates: Partial<SecBlock>) => {
      const currentBlock = workingBlocks.find((b) => b.id === id);
      if (!currentBlock) return;

      const oldSection = currentBlock.section;
      let newSection: string | undefined;

      if (typeof updates.section === 'string' && updates.section.trim() !== '') {
        const trimmedSec = updates.section.trim();
        if (trimmedSec !== oldSection) {
          newSection = trimmedSec;
        }
      }

      const headingTextUpdate = (updates as any).text;
      if (currentBlock.type === 'heading' && typeof headingTextUpdate === 'string') {
        const trimmedText = headingTextUpdate.trim();
        const isFirstInSection =
          workingBlocks.findIndex((b) => b.section === oldSection) ===
          workingBlocks.findIndex((b) => b.id === id);
        const matchesOldSection =
          currentBlock.text.trim().toLowerCase() === oldSection.trim().toLowerCase();
        const isGenericSection =
          oldSection === 'General Disclosures' || oldSection.startsWith('New Section');

        if (trimmedText && (matchesOldSection || isFirstInSection || isGenericSection)) {
          newSection = trimmedText;
          updates.section = trimmedText;
        }
      }

      const nextBlocks = workingBlocks.map((b) => {
        if (b.id === id) {
          const updated = {
            ...b,
            ...updates,
            updatedAt: new Date().toISOString(),
            modifiedBy: user?.full_name || 'User'
          } as SecBlock;

          if (newSection) {
            updated.section = newSection;
          }
          return updated;
        }

        if (newSection && b.section === oldSection) {
          const updatedSibling: SecBlock = {
            ...b,
            section: newSection,
            updatedAt: new Date().toISOString()
          };
          if (
            updatedSibling.type === 'heading' &&
            updatedSibling.text.trim() === oldSection.trim()
          ) {
            (updatedSibling as SecHeadingBlock).text = newSection;
          }
          return updatedSibling;
        }

        return b;
      });

      setWorkingBlocks(nextBlocks);

      if (newSection && sectionFilter === oldSection) {
        setSectionFilter(newSection);
      }
    },
    [workingBlocks, setWorkingBlocks, user, sectionFilter, setSectionFilter]
  );

  const moveBlock = useCallback(
    (id: string, direction: 'up' | 'down') => {
      const idx = workingBlocks.findIndex((b) => b.id === id);
      if (idx === -1) return;
      if (direction === 'up' && idx === 0) return;
      if (direction === 'down' && idx === workingBlocks.length - 1) return;

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      const nextBlocks = [...workingBlocks];
      const [moved] = nextBlocks.splice(idx, 1);
      nextBlocks.splice(targetIdx, 0, moved);
      setWorkingBlocks(nextBlocks);
    },
    [workingBlocks, setWorkingBlocks]
  );

  const moveMultipleBlocks = useCallback(
    (ids: string[], direction: 'up' | 'down') => {
      if (!ids || ids.length === 0) return;
      const selectedSet = new Set(ids);
      const indices = workingBlocks
        .map((b, i) => (selectedSet.has(b.id) ? i : -1))
        .filter((i) => i !== -1);

      if (indices.length === 0) return;
      if (direction === 'up' && indices[0] === 0) return;
      if (direction === 'down' && indices[indices.length - 1] === workingBlocks.length - 1) return;

      const nextBlocks = [...workingBlocks];
      if (direction === 'up') {
        for (let i = 1; i < nextBlocks.length; i++) {
          if (selectedSet.has(nextBlocks[i].id) && !selectedSet.has(nextBlocks[i - 1].id)) {
            const temp = nextBlocks[i];
            nextBlocks[i] = nextBlocks[i - 1];
            nextBlocks[i - 1] = temp;
          }
        }
      } else {
        for (let i = nextBlocks.length - 2; i >= 0; i--) {
          if (selectedSet.has(nextBlocks[i].id) && !selectedSet.has(nextBlocks[i + 1].id)) {
            const temp = nextBlocks[i];
            nextBlocks[i] = nextBlocks[i + 1];
            nextBlocks[i + 1] = temp;
          }
        }
      }

      setWorkingBlocks(nextBlocks);
    },
    [workingBlocks, setWorkingBlocks]
  );

  const duplicateMultipleBlocks = useCallback(
    (ids: string[]) => {
      if (!ids || ids.length === 0) return;
      const selectedSet = new Set(ids);
      const blocksToClone = workingBlocks.filter((b) => selectedSet.has(b.id));
      if (blocksToClone.length === 0) return;

      const lastIdx = workingBlocks.reduce(
        (max, b, i) => (selectedSet.has(b.id) ? Math.max(max, i) : max),
        0
      );

      const clonedList: SecBlock[] = blocksToClone.map((block) => ({
        ...JSON.parse(JSON.stringify(block)),
        id: `block-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        updatedAt: new Date().toISOString()
      }));

      const nextBlocks = [...workingBlocks];
      nextBlocks.splice(lastIdx + 1, 0, ...clonedList);
      setWorkingBlocks(nextBlocks);
      setSelectedBlockIds(clonedList.map((c) => c.id));
      setSelectedBlockId(clonedList[0].id);
      toast.success(`Duplicated ${clonedList.length} blocks`);
    },
    [workingBlocks, setWorkingBlocks]
  );

  const deleteMultipleBlocks = useCallback(
    (ids: string[]) => {
      if (!ids || ids.length === 0) return;
      if (workingBlocks.length <= ids.length) {
        toast.error('Cannot delete all blocks in the document');
        return;
      }
      const selectedSet = new Set(ids);
      const nextBlocks = workingBlocks.filter((b) => !selectedSet.has(b.id));
      setWorkingBlocks(nextBlocks);
      setSelectedBlockIds([]);
      setSelectedBlockId(null);
      toast.success(`Deleted ${ids.length} blocks`);
    },
    [workingBlocks, setWorkingBlocks]
  );

  const moveMultipleBlocksToSection = useCallback(
    (ids: string[], targetSection: string) => {
      if (!ids || ids.length === 0) return;
      const selectedSet = new Set(ids);
      const nextBlocks = workingBlocks.map((b) => {
        if (selectedSet.has(b.id)) {
          return { ...b, section: targetSection, updatedAt: new Date().toISOString() };
        }
        return b;
      });
      setWorkingBlocks(nextBlocks);
      toast.success(`Moved ${ids.length} blocks to "${targetSection}"`);
    },
    [workingBlocks, setWorkingBlocks]
  );

  const updateMultipleBlocksSpacing = useCallback(
    (ids: string[], spacing: SecBlockSpacing) => {
      if (!ids || ids.length === 0) return;
      const selectedSet = new Set(ids);
      const nextBlocks = workingBlocks.map((b) => {
        if (selectedSet.has(b.id)) {
          return { ...b, spacing, updatedAt: new Date().toISOString() };
        }
        return b;
      });
      setWorkingBlocks(nextBlocks);
      toast.success(`Updated spacing to "${spacing}" for ${ids.length} blocks`);
    },
    [workingBlocks, setWorkingBlocks]
  );

  const moveSection = useCallback(
    (sectionName: string, direction: 'up' | 'down') => {
      if (!sectionName) return;

      const currentSections: string[] = [];
      workingBlocks.forEach((b) => {
        if (b.section && !currentSections.includes(b.section)) {
          currentSections.push(b.section);
        }
      });

      const currentIdx = currentSections.indexOf(sectionName);
      if (currentIdx === -1) return;
      if (direction === 'up' && currentIdx === 0) return;
      if (direction === 'down' && currentIdx === currentSections.length - 1) return;

      const targetSecIndex = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
      const targetSection = currentSections[targetSecIndex];

      const sectionBlocks = workingBlocks.filter((b) => b.section === sectionName);
      const otherBlocks = workingBlocks.filter((b) => b.section !== sectionName);

      if (direction === 'up') {
        const insertIdx = otherBlocks.findIndex((b) => b.section === targetSection);
        const nextBlocks = [...otherBlocks];
        nextBlocks.splice(insertIdx !== -1 ? insertIdx : 0, 0, ...sectionBlocks);
        setWorkingBlocks(nextBlocks);
        toast.success(`Moved section "${sectionName}" before "${targetSection}"`);
      } else {
        let lastIdx = -1;
        for (let i = otherBlocks.length - 1; i >= 0; i--) {
          if (otherBlocks[i].section === targetSection) {
            lastIdx = i;
            break;
          }
        }
        const nextBlocks = [...otherBlocks];
        nextBlocks.splice(lastIdx !== -1 ? lastIdx + 1 : otherBlocks.length, 0, ...sectionBlocks);
        setWorkingBlocks(nextBlocks);
        toast.success(`Moved section "${sectionName}" after "${targetSection}"`);
      }
    },
    [workingBlocks, setWorkingBlocks]
  );

  const reorderSection = useCallback(
    (sectionName: string, targetSecIndex: number) => {
      if (!sectionName) return;

      const currentSections: string[] = [];
      workingBlocks.forEach((b) => {
        if (b.section && !currentSections.includes(b.section)) {
          currentSections.push(b.section);
        }
      });

      const currentIdx = currentSections.indexOf(sectionName);
      if (currentIdx === -1 || targetSecIndex < 0 || targetSecIndex >= currentSections.length || currentIdx === targetSecIndex) {
        return;
      }

      const sectionBlocks = workingBlocks.filter((b) => b.section === sectionName);
      const otherBlocks = workingBlocks.filter((b) => b.section !== sectionName);

      const targetSection = currentSections[targetSecIndex];
      const nextBlocks = [...otherBlocks];

      if (targetSecIndex < currentIdx) {
        const insertIdx = otherBlocks.findIndex((b) => b.section === targetSection);
        nextBlocks.splice(insertIdx !== -1 ? insertIdx : 0, 0, ...sectionBlocks);
      } else {
        let lastIdx = -1;
        for (let i = otherBlocks.length - 1; i >= 0; i--) {
          if (otherBlocks[i].section === targetSection) {
            lastIdx = i;
            break;
          }
        }
        nextBlocks.splice(lastIdx !== -1 ? lastIdx + 1 : otherBlocks.length, 0, ...sectionBlocks);
      }

      setWorkingBlocks(nextBlocks);
      toast.success(`Moved section "${sectionName}"`);
    },
    [workingBlocks, setWorkingBlocks]
  );

  const createSection = useCallback(
    (name = 'New Section') => {
      let sectionName = name;
      let counter = 1;
      const existingSections = new Set(workingBlocks.map((b) => b.section).filter(Boolean));
      while (existingSections.has(sectionName)) {
        counter++;
        sectionName = `${name} ${counter}`;
      }

      const headingId = `block-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const paragraphId = `block-${Date.now() + 1}-${Math.random().toString(36).substring(2, 6)}`;

      const newHeading: SecHeadingBlock = {
        id: headingId,
        type: 'heading',
        section: sectionName,
        level: 2,
        text: sectionName,
        alignment: 'left',
        bold: true,
        spacingTop: 14,
        spacing: 'normal'
      };

      const newParagraph: SecParagraphBlock = {
        id: paragraphId,
        type: 'paragraph',
        section: sectionName,
        text: 'Enter paragraph disclosure text here...',
        alignment: 'left',
        spacingTop: 6,
        spacing: 'normal'
      };

      const nextBlocks = [...workingBlocks, newHeading, newParagraph];
      setWorkingBlocks(nextBlocks);
      setSelectedBlockId(headingId);
      setSectionFilter('ALL');
      toast.success(`Created section "${sectionName}". Type a name on the page to rename it.`);

      setTimeout(() => {
        const el = document.getElementById(headingId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const textarea = el.querySelector('textarea');
          if (textarea) {
            textarea.focus();
            textarea.select();
          }
        }
      }, 100);

      return sectionName;
    },
    [workingBlocks, setWorkingBlocks, setSelectedBlockId, setSectionFilter]
  );

  const duplicateBlock = useCallback(
    (id: string) => {
      const idx = workingBlocks.findIndex((b) => b.id === id);
      if (idx === -1) return;

      const blockToClone = workingBlocks[idx];
      const cloned: SecBlock = {
        ...JSON.parse(JSON.stringify(blockToClone)),
        id: `block-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        updatedAt: new Date().toISOString()
      };

      const nextBlocks = [...workingBlocks];
      nextBlocks.splice(idx + 1, 0, cloned);
      setWorkingBlocks(nextBlocks);
      setSelectedBlockId(cloned.id);
      setSelectedBlockIds([cloned.id]);
      toast.success('Block duplicated');
    },
    [workingBlocks, setWorkingBlocks]
  );

  const deleteBlock = useCallback(
    (id: string) => {
      if (workingBlocks.length <= 1) {
        toast.error('Cannot delete the only remaining block in the document');
        return;
      }
      const nextBlocks = workingBlocks.filter((b) => b.id !== id);
      setWorkingBlocks(nextBlocks);
      if (selectedBlockId === id) {
        setSelectedBlockId(null);
      }
      setSelectedBlockIds((prev) => prev.filter((item) => item !== id));
      toast.success('Block removed');
    },
    [workingBlocks, setWorkingBlocks, selectedBlockId]
  );

  const handleCreateProposal = useCallback(
    (title: string, description: string, assignedSection?: string) => {
      const author = {
        id: user?.id || 'usr-contrib',
        name: user?.full_name || 'Financial Contributor',
        email: user?.email || 'contributor@zenatech.com',
        role: activeRole === 'LEAD_CONTROLLER' ? 'Controller' : 'Financial Analyst'
      };
      const created = secFilingService.createProposal(title, author, description, mainDoc, assignedSection);
      setProposals(secFilingService.getProposals());
      setActiveProposalId(created.id);
      toast.success(`Created proposed change branch: "${title}"`);
      return created;
    },
    [user, activeRole, mainDoc]
  );

  const handleCreateContributorInvite = useCallback(
    (params: {
      title: string;
      contributorName: string;
      contributorRole: string;
      contributorEmail?: string;
      assignedSection?: string;
      description?: string;
    }) => {
      const result = secFilingService.createContributorInvite({
        ...params,
        baseDoc: mainDoc
      });
      setProposals(secFilingService.getProposals());
      return result;
    },
    [mainDoc]
  );

  const handleSubmitForReview = useCallback((notes?: string) => {
    if (!activeProposalId) return;
    secFilingService.submitProposalForReview(activeProposalId, notes);
    setProposals(secFilingService.getProposals());
    toast.success('Proposed changes submitted to Lead Controller for review and merging!');
  }, [activeProposalId]);

  const handleMergeProposal = useCallback(
    (proposalId: string, notes?: string) => {
      try {
        const reviewer = user?.full_name || 'Lead Controller';
        const { updatedDoc } = secFilingService.mergeProposalIntoMain(proposalId, reviewer, notes);
        setMainDoc(updatedDoc);
        setProposals(secFilingService.getProposals());
        setVersionHistory(secFilingService.getVersionHistory());
        if (activeProposalId === proposalId) {
          setActiveProposalId(null);
        }
        toast.success(`Successfully merged changes into Main Version! (${updatedDoc.version})`);
      } catch (err: any) {
        toast.error(err.message || 'Failed to merge proposal');
      }
    },
    [user, activeProposalId]
  );

  const handleSelectiveMerge = useCallback(
    (proposalId: string, acceptedBlockIds: string[], notes?: string) => {
      try {
        const reviewer = user?.full_name || 'Lead Controller';
        const { updatedDoc } = secFilingService.mergeSelectiveChanges(
          proposalId,
          acceptedBlockIds,
          reviewer,
          notes
        );
        setMainDoc(updatedDoc);
        setProposals(secFilingService.getProposals());
        setVersionHistory(secFilingService.getVersionHistory());
        if (activeProposalId === proposalId) {
          setActiveProposalId(null);
        }
        toast.success(`Confirmed and merged ${acceptedBlockIds.length} changes into Main Version! (${updatedDoc.version})`);
      } catch (err: any) {
        toast.error(err.message || 'Failed to merge selected changes');
      }
    },
    [user, activeProposalId]
  );

  const handleRejectProposal = useCallback(
    (proposalId: string, notes: string) => {
      const reviewer = user?.full_name || 'Lead Controller';
      secFilingService.rejectProposal(proposalId, reviewer, notes);
      setProposals(secFilingService.getProposals());
      toast.info('Proposal marked as rejected with feedback.');
    },
    [user]
  );

  const handleRestoreVersion = useCallback(
    (snapshotId: string) => {
      try {
        const restoredBy = user?.full_name || 'Lead Controller';
        const updated = secFilingService.restoreVersion(snapshotId, restoredBy);
        setMainDoc(updated);
        setVersionHistory(secFilingService.getVersionHistory());
        setActiveProposalId(null);
        toast.success(`Document restored to ${updated.version}`);
      } catch (err: any) {
        toast.error(err.message || 'Failed to restore version');
      }
    },
    [user]
  );

  const handleResetToDefault = useCallback(() => {
    secFilingService.resetToDefault();
    refreshAll();
    setActiveProposalId(null);
    setSelectedBlockId(null);
    toast.success('Reset filing document to baseline v22 Review Copy');
  }, [refreshAll]);

  // --------------------------------------------------------------------------
  // 4. MEMOIZED DIFFS
  // --------------------------------------------------------------------------
  const activeDiffs = useMemo(() => {
    if (!activeProposal) return [];
    return calculateDiffForProposal(activeProposal);
  }, [activeProposal, calculateDiffForProposal]);

  // --------------------------------------------------------------------------
  // 5. ALL EFFECTS (Strictly at the bottom)
  // --------------------------------------------------------------------------
  // Detect contributor link on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isContributor =
      params.get('contributor') === 'true' || window.location.pathname.includes('/contribute');
    const propId = params.get('proposalId');
    const name = params.get('name');
    const role = params.get('role');
    const section = params.get('section');
    const title = params.get('title') || undefined;
    const desc = params.get('desc') || undefined;

    if (isContributor) {
      setActiveRole('CONTRIBUTOR');
      const effectivePropId = propId || 'prop-contrib-session-active';
      const ensuredProp = secFilingService.getOrCreateContributorProposal({
        id: effectivePropId,
        title: title || (name ? `${name}'s Section Revisions` : 'Contributor Draft Revisions'),
        name: name || undefined,
        role: role || undefined,
        section: section || undefined,
        description: desc
      });
      setProposals(secFilingService.getProposals());
      setActiveProposalId(ensuredProp.id);

      setContributorSession({
        isContributor: true,
        name: name || undefined,
        role: role || undefined,
        assignedSection: section && section !== 'ALL' ? section : undefined
      });

      if (section && section !== 'ALL') {
        setSectionFilter(section);
      }
      toast.info(`Welcome ${name || 'Contributor'}! You are editing in Contributor Draft mode.`);
    }
  }, []);

  // Real-time cross-tab synchronization (BroadcastChannel + StorageEvent)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === 'sec_filing_proposals_v2_full' ||
        e.key === 'sec_filing_main_doc_v2_full' ||
        e.key === 'sec_filing_versions_v2_full'
      ) {
        refreshAll();
      }
    };

    window.addEventListener('storage', handleStorage);

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('sec_filing_sync_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'PROPOSAL_SUBMITTED') {
            refreshAll();
            toast.success(`New draft submitted by ${event.data?.author || 'Contributor'}!`, {
              description: `"${event.data?.title || 'Filing Updates'}" is ready for Lead Controller review in Merge Control.`
            });
          } else if (event.data?.type === 'DOC_MERGED') {
            refreshAll();
            toast.info('Main document updated with newly approved changes.');
          } else {
            refreshAll();
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel error', err);
      }
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (bc) bc.close();
    };
  }, [refreshAll]);

  // Global Keyboard Listener for Ctrl+Z / Cmd+Z and Ctrl+Y / Cmd+Shift+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      if (!isCtrlOrCmd) return;

      const key = e.key.toLowerCase();

      // Undo: Ctrl+Z or Cmd+Z (without shift)
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y, or Ctrl+Shift+Z / Cmd+Shift+Z
      if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        e.stopPropagation();
        handleRedo();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleUndo, handleRedo]);

  return {
    mainDoc,
    proposals,
    versionHistory,
    activeProposalId,
    activeProposal,
    workingBlocks,
    filteredBlocks,
    documentSections,
    selectedBlockId,
    selectedBlockIds,
    activeRole,
    activeDiffs,
    sectionFilter,
    searchQuery,
    setSelectedBlockId,
    setSelectedBlockIds,
    toggleBlockSelection,
    selectAllBlocks,
    clearBlockSelection,
    setActiveProposalId,
    setActiveRole,
    setSectionFilter,
    setSearchQuery,
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
    handleUndo,
    handleRedo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoCount: undoStack.length,
    redoCount: redoStack.length,
    handleCreateProposal,
    handleCreateContributorInvite,
    handleSubmitForReview,
    handleMergeProposal,
    handleSelectiveMerge,
    handleRejectProposal,
    handleRestoreVersion,
    handleResetToDefault,
    calculateDiffForProposal,
    contributorSession
  };
}
