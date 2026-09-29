import type {
  SecFilingDocument,
  SecChangeProposal,
  SecVersionSnapshot,
  SecBlock,
  SecBlockDiff,
  SecChangeCategory,
  SecChangeTag
} from '../types/secFiling';
import { isMajorStatementHeaderCell } from '../utils/secFilingExport';
import { INITIAL_SEC_FILING_DOC, INITIAL_PROPOSALS, INITIAL_VERSION_HISTORY } from '../data/initialSecFilingData';

export function compactFinancialTableBlock(table: SecBlock): SecBlock {
  if (table.type !== 'financial_table' || !table.rows) return table;

  const b = {
    ...table,
    headers: [...(table.headers || [])],
    columnAlignments: [...(table.columnAlignments || [])],
    rows: table.rows.map((r: any) => ({ ...r, cells: [...r.cells] }))
  };

  const numCols = b.headers.length;

  // 1. Close unclosed ( in cells and merge isolated )
  for (const r of b.rows) {
    for (let c = 0; c < r.cells.length; c++) {
      const val = (r.cells[c] || '').trim();
      if (val.startsWith('(') && !val.endsWith(')')) {
        let foundClosing = false;
        for (let k = c + 1; k < Math.min(c + 4, r.cells.length); k++) {
          if ((r.cells[k] || '').trim() === ')') {
            r.cells[c] = val + ')';
            r.cells[k] = '';
            foundClosing = true;
            break;
          }
        }
        if (!foundClosing) {
          r.cells[c] = val + ')';
        }
      } else if (val === ')') {
        for (let k = c - 1; k >= Math.max(0, c - 3); k--) {
          const prev = (r.cells[k] || '').trim();
          if (prev.startsWith('(') && !prev.endsWith(')')) {
            r.cells[k] = prev + ')';
            r.cells[c] = '';
            break;
          }
        }
        if (r.cells[c] === ')') r.cells[c] = '';
      }
    }
  }

  // 2. Merge isolated currency columns ($ or CAD or USD) into next adjacent data cell
  for (let c = 1; c < numCols; c++) {
    for (const r of b.rows) {
      const val = (r.cells[c] || '').trim();
      if (val === '$' || val === 'CAD' || val === 'USD') {
        for (let k = c + 1; k < Math.min(c + 3, numCols); k++) {
          const nextVal = (r.cells[k] || '').trim();
          if (nextVal && !nextVal.startsWith('$')) {
            r.cells[k] = val + nextVal;
            r.cells[c] = '';
            break;
          }
        }
      }
    }
  }

  // 3 & 4. Optimized single-pass scan for empty columns & header alignment
  const colNonEmptyCounts = new Array(numCols).fill(0);
  const colHasDataRows = new Array(numCols).fill(false);

  for (let rIdx = 0; rIdx < b.rows.length; rIdx++) {
    const rowCells = b.rows[rIdx].cells;
    for (let c = 1; c < numCols; c++) {
      const val = (rowCells[c] || '').trim();
      if (val !== '') {
        colNonEmptyCounts[c]++;
        if (rIdx >= 3) {
          colHasDataRows[c] = true;
        }
      }
    }
  }

  // Header re-alignment for columns without data rows
  for (let c = 1; c < numCols; c++) {
    if (!colHasDataRows[c]) {
      const targetCol = [c + 1, c - 1, c + 2].find((k) => k >= 1 && k < numCols && colHasDataRows[k]);
      if (targetCol !== undefined) {
        for (let rIdx = 0; rIdx < Math.min(4, b.rows.length); rIdx++) {
          const topVal = (b.rows[rIdx].cells[c] || '').trim();
          const targetVal = (b.rows[rIdx].cells[targetCol] || '').trim();
          if (topVal && !targetVal) {
            b.rows[rIdx].cells[targetCol] = topVal;
            b.rows[rIdx].cells[c] = '';
          }
        }
      }
    }
  }

  // Detect and remove ghost columns left behind by PDF/Word table parsing.
  //
  // A column is only a ghost if its header is meaningless. An empty column under a
  // real header ("Notes", "Prior Period") belongs to a table the user has not filled
  // in yet, and dropping it collapsed every new or blank-template table down to a
  // single column on the next read from storage.
  const colsToRemove: number[] = [];
  for (let c = 1; c < numCols; c++) {
    const hVal = (b.headers[c] || '').trim();
    const isGhostHeader = hVal === '' || /^Col\s*\d+$/i.test(hVal) || hVal === '-';
    if (!isGhostHeader) continue;
    if (colNonEmptyCounts[c] === 0 || (colNonEmptyCounts[c] <= 1 && numCols > 3)) {
      colsToRemove.push(c);
    }
  }

  // Never compact a table down to a single column; that reads as the table vanishing.
  while (colsToRemove.length > 0 && numCols - colsToRemove.length < 2) {
    colsToRemove.pop();
  }

  if (colsToRemove.length > 0) {
    const keepIndices = Array.from({ length: numCols }, (_, i) => i).filter(i => !colsToRemove.includes(i));
    b.headers = keepIndices.map(i => b.headers[i] || '');
    b.columnAlignments = keepIndices.map(i => b.columnAlignments[i] || 'right');
    b.rows = b.rows.map((r: any) => ({
      ...r,
      cells: keepIndices.map(i => r.cells[i] || '')
    }));
  }

  // 5. Clean shading from header rows and major statement headers (e.g. Assets, Liabilities and shareholders' equity)
  for (const r of b.rows) {
    const isCategoryHeader = r.type === 'category_header' || r.type === 'section_title';
    const isMajorHeader = !isCategoryHeader && r.cells && r.cells.some((c: string) => isMajorStatementHeaderCell(c));
    const isDateHeader = !isCategoryHeader && (r.type === 'header' || (r.cells && r.cells.some((c: string) => /^As of$/i.test((c || '').trim()) || /^(Three|Six|Nine|Twelve)\s+months\s+ended/i.test((c || '').trim()))));
    if (isCategoryHeader || /^Current\s+assets/i.test((r.cells?.[0] || '').trim())) {
      r.type = 'category_header';
      r.bold = true;
      if (!r.shading) r.shading = '#DAE9F7';
      r.cells = r.cells.map((c: string, idx: number) => idx === 0 ? c : (c && c.trim() === '-' ? '' : c));
    } else if (isMajorHeader) {
      r.type = 'header';
      r.bold = true;
      delete r.shading;
      if (r.indent && r.indent > 1) {
        r.indent = 1;
      }
    } else if ((r.type === 'header' || isDateHeader) && r.shading) {
      delete r.shading;
    }
  }

  return b as any;
}

export function sanitizeAndCompactBlocks(blocks: SecBlock[]): SecBlock[] {
  return blocks.map((b) => {
    if (b.type === 'financial_table' && b.rows) {
      return compactFinancialTableBlock(b);
    }
    return b;
  });
}

const STORAGE_KEYS = {
  MAIN_DOC: 'sec_filing_main_doc_v4_compact',
  PROPOSALS: 'sec_filing_proposals_v4_compact',
  VERSION_HISTORY: 'sec_filing_versions_v4_compact'
};

// Cross-tab synchronization via BroadcastChannel (single reused instance)
let syncBroadcastChannel: BroadcastChannel | null = null;
function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel !== 'undefined') {
    if (!syncBroadcastChannel) {
      try {
        syncBroadcastChannel = new BroadcastChannel('sec_filing_sync_channel');
      } catch (e) {
        console.warn('BroadcastChannel init error', e);
      }
    }
    return syncBroadcastChannel;
  }
  return null;
}

function broadcastSync(type: string, payload?: any) {
  try {
    const channel = getBroadcastChannel();
    if (channel) {
      channel.postMessage({ type, ...payload, timestamp: Date.now() });
    }
  } catch (e) {
    console.warn('BroadcastChannel sync error', e);
  }
}

// Debounced Disk I/O: prevents synchronous localStorage serialization freezes on every keystroke
let saveMainDocTimer: any = null;
let pendingMainDocToSave: SecFilingDocument | null = null;

let saveProposalsTimer: any = null;
let pendingProposalsToSave: SecChangeProposal[] | null = null;

// --------------------------------------------------------------------------
// Storage quota handling
//
// Every merge pushes a full copy of the document into version history and every
// contributor invite copies the whole block list into a proposal, so this filing
// outgrows the ~5 MB localStorage budget quickly (uploaded logos are inlined as
// base64 data URLs, which makes it worse). When that happened the write threw,
// the error was only logged, and the pending in-memory buffer was cleared anyway
// -- so a submitted draft silently reverted to whatever was last on disk.
// --------------------------------------------------------------------------

/** Version snapshots retained on disk; older ones are historical and reclaimable. */
const MAX_RETAINED_SNAPSHOTS = 5;
/** Snapshots kept when storage is already full and space must be reclaimed. */
const MIN_RETAINED_SNAPSHOTS = 2;
/** Closed (merged/rejected) proposals kept when reclaiming space. */
const MAX_RETAINED_CLOSED_PROPOSALS = 5;

export type StorageFailure = {
  key: string;
  /** True when space was reclaimed and the write eventually went through. */
  recovered: boolean;
};

let storageFailureListener: ((failure: StorageFailure) => void) | null = null;

/** Lets the UI surface storage-quota problems instead of only logging them. */
export function setStorageFailureListener(
  listener: ((failure: StorageFailure) => void) | null
): void {
  storageFailureListener = listener;
}

function isQuotaError(err: unknown): boolean {
  if (typeof DOMException !== 'undefined' && err instanceof DOMException) {
    return (
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22
    );
  }
  return !!err && typeof err === 'object' && (err as any).name === 'QuotaExceededError';
}

/**
 * Frees room taken by purely historical filing data, one escalating round at a
 * time. Returns false once there is nothing left that is safe to drop.
 */
function reclaimStorageSpace(round: number): boolean {
  try {
    if (round === 0) {
      const raw = localStorage.getItem(STORAGE_KEYS.VERSION_HISTORY);
      if (!raw) return false;
      const history = JSON.parse(raw);
      if (!Array.isArray(history) || history.length <= MAX_RETAINED_SNAPSHOTS) return false;
      // Newest snapshots are appended, so keep the tail.
      localStorage.setItem(
        STORAGE_KEYS.VERSION_HISTORY,
        JSON.stringify(history.slice(-MAX_RETAINED_SNAPSHOTS))
      );
      return true;
    }

    if (round === 1) {
      const raw = localStorage.getItem(STORAGE_KEYS.VERSION_HISTORY);
      if (!raw) return false;
      const history = JSON.parse(raw);
      if (!Array.isArray(history) || history.length <= MIN_RETAINED_SNAPSHOTS) return false;
      localStorage.setItem(
        STORAGE_KEYS.VERSION_HISTORY,
        JSON.stringify(history.slice(-MIN_RETAINED_SNAPSHOTS))
      );
      return true;
    }

    if (round === 2) {
      // Drop the oldest closed proposals. Drafts and anything pending review are
      // live work and are never discarded here.
      const source = pendingProposalsToSave || JSON.parse(localStorage.getItem(STORAGE_KEYS.PROPOSALS) || 'null');
      if (!Array.isArray(source)) return false;
      const isClosed = (p: any) => p?.status === 'merged' || p?.status === 'rejected';
      const closed = source.filter(isClosed);
      if (closed.length <= MAX_RETAINED_CLOSED_PROPOSALS) return false;
      const keptClosed = new Set(closed.slice(0, MAX_RETAINED_CLOSED_PROPOSALS).map((p: any) => p.id));
      const trimmed = source.filter((p: any) => !isClosed(p) || keptClosed.has(p.id));
      if (pendingProposalsToSave) {
        pendingProposalsToSave = trimmed;
      }
      localStorage.setItem(STORAGE_KEYS.PROPOSALS, JSON.stringify(trimmed));
      return true;
    }
  } catch (e) {
    console.warn('Could not reclaim SEC filing storage space', e);
  }
  return false;
}

/**
 * Writes to localStorage, reclaiming historical data and retrying if the browser
 * reports the quota as exceeded. Returns false when the value could not be stored.
 */
function safeSetItem(key: string, value: string): boolean {
  for (let round = 0; ; round++) {
    try {
      localStorage.setItem(key, value);
      if (round > 0) {
        storageFailureListener?.({ key, recovered: true });
      }
      return true;
    } catch (err) {
      if (!isQuotaError(err)) {
        console.error(`Failed to write ${key} to storage`, err);
        storageFailureListener?.({ key, recovered: false });
        return false;
      }
      if (!reclaimStorageSpace(round)) {
        console.error(`Browser storage is full; could not write ${key}`, err);
        storageFailureListener?.({ key, recovered: false });
        return false;
      }
    }
  }
}

/** Returns true when nothing is left buffered, i.e. every pending write landed. */
export function flushPendingSaves(): boolean {
  if (pendingMainDocToSave) {
    if (saveMainDocTimer) clearTimeout(saveMainDocTimer);
    saveMainDocTimer = null;
    const doc = pendingMainDocToSave;
    if (safeSetItem(STORAGE_KEYS.MAIN_DOC, JSON.stringify(doc))) {
      pendingMainDocToSave = null;
      broadcastSync("MAIN_DOC_SAVED", { version: doc.version });
    }
    // On failure the buffer is deliberately kept: reads go through it, so the
    // session keeps serving the real document instead of stale on-disk content.
  }

  if (pendingProposalsToSave) {
    if (saveProposalsTimer) clearTimeout(saveProposalsTimer);
    saveProposalsTimer = null;
    const proposals = pendingProposalsToSave;
    if (safeSetItem(STORAGE_KEYS.PROPOSALS, JSON.stringify(proposals))) {
      pendingProposalsToSave = null;
      broadcastSync("PROPOSALS_SAVED", { count: proposals.length });
    }
  }

  return pendingMainDocToSave === null && pendingProposalsToSave === null;
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushPendingSaves);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushPendingSaves();
    }
  });
}

export const secFilingService = {
  flushPendingSaves,

  getMainDocument(): SecFilingDocument {
    if (pendingMainDocToSave) {
      return pendingMainDocToSave;
    }
    const saved = localStorage.getItem(STORAGE_KEYS.MAIN_DOC) || localStorage.getItem('sec_filing_main_doc_v2_full') || localStorage.getItem('sec_filing_main_doc');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.blocks)) {
          parsed.blocks = sanitizeAndCompactBlocks(parsed.blocks);
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse main document from storage', e);
      }
    }
    safeSetItem(STORAGE_KEYS.MAIN_DOC, JSON.stringify(INITIAL_SEC_FILING_DOC));
    return JSON.parse(JSON.stringify(INITIAL_SEC_FILING_DOC));
  },

  saveMainDocument(doc: SecFilingDocument, immediate = false): boolean {
    pendingMainDocToSave = doc;
    if (immediate) {
      return flushPendingSaves();
    } else {
      if (saveMainDocTimer) clearTimeout(saveMainDocTimer);
      saveMainDocTimer = setTimeout(flushPendingSaves, 350);
    }
    return true;
  },

  getProposals(): SecChangeProposal[] {
    if (pendingProposalsToSave) {
      return pendingProposalsToSave;
    }
    const saved = localStorage.getItem(STORAGE_KEYS.PROPOSALS) || localStorage.getItem('sec_filing_proposals_v1') || localStorage.getItem('sec_filing_proposals');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p: SecChangeProposal) => ({
            ...p,
            blocks: sanitizeAndCompactBlocks(p.blocks || [])
          }));
        }
      } catch (e) {
        console.error('Failed to parse proposals from storage', e);
      }
    }
    safeSetItem(STORAGE_KEYS.PROPOSALS, JSON.stringify(INITIAL_PROPOSALS));
    return JSON.parse(JSON.stringify(INITIAL_PROPOSALS));
  },

  saveProposals(proposals: SecChangeProposal[], immediate = false): boolean {
    pendingProposalsToSave = proposals;
    if (immediate) {
      return flushPendingSaves();
    }
    if (saveProposalsTimer) clearTimeout(saveProposalsTimer);
    saveProposalsTimer = setTimeout(flushPendingSaves, 350);
    return true;
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

  submitProposalForReview(
    proposalId: string,
    notes?: string
  ): { ok: boolean; reason?: 'not_found' | 'storage_full' } {
    const proposals = this.getProposals();
    const p = proposals.find((x) => x.id === proposalId);
    if (!p) {
      return { ok: false, reason: 'not_found' };
    }
    p.status = 'pending_review';
    p.submissionNotes = notes;
    p.submittedAt = new Date().toISOString();
    p.updatedAt = new Date().toISOString();
    // Write through immediately. The broadcast below makes other tabs re-read storage
    // at once, so a debounced write would have them reload a proposal list that does
    // not contain the submission yet.
    const persisted = this.saveProposals(proposals, true);
    if (!persisted) {
      // The submission is live in this session but did not reach storage, so the
      // Lead Controller would never see it. Report it instead of claiming success.
      return { ok: false, reason: 'storage_full' };
    }
    broadcastSync("PROPOSAL_SUBMITTED", { author: p.author.name, proposalId: p.id, title: p.title });
    return { ok: true };
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

    // Write the merged document through immediately and abort the merge if it does not
    // reach storage, so the proposal is never marked merged against a document that was
    // silently rolled back.
    if (!this.saveMainDocument(updatedMain, true)) {
      throw new Error(
        'Browser storage is full, so the merged document could not be saved. Clear older version history or merged drafts for this filing, then merge again.'
      );
    }

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
    this.saveProposals(proposals, true);
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
    safeSetItem(STORAGE_KEYS.VERSION_HISTORY, JSON.stringify(INITIAL_VERSION_HISTORY));
    return JSON.parse(JSON.stringify(INITIAL_VERSION_HISTORY));
  },

  saveVersionHistory(history: SecVersionSnapshot[]): void {
    // Each snapshot carries a full copy of the document, so cap the history here
    // rather than letting it grow until it exhausts the storage quota.
    const capped =
      history.length > MAX_RETAINED_SNAPSHOTS ? history.slice(-MAX_RETAINED_SNAPSHOTS) : history;
    safeSetItem(STORAGE_KEYS.VERSION_HISTORY, JSON.stringify(capped));
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

    if (!this.saveMainDocument(updatedMain, true)) {
      throw new Error(
        'Browser storage is full, so the restored document could not be saved. Clear older version history for this filing, then restore again.'
      );
    }

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

  calculateDiffs(baseBlocks: SecBlock[], proposedBlocks: SecBlock[], originSnapshotBlocks?: SecBlock[]): SecBlockDiff[] {
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
      } else if (orig === pBlock) {
        // FAST-PATH: Pointer equality confirms 0 changes in O(1) time
        diffs.push({
          blockId: pBlock.id,
          status: 'unchanged',
          originalBlock: orig,
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
        // Check if this block existed in the original base document when the proposal was branched
        // If it was added to Live after the proposal was created, the contributor did NOT delete it!
        const initialBlocks = originSnapshotBlocks || INITIAL_SEC_FILING_DOC.blocks;
        const existedInInitial = initialBlocks.some((initB) => initB.id === bBlock.id);

        if (existedInInitial) {
          // Genuinely deleted by contributor in proposal
          diffs.push({
            blockId: bBlock.id,
            status: 'deleted',
            originalBlock: bBlock,
            changeCategories: ['structure', 'content'],
            changeTags: [
              { category: 'structure', label: `${bBlock.type.replace('_', ' ')} block deleted by contributor` }
            ]
          });
        } else {
          // Block was added to Live directly; contributor proposal simply didn't have it.
          // Preserve as unchanged live content so it is NOT marked as deleted.
          diffs.push({
            blockId: bBlock.id,
            status: 'unchanged',
            originalBlock: bBlock,
            proposedBlock: bBlock
          });
        }
      }
    }

    return diffs;
  },

  resetToDefault(): void {
    // Drop the debounced buffers too, otherwise reads keep serving the pre-reset
    // document from memory.
    if (saveMainDocTimer) clearTimeout(saveMainDocTimer);
    if (saveProposalsTimer) clearTimeout(saveProposalsTimer);
    saveMainDocTimer = null;
    saveProposalsTimer = null;
    pendingMainDocToSave = null;
    pendingProposalsToSave = null;

    localStorage.removeItem(STORAGE_KEYS.MAIN_DOC);
    localStorage.removeItem(STORAGE_KEYS.PROPOSALS);
    localStorage.removeItem(STORAGE_KEYS.VERSION_HISTORY);
    safeSetItem(STORAGE_KEYS.MAIN_DOC, JSON.stringify(INITIAL_SEC_FILING_DOC));
  }
};
