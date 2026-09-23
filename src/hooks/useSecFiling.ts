import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  SecFilingDocument,
  SecChangeProposal,
  SecVersionSnapshot,
  SecBlock,
  SecBlockType,
  SecBlockDiff,
  SecBlockSpacing
} from '../types/secFiling';
import { secFilingService } from '../services/secFilingService';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'sonner';
import { ZENATECH_LOGO_DATA_URL } from '../data/zenatechLogoAsset';

export type UserFilingRole = 'LEAD_CONTROLLER' | 'CONTRIBUTOR';

export function useSecFiling() {
  const { user } = useAuth();

  // Role: Default to Lead Controller if super admin or allow quick toggle
  const [activeRole, setActiveRole] = useState<UserFilingRole>(
    user?.is_super_admin ? 'LEAD_CONTROLLER' : 'LEAD_CONTROLLER'
  );

  const [mainDoc, setMainDoc] = useState<SecFilingDocument>(() => secFilingService.getMainDocument());
  const [proposals, setProposals] = useState<SecChangeProposal[]>(() => secFilingService.getProposals());
  const [versionHistory, setVersionHistory] = useState<SecVersionSnapshot[]>(() =>
    secFilingService.getVersionHistory()
  );

  // Active proposal if editing a branch/proposal, or null if editing Main
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);

  // Search / section filter
  const [sectionFilter, setSectionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Contributor invite session data (if opened via share link)
  const [contributorSession, setContributorSession] = useState<{
    isContributor: boolean;
    name?: string;
    role?: string;
    assignedSection?: string;
  }>({ isContributor: false });

  // Detect contributor link on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isContributor = params.get('contributor') === 'true';
    const propId = params.get('proposalId');
    const name = params.get('name');
    const role = params.get('role');
    const section = params.get('section');

    if (isContributor) {
      setActiveRole('CONTRIBUTOR');
      setContributorSession({
        isContributor: true,
        name: name || undefined,
        role: role || undefined,
        assignedSection: section && section !== 'ALL' ? section : undefined
      });

      if (propId) {
        setActiveProposalId(propId);
      }
      if (section && section !== 'ALL') {
        setSectionFilter(section);
      }
      toast.info(`Welcome ${name || 'Contributor'}! You are editing in Contributor Draft mode.`);
    }
  }, []);

  // Active Proposal object if any
  const activeProposal = useMemo(() => {
    return proposals.find((p) => p.id === activeProposalId) || null;
  }, [proposals, activeProposalId]);

  // Current Working Blocks: either active proposal's blocks or mainDoc's blocks
  const workingBlocks = useMemo(() => {
    if (activeProposal) {
      return activeProposal.blocks;
    }
    return mainDoc.blocks;
  }, [activeProposal, mainDoc.blocks]);

  // Selected block id for inspector & multi-block selection set
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);

  // Toggle selection for a single or multiple blocks
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

  // Calculate diffs between mainDoc and active proposal (or selected proposal)
  const calculateDiffForProposal = useCallback(
    (proposal: SecChangeProposal): SecBlockDiff[] => {
      return secFilingService.calculateDiffs(mainDoc.blocks, proposal.blocks);
    },
    [mainDoc.blocks]
  );

  const activeDiffs = useMemo(() => {
    if (!activeProposal) return [];
    return calculateDiffForProposal(activeProposal);
  }, [activeProposal, calculateDiffForProposal]);

  // Sync with service
  const refreshAll = useCallback(() => {
    setMainDoc(secFilingService.getMainDocument());
    setProposals(secFilingService.getProposals());
    setVersionHistory(secFilingService.getVersionHistory());
  }, []);

  // Update working blocks (either in active proposal or main doc)
  const setWorkingBlocks = useCallback(
    (newBlocks: SecBlock[]) => {
      if (activeProposal) {
        const updatedProposal: SecChangeProposal = {
          ...activeProposal,
          blocks: newBlocks,
          updatedAt: new Date().toISOString()
        };
        // Update summary
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

  // Block Manipulation functions
  const addBlock = useCallback(
    (index: number, type: SecBlockType, defaultSection?: string) => {
      const section = defaultSection || workingBlocks[index]?.section || 'General Disclosures';
      const blockId = `block-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      let newBlock: SecBlock;

      switch (type) {
        case 'heading':
          newBlock = {
            id: blockId,
            type: 'heading',
            section,
            level: 2,
            text: 'New Section Heading',
            alignment: 'left',
            bold: true,
            spacingTop: 8,
            spacing: 'normal'
          };
          break;
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
      }

      const nextBlocks = [...workingBlocks];
      const targetIdx = Math.max(0, Math.min(index, nextBlocks.length));
      nextBlocks.splice(targetIdx, 0, newBlock);
      setWorkingBlocks(nextBlocks);
      setSelectedBlockId(newBlock.id);
      toast.success(`Added new ${type.replace('_', ' ')} block`);
    },
    [workingBlocks, setWorkingBlocks, user]
  );

  const updateBlock = useCallback(
    (id: string, updates: Partial<SecBlock>) => {
      const nextBlocks = workingBlocks.map((b) => {
        if (b.id === id) {
          return {
            ...b,
            ...updates,
            updatedAt: new Date().toISOString(),
            modifiedBy: user?.full_name || 'User'
          } as SecBlock;
        }
        return b;
      });
      setWorkingBlocks(nextBlocks);
    },
    [workingBlocks, setWorkingBlocks, user]
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

  // Move multiple selected blocks simultaneously
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

  // Duplicate multiple selected blocks at once
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

  // Delete multiple selected blocks
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

  // Move blocks to section
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

  // Update spacing for multiple selected blocks
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

  // Proposals & Merge Actions
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

  // Unique sections list for sidebar
  const documentSections = useMemo(() => {
    const list: string[] = [];
    workingBlocks.forEach((b) => {
      if (b.section && !list.includes(b.section)) {
        list.push(b.section);
      }
    });
    return list;
  }, [workingBlocks]);

  // Filtered blocks based on search and section
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

