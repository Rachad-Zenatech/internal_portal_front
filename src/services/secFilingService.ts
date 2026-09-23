import type {
  SecFilingDocument,
  SecChangeProposal,
  SecVersionSnapshot,
  SecBlockDiff,
  SecBlock
} from '../types/secFiling';
import {
  INITIAL_SEC_FILING_DOC,
  INITIAL_PROPOSALS,
  INITIAL_VERSION_HISTORY
} from '../data/initialSecFilingData';

const STORAGE_KEYS = {
  MAIN_DOC: 'sec_filing_main_doc_v2_full',
  PROPOSALS: 'sec_filing_proposals_v2_full',
  VERSION_HISTORY: 'sec_filing_versions_v2_full'
};

export const secFilingService = {
  getMainDocument(): SecFilingDocument {
    const saved = localStorage.getItem(STORAGE_KEYS.MAIN_DOC);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // If parsed document is old or has few blocks, update to full 501 blocks
        if (parsed.blocks && parsed.blocks.length >= 200) {
          if (!parsed.blocks.some((b: any) => b.id === 'blk-0000' || b.type === 'image')) {
            parsed.blocks.unshift({
              id: 'blk-0000',
              type: 'image',
              section: 'Cover Page',
              url: '/Picture1.jpg',
              alt: 'ZenaTech Logo',
              alignment: 'center',
              width: 280,
              spacingTop: 0
            });
            localStorage.setItem(STORAGE_KEYS.MAIN_DOC, JSON.stringify(parsed));
          }
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved SEC document', e);
      }
    }
    // Initialize full document
    localStorage.setItem(STORAGE_KEYS.MAIN_DOC, JSON.stringify(INITIAL_SEC_FILING_DOC));
    return JSON.parse(JSON.stringify(INITIAL_SEC_FILING_DOC));
  },

  saveMainDocument(doc: SecFilingDocument): void {
    const updated = {
      ...doc,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.MAIN_DOC, JSON.stringify(updated));
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
        console.error('Failed to parse saved proposals', e);
      }
    }
    localStorage.setItem(STORAGE_KEYS.PROPOSALS, JSON.stringify(INITIAL_PROPOSALS));
    return JSON.parse(JSON.stringify(INITIAL_PROPOSALS));
  },

  saveProposals(proposals: SecChangeProposal[]): void {
    localStorage.setItem(STORAGE_KEYS.PROPOSALS, JSON.stringify(proposals));
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
      assignedSection: assignedSection || undefined,
      inviteToken: `inv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`,
      changeSummary: {
        addedCount: 0,
        modifiedCount: 0,
        deletedCount: 0,
        description
      }
    };

    proposals.unshift(newProposal);
    this.saveProposals(proposals);
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
    const author = {
      id: `contrib-${Date.now()}`,
      name: params.contributorName,
      email: params.contributorEmail || `${params.contributorName.toLowerCase().replace(/\s+/g, '.')}@zenatech.com`,
      role: params.contributorRole || 'Financial Contributor'
    };

    const proposal = this.createProposal(
      params.title,
      author,
      params.description || `Draft contributor session for ${params.contributorName}`,
      params.baseDoc,
      params.assignedSection
    );

    const baseUrl = window.location.origin + window.location.pathname;
    const queryParams = new URLSearchParams({
      contributor: 'true',
      proposalId: proposal.id,
      name: params.contributorName,
      role: params.contributorRole,
      section: params.assignedSection || 'ALL'
    });
    const inviteUrl = `${baseUrl}?${queryParams.toString()}`;

    return { proposal, inviteUrl };
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

    // Build the merged block list starting from current main blocks
    let mergedBlocks: SecBlock[] = JSON.parse(JSON.stringify(currentMain.blocks));

    // Process modified & deleted
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

    // Process added blocks
    for (const diff of diffs) {
      if (diff.status === 'added' && diff.proposedBlock && acceptedSet.has(diff.blockId)) {
        // Find position in proposal blocks to place it near related blocks
        const propIdx = proposal.blocks.findIndex((b) => b.id === diff.blockId);
        if (propIdx > 0) {
          const prevBlock = proposal.blocks[propIdx - 1];
          const mainIdx = mergedBlocks.findIndex((b) => b.id === prevBlock.id);
          if (mainIdx !== -1) {
            mergedBlocks.splice(mainIdx + 1, 0, JSON.parse(JSON.stringify(diff.proposedBlock)));
            continue;
          }
        }
        mergedBlocks.push(JSON.parse(JSON.stringify(diff.proposedBlock)));
      }
    }

    const nextVersionNumber = currentMain.versionNumber + 1;
    const nextVersionLabel = `v${nextVersionNumber} Approved`;
    const versionHistory = this.getVersionHistory();

    const updatedMain: SecFilingDocument = {
      ...currentMain,
      version: nextVersionLabel,
      versionNumber: nextVersionNumber,
      blocks: mergedBlocks,
      updatedAt: new Date().toISOString(),
      lastModifiedBy: `${reviewerName} (Selective merge: ${proposal.title})`,
      status: 'under_review'
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
          proposedBlock: pBlock
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
          diffs.push({
            blockId: pBlock.id,
            status: 'modified',
            originalBlock: orig,
            proposedBlock: pBlock
          });
        }
      }
    }

    for (const bBlock of baseBlocks) {
      if (!proposedMap.has(bBlock.id)) {
        diffs.push({
          blockId: bBlock.id,
          status: 'deleted',
          originalBlock: bBlock
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
