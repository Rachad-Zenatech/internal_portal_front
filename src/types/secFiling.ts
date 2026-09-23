export type SecBlockType =
  | 'heading'
  | 'paragraph'
  | 'financial_table'
  | 'callout'
  | 'signature'
  | 'divider'
  | 'metadata'
  | 'image';

export type SecHeadingLevel = 1 | 2 | 3 | 4;

export type SecBlockSpacing = 'compact' | 'normal' | 'relaxed' | 'loose';

export interface SecHeadingBlock {
  id: string;
  type: 'heading';
  section: string;
  level: SecHeadingLevel;
  text: string;
  alignment: 'left' | 'center' | 'right';
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  spacing?: SecBlockSpacing;
  spacingTop?: number;
  spacingBottom?: number;
  lineSpacing?: number;
  updatedAt?: string;
  modifiedBy?: string;
}

export interface SecParagraphBlock {
  id: string;
  type: 'paragraph';
  section: string;
  text: string;
  alignment: 'left' | 'center' | 'right' | 'justify';
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  noteNumber?: string;
  spacing?: SecBlockSpacing;
  spacingTop?: number;
  spacingBottom?: number;
  lineSpacing?: number;
  updatedAt?: string;
  modifiedBy?: string;
}

export interface SecTableRow {
  id: string;
  type: 'header' | 'section_title' | 'data' | 'subtotal' | 'total' | 'blank';
  cells: string[];
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  doubleUnderline?: boolean;
  shading?: string;
  indent?: number; // 0, 1, 2 indentation level
}

export interface SecFinancialTableBlock {
  id: string;
  type: 'financial_table';
  section: string;
  title?: string;
  headers: string[];
  headerShading?: string;
  columnAlignments: ('left' | 'center' | 'right')[];
  columnWidths?: string[];
  rows: SecTableRow[];
  footnotes?: string[];
  spacing?: SecBlockSpacing;
  spacingTop?: number;
  spacingBottom?: number;
  updatedAt?: string;
  modifiedBy?: string;
}

export interface SecCalloutBlock {
  id: string;
  type: 'callout';
  section: string;
  variant: 'info' | 'warning' | 'notice' | 'unaudited' | 'success';
  title?: string;
  content: string;
  spacing?: SecBlockSpacing;
  spacingTop?: number;
  spacingBottom?: number;
  updatedAt?: string;
  modifiedBy?: string;
}

export interface SecSignatureOfficer {
  id: string;
  name: string;
  title: string;
  date: string;
  signatureText?: string;
  signed: boolean;
}

export interface SecSignatureBlock {
  id: string;
  type: 'signature';
  section: string;
  title?: string;
  officers: SecSignatureOfficer[];
  spacing?: SecBlockSpacing;
  spacingTop?: number;
  spacingBottom?: number;
  updatedAt?: string;
  modifiedBy?: string;
}

export interface SecDividerBlock {
  id: string;
  type: 'divider';
  section: string;
  pageBreak: boolean;
  label?: string;
  spacing?: SecBlockSpacing;
  spacingTop?: number;
  spacingBottom?: number;
  updatedAt?: string;
  modifiedBy?: string;
}

export interface SecMetadataBlock {
  id: string;
  type: 'metadata';
  section: string;
  companyName: string;
  symbol: string;
  cik: string;
  formType: string;
  periodEnded: string;
  currency: string;
  fiscalYear: string;
  filingDate: string;
  documentTitle: string;
  jurisdiction: string;
  spacing?: SecBlockSpacing;
  spacingTop?: number;
  spacingBottom?: number;
  updatedAt?: string;
  modifiedBy?: string;
}

export interface SecImageBlock {
  id: string;
  type: 'image';
  section: string;
  url: string;
  alt?: string;
  caption?: string;
  alignment: 'left' | 'center' | 'right';
  width?: number;
  height?: number;
  spacing?: SecBlockSpacing;
  spacingTop?: number;
  spacingBottom?: number;
  updatedAt?: string;
  modifiedBy?: string;
}

export type SecBlock =
  | SecHeadingBlock
  | SecParagraphBlock
  | SecFinancialTableBlock
  | SecCalloutBlock
  | SecSignatureBlock
  | SecDividerBlock
  | SecMetadataBlock
  | SecImageBlock;

export interface SecFilingDocument {
  id: string;
  title: string;
  symbol: string;
  formType: string;
  period: string;
  currency: string;
  status: 'draft' | 'under_review' | 'approved' | 'filed';
  version: string;
  versionNumber: number;
  blocks: SecBlock[];
  createdAt: string;
  updatedAt: string;
  lastModifiedBy: string;
  lockedBy?: string | null;
}

export interface SecChangeProposal {
  id: string;
  title: string;
  author: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'pending_review' | 'merged' | 'rejected';
  baseVersion: string;
  baseVersionNumber: number;
  blocks: SecBlock[];
  changeSummary: {
    addedCount: number;
    modifiedCount: number;
    deletedCount: number;
    description: string;
  };
  assignedSection?: string;
  inviteToken?: string;
  submissionNotes?: string;
  submittedAt?: string;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface SecVersionSnapshot {
  id: string;
  version: string;
  versionNumber: number;
  timestamp: string;
  author: string;
  description: string;
  blocks: SecBlock[];
  proposalId?: string;
}

export interface SecBlockDiff {
  blockId: string;
  status: 'unchanged' | 'added' | 'modified' | 'deleted';
  originalBlock?: SecBlock;
  proposedBlock?: SecBlock;
  fieldDiffs?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}
