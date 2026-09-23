import React, { useState } from 'react';
import {
  Link2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import type { SecFilingDocument, SecChangeProposal } from '../../../types/secFiling';
import { Dialog, DialogContent, DialogTitle } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { toast } from 'sonner';

interface ContributorInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mainDoc: SecFilingDocument;
  documentSections: string[];
  onCreateInvite: (params: {
    title: string;
    contributorName: string;
    contributorRole: string;
    contributorEmail?: string;
    assignedSection?: string;
    description?: string;
  }) => { proposal: SecChangeProposal; inviteUrl: string };
  onOpenProposal: (proposalId: string) => void;
}

export const ContributorInviteModal: React.FC<ContributorInviteModalProps> = ({
  open,
  onOpenChange,
  mainDoc,
  documentSections,
  onCreateInvite,
  onOpenProposal
}) => {
  const [contributorName, setContributorName] = useState('Sarah Jenkins');
  const [contributorRole, setContributorRole] = useState('External Legal Counsel');
  const [contributorEmail, setContributorEmail] = useState('sarah.jenkins@lawcorp.com');
  const [taskTitle, setTaskTitle] = useState('Note 7 Debt Covenants & Legal Disclosures');
  const [assignedSection, setAssignedSection] = useState('ALL');
  const [description, setDescription] = useState('Please review and insert the finalized Q2 debenture terms.');

  const [generatedInvite, setGeneratedInvite] = useState<{
    proposal: SecChangeProposal;
    inviteUrl: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    if (!contributorName.trim() || !taskTitle.trim()) {
      toast.error('Please enter a contributor name and task title.');
      return;
    }

    const res = onCreateInvite({
      title: taskTitle.trim(),
      contributorName: contributorName.trim(),
      contributorRole: contributorRole.trim(),
      contributorEmail: contributorEmail.trim(),
      assignedSection: assignedSection === 'ALL' ? undefined : assignedSection,
      description: description.trim()
    });

    setGeneratedInvite(res);
    toast.success(`Generated contributor access link for ${contributorName.trim()}!`);
  };

  const handleCopyLink = () => {
    if (!generatedInvite) return;
    navigator.clipboard.writeText(generatedInvite.inviteUrl);
    setCopied(true);
    toast.success('Contributor link copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSwitchToContributorSession = () => {
    if (!generatedInvite) return;
    onOpenProposal(generatedInvite.proposal.id);
    onOpenChange(false);
    toast.info(`Switched to "${generatedInvite.proposal.title}" workspace`);
  };

  const applyPreset = (preset: {
    name: string;
    role: string;
    email: string;
    title: string;
    section: string;
  }) => {
    setContributorName(preset.name);
    setContributorRole(preset.role);
    setContributorEmail(preset.email);
    setTaskTitle(preset.title);
    setAssignedSection(preset.section);
    setGeneratedInvite(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-0 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-blue-200 backdrop-blur-md">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <span>Invite Contributor to SEC Filing</span>
                <Badge className="bg-blue-500/30 text-blue-200 text-[10px] border-none font-mono">
                  Share Link
                </Badge>
              </DialogTitle>
              <p className="text-xs text-blue-200/80 mt-0.5">
                Generate an isolated sandbox link for team members or external advisors to add their edits.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Presets */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Quick Role Presets</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  label: 'Legal Counsel',
                  name: 'Sarah Jenkins',
                  role: 'External Legal Counsel',
                  email: 'sarah.jenkins@lawcorp.com',
                  title: 'Note 7 Debt Covenants & Legal Terms',
                  section: 'Note 7: Convertible Debentures'
                },
                {
                  label: 'Tax Manager',
                  name: 'David Chen',
                  role: 'Senior Tax Manager',
                  email: 'david.chen@zenatech.com',
                  title: 'Income Taxes & Valuation Allowance',
                  section: 'Note 11: Income Taxes'
                },
                {
                  label: 'Audit Partner',
                  name: 'Marcus Vance',
                  role: 'Independent Auditor',
                  email: 'm.vance@auditfirm.com',
                  title: 'Interim Review Notice & Signatures',
                  section: 'Auditor Report & Cover'
                }
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="p-2 text-left rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50/70 dark:bg-zinc-800/40 hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-950/30 transition-all group"
                >
                  <div className="font-semibold text-slate-800 dark:text-zinc-200 group-hover:text-blue-600">
                    {p.label}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{p.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                Contributor Full Name *
              </label>
              <Input
                value={contributorName}
                onChange={(e) => {
                  setContributorName(e.target.value);
                  setGeneratedInvite(null);
                }}
                placeholder="e.g. Jane Doe"
                className="h-8 text-xs font-medium"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                Contributor Title / Role *
              </label>
              <Input
                value={contributorRole}
                onChange={(e) => {
                  setContributorRole(e.target.value);
                  setGeneratedInvite(null);
                }}
                placeholder="e.g. Senior Financial Analyst"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                Task / Proposal Title *
              </label>
              <Input
                value={taskTitle}
                onChange={(e) => {
                  setTaskTitle(e.target.value);
                  setGeneratedInvite(null);
                }}
                placeholder="e.g. Q2 Leases & Share Capital Draft"
                className="h-8 text-xs font-semibold text-blue-950 dark:text-blue-200"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                Assigned Section Focus
              </label>
              <select
                value={assignedSection}
                onChange={(e) => {
                  setAssignedSection(e.target.value);
                  setGeneratedInvite(null);
                }}
                className="w-full h-8 px-2 rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Entire Document (All Sections)</option>
                {documentSections.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-500 block mb-1">
              Instructions / Notes for Contributor
            </label>
            <Input
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setGeneratedInvite(null);
              }}
              placeholder="e.g. Please update fair value numbers and sign off when finished."
              className="h-8 text-xs"
            />
          </div>

          {/* Generate Link Button */}
          {!generatedInvite ? (
            <Button
              type="button"
              onClick={handleGenerate}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 gap-1.5 shadow-sm"
            >
              <Link2 className="w-4 h-4" />
              <span>Generate Shareable Contributor Link</span>
            </Button>
          ) : (
            /* Generated Result Card */
            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/40 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-xs text-blue-950 dark:text-blue-100">
                    Contributor Link Ready
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] border-blue-400 text-blue-700 dark:text-blue-300">
                  Ready to Send
                </Badge>
              </div>

              {/* URL Display */}
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white dark:bg-zinc-900 px-3 py-2 rounded-lg border border-blue-300 dark:border-zinc-700 font-mono text-[11px] text-slate-700 dark:text-zinc-300 truncate select-all">
                  {generatedInvite.inviteUrl}
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCopyLink}
                  className={`h-8 text-xs font-semibold gap-1.5 ${
                    copied
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </Button>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-600 dark:text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    Contributor edits their own proposal branch; live <strong>{mainDoc.version}</strong> is safe until you approve.
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSwitchToContributorSession}
                  className="h-7 text-[11px] gap-1 text-blue-600 border-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                >
                  <span>Open Contributor View</span>
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Targeting Main Document Version: <strong className="text-slate-700 dark:text-zinc-300 font-mono">{mainDoc.version}</strong>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-slate-500"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
