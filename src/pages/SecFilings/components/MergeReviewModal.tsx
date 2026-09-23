import React, { useState, useEffect } from 'react';
import {
  GitMerge,
  GitPullRequest,
  X,
  MessageSquare,
  ShieldCheck,
  Square,
  Check
} from 'lucide-react';
import type {
  SecChangeProposal,
  SecFilingDocument,
  SecBlockDiff,
  SecBlock
} from '../../../types/secFiling';
import { ZENATECH_LOGO_DATA_URL } from '../../../data/zenatechLogoAsset';
import { Dialog, DialogContent, DialogTitle } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Textarea } from '../../../components/ui/textarea';

interface MergeReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: SecChangeProposal | null;
  mainDoc: SecFilingDocument;
  diffs: SecBlockDiff[];
  isLeadController: boolean;
  onMerge: (proposalId: string, notes?: string) => void;
  onMergeSelective?: (proposalId: string, acceptedBlockIds: string[], notes?: string) => void;
  onReject: (proposalId: string, notes: string) => void;
}

export const MergeReviewModal: React.FC<MergeReviewModalProps> = ({
  open,
  onOpenChange,
  proposal,
  mainDoc,
  diffs,
  isLeadController,
  onMerge,
  onMergeSelective,
  onReject
}) => {
  const [reviewNotes, setReviewNotes] = useState('');
  const [diffViewMode, setDiffViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');
  const [acceptedBlockIds, setAcceptedBlockIds] = useState<string[]>([]);

  const changedDiffs = diffs.filter((d) => d.status !== 'unchanged');
  const addedDiffs = diffs.filter((d) => d.status === 'added');
  const modifiedDiffs = diffs.filter((d) => d.status === 'modified');
  const deletedDiffs = diffs.filter((d) => d.status === 'deleted');

  // Initialize accepted block IDs whenever proposal or diffs change
  useEffect(() => {
    if (proposal && diffs.length > 0) {
      setAcceptedBlockIds(changedDiffs.map((d) => d.blockId));
    }
  }, [proposal, diffs]);

  if (!proposal) return null;

  const toggleDiffAcceptance = (blockId: string) => {
    setAcceptedBlockIds((prev) =>
      prev.includes(blockId) ? prev.filter((id) => id !== blockId) : [...prev, blockId]
    );
  };

  const handleSelectAll = () => {
    setAcceptedBlockIds(changedDiffs.map((d) => d.blockId));
  };

  const handleDeselectAll = () => {
    setAcceptedBlockIds([]);
  };

  const handleConfirmMergeSelected = () => {
    if (acceptedBlockIds.length === 0) {
      alert('Please select at least one change to confirm and merge.');
      return;
    }
    if (onMergeSelective) {
      onMergeSelective(proposal.id, acceptedBlockIds, reviewNotes);
    } else {
      onMerge(proposal.id, reviewNotes);
    }
    onOpenChange(false);
  };

  const handleApproveAndMergeAll = () => {
    onMerge(proposal.id, reviewNotes);
    onOpenChange(false);
  };

  const handleRejectClick = () => {
    if (!reviewNotes.trim()) {
      alert('Please provide review feedback explaining why the proposal was rejected.');
      return;
    }
    onReject(proposal.id, reviewNotes);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100">
                  {proposal.title}
                </DialogTitle>
                <Badge
                  variant={proposal.status === 'pending_review' ? 'default' : 'outline'}
                  className="text-[10px] uppercase font-mono"
                >
                  {proposal.status.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Submitted by <strong className="text-slate-700 dark:text-zinc-300">{proposal.author.name}</strong> (
                {proposal.author.role}) • Targeting <span className="font-mono font-bold text-blue-600">{mainDoc.version}</span>
              </p>
            </div>
          </div>

          {/* Diff summary badges */}
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-none font-mono text-xs">
              +{addedDiffs.length} added
            </Badge>
            <Badge className="bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-none font-mono text-xs">
              ~{modifiedDiffs.length} modified
            </Badge>
            <Badge className="bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border-none font-mono text-xs">
              -{deletedDiffs.length} deleted
            </Badge>
          </div>
        </div>

        {/* Contributor Submission Note Banner (If present) */}
        {proposal.submissionNotes && (
          <div className="px-6 py-2.5 bg-purple-50/80 dark:bg-purple-950/40 border-b border-purple-200 dark:border-purple-900/60 flex items-start gap-2.5 text-xs text-purple-950 dark:text-purple-200">
            <MessageSquare className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Contributor Submission Note: </span>
              <span>"{proposal.submissionNotes}"</span>
              {proposal.submittedAt && (
                <span className="text-[10px] text-purple-700 dark:text-purple-300 ml-2">
                  ({new Date(proposal.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </span>
              )}
            </div>
          </div>
        )}

        {/* View Mode & Selective Cherry-Pick Controls */}
        <div className="px-6 py-2 bg-slate-100/70 dark:bg-zinc-800/40 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-600 dark:text-zinc-400">
              Selected for Merge: <strong>{acceptedBlockIds.length} of {changedDiffs.length}</strong>
            </span>
            <div className="flex items-center gap-1 border-l border-slate-300 dark:border-zinc-700 pl-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] font-semibold text-blue-600 hover:underline"
              >
                Select All
              </button>
              <span className="text-slate-300 dark:text-zinc-600">•</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-[11px] font-semibold text-slate-500 hover:underline"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 rounded-lg p-0.5 border border-slate-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setDiffViewMode('side-by-side')}
              className={`px-2.5 py-1 rounded text-xs font-medium ${
                diffViewMode === 'side-by-side'
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                  : 'text-slate-500'
              }`}
            >
              Side-by-Side
            </button>
            <button
              type="button"
              onClick={() => setDiffViewMode('unified')}
              className={`px-2.5 py-1 rounded text-xs font-medium ${
                diffViewMode === 'unified'
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                  : 'text-slate-500'
              }`}
            >
              Unified Diff
            </button>
          </div>
        </div>

        {/* Diff Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[48vh]">
          {changedDiffs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No differences found between the proposed changes and the Main document.
            </div>
          ) : (
            changedDiffs.map((diff, idx) => {
              const isAccepted = acceptedBlockIds.includes(diff.blockId);
              return (
                <div
                  key={diff.blockId || idx}
                  className={`p-4 rounded-xl border transition-all space-y-3 ${
                    isAccepted
                      ? 'border-blue-300 dark:border-blue-800 bg-blue-50/20 dark:bg-blue-950/20 shadow-xs'
                      : 'border-slate-200 dark:border-zinc-800 bg-slate-50/40 dark:bg-zinc-950/40 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      {/* Checkbox to confirm / cherry-pick this specific block change */}
                      <button
                        type="button"
                        onClick={() => toggleDiffAcceptance(diff.blockId)}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-semibold transition-colors ${
                          isAccepted
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-300 dark:border-zinc-700'
                        }`}
                      >
                        {isAccepted ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Accepted for Merge</span>
                          </>
                        ) : (
                          <>
                            <Square className="w-3.5 h-3.5 text-slate-400" />
                            <span>Skip Change</span>
                          </>
                        )}
                      </button>

                      <Badge
                        variant={
                          diff.status === 'added'
                            ? 'default'
                            : diff.status === 'modified'
                            ? 'outline'
                            : 'destructive'
                        }
                        className={
                          diff.status === 'added'
                            ? 'bg-emerald-600 text-white'
                            : diff.status === 'modified'
                            ? 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/40'
                            : ''
                        }
                      >
                        {diff.status.toUpperCase()}
                      </Badge>
                      <span className="font-semibold text-slate-700 dark:text-zinc-300">
                        {(diff.proposedBlock || diff.originalBlock)?.section}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        ({(diff.proposedBlock || diff.originalBlock)?.type})
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-slate-400">
                      ID: {diff.blockId}
                    </span>
                  </div>

                  {/* Diff Viewer representation */}
                  {diffViewMode === 'side-by-side' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* Original Main */}
                      <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-1">
                        <div className="font-semibold text-slate-500 text-[10px] uppercase">
                          Current Main Version
                        </div>
                        {diff.originalBlock ? (
                          <RenderDiffBlockContent block={diff.originalBlock} />
                        ) : (
                          <span className="italic text-slate-400">(Block did not exist)</span>
                        )}
                      </div>

                      {/* Proposed */}
                      <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/20 space-y-1">
                        <div className="font-semibold text-blue-600 dark:text-blue-400 text-[10px] uppercase">
                          Proposed by Contributor
                        </div>
                        {diff.proposedBlock ? (
                          <RenderDiffBlockContent block={diff.proposedBlock} isNew />
                        ) : (
                          <span className="italic text-red-500">(Block deleted)</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-2 text-xs">
                      {diff.originalBlock && (
                        <div className="p-2 rounded bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 line-through">
                          <RenderDiffBlockContent block={diff.originalBlock} />
                        </div>
                      )}
                      {diff.proposedBlock && (
                        <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300">
                          <RenderDiffBlockContent block={diff.proposedBlock} isNew />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Lead Controller Merge / Review Action Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-950/80 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
              <span>Controller Confirmation & Merge Commit Notes</span>
            </label>
            <Textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="e.g. Verified and approved changes against finalized Q2 schedule."
              rows={2}
              className="text-xs bg-white dark:bg-zinc-900"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>
                {isLeadController
                  ? `Lead Controller authority active. ${acceptedBlockIds.length} change(s) selected to merge.`
                  : 'Viewing in Contributor mode. Switch role to Lead Controller to merge.'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="text-xs h-8"
              >
                Cancel
              </Button>

              {isLeadController && proposal.status !== 'merged' && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRejectClick}
                    className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Reject
                  </Button>

                  <Button
                    type="button"
                    onClick={handleConfirmMergeSelected}
                    disabled={acceptedBlockIds.length === 0}
                    className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm font-semibold"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Confirm & Merge Selected ({acceptedBlockIds.length})</span>
                  </Button>

                  {acceptedBlockIds.length < changedDiffs.length && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleApproveAndMergeAll}
                      className="text-xs h-8 text-emerald-700 dark:text-emerald-300 border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    >
                      <span>Merge All ({changedDiffs.length})</span>
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const RenderDiffBlockContent: React.FC<{ block: SecBlock; isNew?: boolean }> = ({ block }) => {
  if (block.type === 'heading') {
    return <div className="font-bold text-sm text-slate-900 dark:text-zinc-100">{block.text}</div>;
  }
  if (block.type === 'paragraph') {
    return <div className="leading-relaxed text-slate-700 dark:text-zinc-300">{block.text}</div>;
  }
  if (block.type === 'callout') {
    return (
      <div className="italic text-slate-700 dark:text-zinc-300">
        <strong>{block.title}:</strong> {block.content}
      </div>
    );
  }
  if (block.type === 'financial_table') {
    return (
      <div className="space-y-1">
        <div className="font-semibold text-xs text-slate-800 dark:text-zinc-200">{block.title}</div>
        <div className="text-[11px] text-slate-500 font-mono">
          {block.rows.length} rows, {block.headers.length} columns: [{block.headers.join(', ')}]
        </div>
      </div>
    );
  }
  if (block.type === 'image') {
    return (
      <div className="flex items-center gap-2">
        <img
          src={block.url || ZENATECH_LOGO_DATA_URL}
          alt={block.alt || 'Diff Image'}
          className="w-16 h-10 object-contain rounded border border-slate-200"
        />
        <div className="text-[11px] text-slate-600">
          <div>Width: {block.width || 260}px</div>
          {block.caption && <div className="italic text-slate-400">"{block.caption}"</div>}
        </div>
      </div>
    );
  }
  return <div className="text-slate-500">[{block.type} Block]</div>;
};
