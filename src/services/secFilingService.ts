import type {
  SecFilingDocument,
  SecChangeProposal,
  SecVersionSnapshot,
  SecBlock,
  SecBlockDiff,
  SecChangeCategory,
  SecChangeTag
} from '../types/secFiling';
import { INITIAL_SEC_FILING_DOC, INITIAL_PROPOSALS, INITIAL_VERSION_HISTORY } from '../data/initialSecFilingData';

const STORAGE_KEYS = {
  MAIN_DOC: 'sec_filing_main_doc_v2_full',
  PROPOSALS: 'sec_filing_proposals_v2_full',
  VERSION_HISTORY: 'sec_filing_versions_v2_full'
};

// Cross-tab synchronization via BroadcastChannel
function broadcastSync(type: string, payload?: any) {
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel('sec_filing_sync_channel');
      channel.postMessage({ type, ...payload, timestamp: Date.now() });
      channel.close();
    } catch (e) {
      console.warn('BroadcastChannel sync error', e);
    }
  }
}

export const secFilingService = {
  getMainDocument(): SecFilingDocument {
    const saved = localStorage.getItem(STORAGE_KEYS.MAIN_DOC);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.blocks)) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse main document from storage', e);
      }
    }
    localStorage.setItem(STORAGE_KEYS.MAIN_DOC, JSON.stringify(INITIAL_SEC_FILING_DOC));
    return JSON.parse(JSON.stringify(INITIAL_SEC_FILING_DOC));
  },

  saveMainDocument(doc: SecFilingDocument): void {
    localStorage.setItem(STORAGE_KEYS.MAIN_DOC, JSON.stringify(doc));
    broadcastSync("MAIN_DOC_SAVED", { version: doc.version });
  },

  getProposals(): SecChangeProposal[] {
    const saved = localStorage.getItem(STORAGE_KEYS.PROPOSALS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse proposals from storage', e);
      }
    }
    localStorage.setItem(STORAGE_KEYS.PROPOSALS, JSON.stringify(INITIAL_PROPOSALS));
    return JSON.parse(JSON.stringify(INITIAL_PROPOSALS));
  },

  saveProposals(proposals: SecChangeProposal[]): void {
    localStorage.setItem(STORAGE_KEYS.PROPOSALS, JSON.stringify(proposals));
    broadcastSync("PROPOSALS_SAVED", { count: proposals.length });
  },

  createProposal(
    title: string,
    author: { id: string; name: string; email: string; role: string },
    description: string,
    baseDoc: SecFilingDocument,
    assignedSection?: string
  ): SecChangeProposal {
    const proposals = this.getProposals();
    const newProposal: SecChangeProposal = {
      id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      author,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
      baseVersion: baseDoc.version,
      baseVersionNumber: baseDoc.versionNumber,
      blocks: JSON.parse(JSON.stringify(baseDoc.blocks)),
      assignedSection: assignedSection && assignedSection !== 'ALL' ? assignedSection : undefined,
      changeSummary: {
        addedCount: 0,
        modifiedCount: 0,
        deletedCount: 0,
        description: description || 'New proposed branch created'
      }
    };

    proposals.unshift(newProposal);
    this.saveProposals(proposals);
    broadcastSync("PROPOSAL_CREATED", { proposalId: newProposal.id, title: newProposal.title });
    return newProposal;
  },

  createContributorInvite(params: {
    title: string;
    contributorName: string;
    contributorRole: string;
    contributorEmail?: string;
    assignedSection?: string;
    description?: string;
    baseDoc: SecFilingDocument;
  }): { proposal: SecChangeProposal; inviteUrl: string } {
    const proposals = this.getProposals();
    const propId = `prop-contrib-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const token = `inv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

    const author = {
      id: `usr-contrib-${Date.now().toString(36)}`,
      name: params.contributorName,
      email: params.contributorEmail || `${params.contributorName.toLowerCase().replace(/\s+/g, '.')}@zenatech.com`,
      role: params.contributorRole
    };

    const newProposal: SecChangeProposal = {
      id: propId,
      title: params.title || `${params.contributorName}'s ${params.assignedSection || 'Filing'} Revisions`,
      author,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
      baseVersion: params.baseDoc.version,
      baseVersionNumber: params.baseDoc.versionNumber,
      blocks: JSON.parse(JSON.stringify(params.baseDoc.blocks)),
      assignedSection: params.assignedSection && params.assignedSection !== 'ALL' ? params.assignedSection : undefined,
      inviteToken: token,
      changeSummary: {
        addedCount: 0,
        modifiedCount: 0,
        deletedCount: 0,
        description: params.description || `Draft assigned section workspace for ${params.contributorName}`
      }
    };

    proposals.unshift(newProposal);
    this.saveProposals(proposals);

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const paramsList = new URLSearchParams();
    paramsList.set('contributor', 'true');
    paramsList.set('proposalId', newProposal.id);
    paramsList.set('token', token);
    paramsList.set('name', params.contributorName);
    paramsList.set('role', params.contributorRole);
    if (params.assignedSection && params.assignedSection !== 'ALL') {
      paramsList.set('section', params.assignedSection);
    }
    if (params.title) {
      paramsList.set('title', params.title);
    }
    if (params.description) {
      paramsList.set('desc', params.description);
    }

    const inviteUrl = `${baseUrl}/sec-filings?${paramsList.toString()}`;

    broadcastSync("CONTRIBUTOR_INVITED", { proposalId: newProposal.id, name: params.contributorName });
    return { proposal: newProposal, inviteUrl };
  },

  getOrCreateContributorProposal(params: {
    id: string;
    title?: string;
    name?: string;
    role?: string;
    email?: string;
    section?: string;
    description?: string;
  }): SecChangeProposal {
    const proposals = this.getProposals();
    const existing = proposals.find((p) => p.id === params.id);
    if (existing) {
      return existing;
    }

    const mainDoc = this.getMainDocument();
    const author = {
      id: `contrib-${Date.now()}`,
      name: params.name || 'External Contributor',
      email: params.email || `${(params.name || 'contributor').toLowerCase().replace(/\s+/g, '.')}@zenatech.com`,
      role: params.role || 'Contributor'
    };

    const newProposal: SecChangeProposal = {
      id: params.id,
      title: params.title || `Contributor Draft - ${author.name}`,
      author,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
      baseVersion: mainDoc.version,
      baseVersionNumber: mainDoc.versionNumber,
      blocks: JSON.parse(JSON.stringify(mainDoc.blocks)),
      assignedSection: params.section && params.section !== 'ALL' ? params.section : undefined,
      inviteToken: `inv-${Date.now().toString(36)}`,
      changeSummary: {
        addedCount: 0,
        modifiedCount: 0,
        deletedCount: 0,
        description: params.description || `Draft contributor session for ${author.name}`
      }
    };

    proposals.unshift(newProposal);
    this.saveProposals(proposals);
    return newProposal;
  },

  updateProposal(proposal: SecChangeProposal): void {
    const proposals = this.getProposals();
    const idx = proposals.findIndex((p) => p.id === proposal.id);
    if (idx !== -1) {
      proposals[idx] = {
        ...proposal,
        updatedAt: new Date().toISOString()
      };
      this.saveProposals(proposals);
      broadcastSync("PROPOSAL_UPDATED", { proposalId: proposal.id });
    }
  },

  submitProposalForReview(proposalId: string, notes?: string): void {
    const proposals = this.getProposals();
    const p = proposals.find((x) => x.id === proposalId);
    if (p) {
      p.status = 'pending_review';
      p.submissionNotes = notes;
      p.submittedAt = new Date().toISOString();
      p.updatedAt = new Date().toISOString();
      this.saveProposals(proposals);
      broadcastSync("PROPOSAL_SUBMITTED", { author: p.author.name, proposalId: p.id, title: p.title });
    }
  },

  mergeSelectiveChanges(
    proposalId: string,
    acceptedBlockIds: string[],
    reviewerName: string,
    reviewNotes?: string
  ): { updatedDoc: SecFilingDocument; newSnapshot: SecVersionSnapshot } {
    const proposals = this.getProposals();
    const proposal = proposals.find((x) => x.id === proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    const currentMain = this.getMainDocument();
    const diffs = this.calculateDiffs(currentMain.blocks, proposal.blocks);
    const acceptedSet = new Set(acceptedBlockIds);

    let mergedBlocks: SecBlock[] = JSON.parse(JSON.stringify(currentMain.blocks));

    for (const diff of diffs) {
      if (acceptedSet.has(diff.blockId)) {
        if (diff.status === 'modified' && diff.proposedBlock) {
          const idx = mergedBlocks.findIndex((b) => b.id === diff.blockId);
          if (idx !== -1) {
            mergedBlocks[idx] = JSON.parse(JSON.stringify(diff.proposedBlock));
          }
        } else if (diff.status === 'deleted') {
          mergedBlocks = mergedBlocks.filter((b) => b.id !== diff.blockId);
        }
      }
    }

    for (const diff of diffs) {
      if (diff.status === 'added' && diff.proposedBlock && acceptedSet.has(diff.blockId)) {
        const propIndex = proposal.blocks.findIndex((b) => b.id === diff.blockId);
        let insertIndex = mergedBlocks.length;
        if (propIndex > 0) {
          const prevPropBlock = proposal.blocks[propIndex - 1];
          const mainPrevIdx = mergedBlocks.findIndex((b) => b.id === prevPropBlock.id);
          if (mainPrevIdx !== -1) {
            insertIndex = mainPrevIdx + 1;
          }
        }
        mergedBlocks.splice(insertIndex, 0, JSON.parse(JSON.stringify(diff.proposedBlock)));
      }
    }

    const nextVersionNumber = currentMain.versionNumber + 1;
    const nextVersionLabel = `v${nextVersionNumber} (Merged ${proposal.author.name})`;
    const versionHistory = this.getVersionHistory();

    const updatedMain: SecFilingDocument = {
      ...currentMain,
      version: nextVersionLabel,
      versionNumber: nextVersionNumber,
      blocks: mergedBlocks,
      updatedAt: new Date().toISOString(),
      lastModifiedBy: reviewerName
    };

    this.saveMainDocument(updatedMain);

    const newSnapshot: SecVersionSnapshot = {
      id: `snap-v${nextVersionNumber}-${Date.now()}`,
      version: nextVersionLabel,
      versionNumber: nextVersionNumber,
      timestamp: new Date().toISOString(),
      author: reviewerName,
      description: `Confirmed and merged ${acceptedBlockIds.length} changes from "${proposal.title}" by ${proposal.author.name}. ${reviewNotes || ''}`,
      blocks: JSON.parse(JSON.stringify(mergedBlocks)),
      proposalId: proposal.id
    };
    versionHistory.push(newSnapshot);
    this.saveVersionHistory(versionHistory);

    proposal.status = 'merged';
    proposal.reviewedBy = reviewerName;
    proposal.reviewedAt = new Date().toISOString();
    proposal.reviewNotes = reviewNotes;
    this.saveProposals(proposals);
    broadcastSync("DOC_MERGED", { reviewer: reviewerName, proposalId: proposal.id });

    return { updatedDoc: updatedMain, newSnapshot };
  },

  mergeProposalIntoMain(
    proposalId: string,
    reviewerName: string,
    reviewNotes?: string
  ): { updatedDoc: SecFilingDocument; newSnapshot: SecVersionSnapshot } {
    const proposals = this.getProposals();
    const proposal = proposals.find((x) => x.id === proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }
    const allDiffs = this.calculateDiffs(this.getMainDocument().blocks, proposal.blocks);
    const allChangedIds = allDiffs.filter((d) => d.status !== 'unchanged').map((d) => d.blockId);
    return this.mergeSelectiveChanges(proposalId, allChangedIds, reviewerName, reviewNotes);
  },

  rejectProposal(proposalId: string, reviewerName: string, reviewNotes: string): void {
    const proposals = this.getProposals();
    const p = proposals.find((x) => x.id === proposalId);
    if (p) {
      p.status = 'rejected';
      p.reviewedBy = reviewerName;
      p.reviewedAt = new Date().toISOString();
      p.reviewNotes = reviewNotes;
      this.saveProposals(proposals);
    }
  },

  getVersionHistory(): SecVersionSnapshot[] {
    const saved = localStorage.getItem(STORAGE_KEYS.VERSION_HISTORY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse version history', e);
      }
    }
    localStorage.setItem(STORAGE_KEYS.VERSION_HISTORY, JSON.stringify(INITIAL_VERSION_HISTORY));
    return JSON.parse(JSON.stringify(INITIAL_VERSION_HISTORY));
  },

  saveVersionHistory(history: SecVersionSnapshot[]): void {
    localStorage.setItem(STORAGE_KEYS.VERSION_HISTORY, JSON.stringify(history));
  },

  restoreVersion(snapshotId: string, restoredBy: string): SecFilingDocument {
    const history = this.getVersionHistory();
    const snapshot = history.find((s) => s.id === snapshotId);
    if (!snapshot) throw new Error('Snapshot not found');

    const currentMain = this.getMainDocument();
    const nextVersionNumber = currentMain.versionNumber + 1;
    const nextVersionLabel = `v${nextVersionNumber} (Restored from ${snapshot.version})`;

    const updatedMain: SecFilingDocument = {
      ...currentMain,
      version: nextVersionLabel,
      versionNumber: nextVersionNumber,
      blocks: JSON.parse(JSON.stringify(snapshot.blocks)),
      updatedAt: new Date().toISOString(),
      lastModifiedBy: `${restoredBy} (Restored from ${snapshot.version})`
    };

    this.saveMainDocument(updatedMain);

    const newSnapshot: SecVersionSnapshot = {
      id: `snap-v${nextVersionNumber}-${Date.now()}`,
      version: nextVersionLabel,
      versionNumber: nextVersionNumber,
      timestamp: new Date().toISOString(),
      author: restoredBy,
      description: `Restored document state from ${snapshot.version}`,
      blocks: JSON.parse(JSON.stringify(snapshot.blocks))
    };
    history.push(newSnapshot);
    this.saveVersionHistory(history);

    return updatedMain;
  },

  calculateDiffs(baseBlocks: SecBlock[], proposedBlocks: SecBlock[]): SecBlockDiff[] {
    const diffs: SecBlockDiff[] = [];
    const baseMap = new Map<string, SecBlock>(baseBlocks.map((b) => [b.id, b]));
    const proposedMap = new Map<string, SecBlock>(proposedBlocks.map((b) => [b.id, b]));

    for (const pBlock of proposedBlocks) {
      const orig = baseMap.get(pBlock.id);
      if (!orig) {
        diffs.push({
          blockId: pBlock.id,
          status: 'added',
          proposedBlock: pBlock,
          changeCategories: ['structure', 'content'],
          changeTags: [
            { category: 'structure', label: `New ${pBlock.type.replace('_', ' ')} block added` }
          ]
        });
      } else {
        const isSame = JSON.stringify(orig) === JSON.stringify(pBlock);
        if (isSame) {
          diffs.push({
            blockId: pBlock.id,
            status: 'unchanged',
            originalBlock: orig,
            proposedBlock: pBlock
          });
        } else {
          const fieldDiffs: { field: string; oldValue: any; newValue: any }[] = [];
          const changeTags: SecChangeTag[] = [];
          const categorySet = new Set<SecChangeCategory>();

          // 1. Spacing changes
          const origSpacingTop = orig.spacingTop ?? 0;
          const propSpacingTop = pBlock.spacingTop ?? 0;
          if (origSpacingTop !== propSpacingTop) {
            fieldDiffs.push({ field: 'spacingTop', oldValue: origSpacingTop, newValue: propSpacingTop });
            categorySet.add('spacing');
            const diffPx = propSpacingTop - origSpacingTop;
            changeTags.push({
              category: 'spacing',
              label: `Top Spacing: ${origSpacingTop}px → ${propSpacingTop}px`,
              detail: `Top spacing altered by ${diffPx > 0 ? '+' : ''}${diffPx}px`
            });
          }

          const origSpacingBottom = orig.spacingBottom ?? 0;
          const propSpacingBottom = pBlock.spacingBottom ?? 0;
          if (origSpacingBottom !== propSpacingBottom) {
            fieldDiffs.push({ field: 'spacingBottom', oldValue: origSpacingBottom, newValue: propSpacingBottom });
            categorySet.add('spacing');
            changeTags.push({
              category: 'spacing',
              label: `Bottom Spacing: ${origSpacingBottom}px → ${propSpacingBottom}px`
            });
          }

          const origSpacingPreset = orig.spacing || 'normal';
          const propSpacingPreset = pBlock.spacing || 'normal';
          if (origSpacingPreset !== propSpacingPreset) {
            fieldDiffs.push({ field: 'spacing', oldValue: origSpacingPreset, newValue: propSpacingPreset });
            categorySet.add('spacing');
            changeTags.push({
              category: 'spacing',
              label: `Spacing Preset: ${origSpacingPreset} → ${propSpacingPreset}`
            });
          }

          const origLineSpacing = (orig as any).lineSpacing;
          const propLineSpacing = (pBlock as any).lineSpacing;
          if (origLineSpacing !== propLineSpacing && (origLineSpacing || propLineSpacing)) {
            fieldDiffs.push({ field: 'lineSpacing', oldValue: origLineSpacing, newValue: propLineSpacing });
            categorySet.add('spacing');
            changeTags.push({
              category: 'spacing',
              label: `Line Height: ${origLineSpacing || '1.0'} → ${propLineSpacing || '1.0'}`
            });
          }

          // 2. Typography & Font Styling changes
          const origBold = !!(orig as any).bold;
          const propBold = !!(pBlock as any).bold;
          if (origBold !== propBold) {
            fieldDiffs.push({ field: 'bold', oldValue: origBold, newValue: propBold });
            categorySet.add('typography');
            changeTags.push({
              category: 'typography',
              label: propBold ? 'Font: Bold Added' : 'Font: Bold Removed'
            });
          }

          const origItalic = !!(orig as any).italic;
          const propItalic = !!(pBlock as any).italic;
          if (origItalic !== propItalic) {
            fieldDiffs.push({ field: 'italic', oldValue: origItalic, newValue: propItalic });
            categorySet.add('typography');
            changeTags.push({
              category: 'typography',
              label: propItalic ? 'Font: Italic Added' : 'Font: Italic Removed'
            });
          }

          const origUnderline = !!(orig as any).underline;
          const propUnderline = !!(pBlock as any).underline;
          if (origUnderline !== propUnderline) {
            fieldDiffs.push({ field: 'underline', oldValue: origUnderline, newValue: propUnderline });
            categorySet.add('typography');
            changeTags.push({
              category: 'typography',
              label: propUnderline ? 'Font: Underline Added' : 'Font: Underline Removed'
            });
          }

          const origFontSize = (orig as any).fontSize;
          const propFontSize = (pBlock as any).fontSize;
          if (origFontSize !== propFontSize && (origFontSize || propFontSize)) {
            fieldDiffs.push({ field: 'fontSize', oldValue: origFontSize, newValue: propFontSize });
            categorySet.add('typography');
            changeTags.push({
              category: 'typography',
              label: `Font Size: ${origFontSize || 'Default'} → ${propFontSize || 'Default'}pt`
            });
          }

          const origAlignment = (orig as any).alignment;
          const propAlignment = (pBlock as any).alignment;
          if (origAlignment !== propAlignment && (origAlignment || propAlignment)) {
            fieldDiffs.push({ field: 'alignment', oldValue: origAlignment, newValue: propAlignment });
            categorySet.add('typography');
            changeTags.push({
              category: 'typography',
              label: `Alignment: ${origAlignment || 'left'} → ${propAlignment || 'left'}`
            });
          }

          const origLevel = (orig as any).level;
          const propLevel = (pBlock as any).level;
          if (origLevel !== propLevel && (origLevel || propLevel)) {
            fieldDiffs.push({ field: 'level', oldValue: origLevel, newValue: propLevel });
            categorySet.add('typography');
            changeTags.push({
              category: 'typography',
              label: `Heading Level: H${origLevel || 2} → H${propLevel || 2}`
            });
          }

          // 3. Section & Structural Move
          if (orig.section !== pBlock.section) {
            fieldDiffs.push({ field: 'section', oldValue: orig.section, newValue: pBlock.section });
            categorySet.add('structure');
            changeTags.push({
              category: 'structure',
              label: `Moved Section: "${orig.section}" → "${pBlock.section}"`
            });
          }

          // 4. Text & Narrative Content
          const origText = (orig as any).text;
          const propText = (pBlock as any).text;
          if (origText !== propText && (origText !== undefined || propText !== undefined)) {
            fieldDiffs.push({ field: 'text', oldValue: origText, newValue: propText });
            categorySet.add('content');
            changeTags.push({
              category: 'content',
              label: 'Text Disclosure Modified'
            });
          }

          const origTitle = (orig as any).title;
          const propTitle = (pBlock as any).title;
          if (origTitle !== propTitle && (origTitle !== undefined || propTitle !== undefined)) {
            fieldDiffs.push({ field: 'title', oldValue: origTitle, newValue: propTitle });
            categorySet.add('content');
            changeTags.push({
              category: 'content',
              label: `Title: "${origTitle}" → "${propTitle}"`
            });
          }

          const origContent = (orig as any).content;
          const propContent = (pBlock as any).content;
          if (origContent !== propContent && (origContent !== undefined || propContent !== undefined)) {
            fieldDiffs.push({ field: 'content', oldValue: origContent, newValue: propContent });
            categorySet.add('content');
            changeTags.push({
              category: 'content',
              label: 'Callout Notice Content Edited'
            });
          }

          // 5. Financial Statements & Table Rows
          if (orig.type === 'financial_table' && pBlock.type === 'financial_table') {
            const origHeaders = JSON.stringify(orig.headers);
            const propHeaders = JSON.stringify(pBlock.headers);
            const origRows = JSON.stringify(orig.rows);
            const propRows = JSON.stringify(pBlock.rows);

            if (origHeaders !== propHeaders || origRows !== propRows) {
              categorySet.add('financial_data');
              let cellChanges = 0;
              const maxR = Math.max(orig.rows.length, pBlock.rows.length);
              for (let r = 0; r < maxR; r++) {
                const r1 = orig.rows[r];
                const r2 = pBlock.rows[r];
                if (!r1 || !r2) {
                  cellChanges += 1;
                } else if (JSON.stringify(r1.cells) !== JSON.stringify(r2.cells)) {
                  cellChanges += 1;
                }
              }
              changeTags.push({
                category: 'financial_data',
                label: `Financial Table: ${cellChanges} row/cell values modified`
              });
            }
          }

          // 6. Signatures
          if (orig.type === 'signature' && pBlock.type === 'signature') {
            if (JSON.stringify(orig.officers) !== JSON.stringify(pBlock.officers)) {
              categorySet.add('signature');
              changeTags.push({
                category: 'signature',
                label: 'Signatory Officers Updated'
              });
            }
          }

          if (changeTags.length === 0) {
            categorySet.add('content');
            changeTags.push({
              category: 'content',
              label: 'Block properties modified'
            });
          }

          const categories = Array.from(categorySet);
          const isSpacingOnly = categories.length === 1 && categories[0] === 'spacing';
          const isTypographyOnly = categories.length === 1 && categories[0] === 'typography';
          const isContentModified = categories.includes('content') || categories.includes('financial_data');

          diffs.push({
            blockId: pBlock.id,
            status: 'modified',
            originalBlock: orig,
            proposedBlock: pBlock,
            fieldDiffs,
            changeCategories: categories,
            changeTags,
            isSpacingOnly,
            isTypographyOnly,
            isContentModified
          });
        }
      }
    }

    for (const bBlock of baseBlocks) {
      if (!proposedMap.has(bBlock.id)) {
        diffs.push({
          blockId: bBlock.id,
          status: 'deleted',
          originalBlock: bBlock,
          changeCategories: ['structure', 'content'],
          changeTags: [
            { category: 'structure', label: `${bBlock.type.replace('_', ' ')} block deleted` }
          ]
        });
      }
    }

    return diffs;
  },

  resetToDefault(): void {
    localStorage.removeItem(STORAGE_KEYS.MAIN_DOC);
    localStorage.removeItem(STORAGE_KEYS.PROPOSALS);
    localStorage.removeItem(STORAGE_KEYS.VERSION_HISTORY);
    localStorage.setItem(STORAGE_KEYS.MAIN_DOC, JSON.stringify(INITIAL_SEC_FILING_DOC));
  }
};
