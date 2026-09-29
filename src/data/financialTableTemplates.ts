import type { ComponentType } from 'react';
import type { SecFinancialTableBlock } from '../types/secFiling';
import {
  Scale,
  TrendingDown,
  Activity,
  PieChart,
  FileSpreadsheet,
  Table
} from 'lucide-react';

export interface FinancialTableTemplate {
  id: string;
  name: string;
  badge?: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
  /** Structure copied into a financial_table block. Ids are regenerated on insert. */
  block: Partial<SecFinancialTableBlock>;
}

export const FINANCIAL_TABLE_TEMPLATES: FinancialTableTemplate[] = [
  {
    id: 'balance_sheet',
    name: 'Balance Sheet (Financial Position)',
    badge: '4 Cols',
    description: 'Assets, Liabilities & Equity with note refs, comparative periods & banded rows',
    icon: Scale,
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50',
    block: {
      title: 'Table: Statements of Financial Position',
      // Mirrors the live filing's Statements of Financial Position: the comparative
      // period caption lives in the first three rows of the table body,
      // column 1 carries note references, and value columns are right aligned.
      headers: ['', '', 'As of', 'As of'],
      columnAlignments: ['left', 'right', 'right', 'right'],
      rows: [
        { id: 'bs-1', type: 'header', cells: ['', '', 'As of', 'As of'], bold: true },
        { id: 'bs-2', type: 'data', cells: ['', '', 'June 30,', 'December 31,'], bold: true },
        { id: 'bs-3', type: 'data', cells: ['', 'Notes', '2026', '2025'], bold: true },
        { id: 'bs-4', type: 'header', cells: ['Assets', '', '', ''], bold: true },
        { id: 'bs-5', type: 'section_title', cells: ['Current assets', '', '', ''], bold: true, shading: '#CCECFF' },
        { id: 'bs-6', type: 'data', cells: ['Cash', '3', '$12,235,259', '$5,980,366'], bold: true, indent: 1 },
        { id: 'bs-7', type: 'data', cells: ['Marketable securities', '3', '22,340,879', '9,093,887'], bold: true, shading: '#CCECFF', indent: 1 },
        { id: 'bs-8', type: 'data', cells: ['Accounts receivable, net', '3', '5,145,822', '4,166,885'], bold: true, indent: 1 },
        { id: 'bs-9', type: 'data', cells: ['Short-term advance to affiliate', '14', '11,224,876', '9,095,545'], bold: true, shading: '#CCECFF', indent: 1 },
        { id: 'bs-10', type: 'data', cells: ['Inventory of drone components', '3', '4,399,969', '2,842,794'], bold: true, indent: 1 },
        { id: 'bs-11', type: 'data', cells: ['Other current assets', '3', '2,954,922', '2,030,715'], bold: true, shading: '#CCECFF', indent: 1 },
        { id: 'bs-12', type: 'total', cells: ['Total current assets', '', '58,301,728', '33,210,192'], bold: true, indent: 2 },
        { id: 'bs-13', type: 'section_title', cells: ['Long–term assets', '', '', ''], bold: true, shading: '#CCECFF' },
        { id: 'bs-14', type: 'data', cells: ['Property, plant & equipment, net', '6', '17,226,552', '11,692,444'], bold: true, indent: 1 },
        { id: 'bs-15', type: 'data', cells: ['Right of Use assets', '3', '7,847,688', '4,087,653'], bold: true, shading: '#CCECFF', indent: 1 },
        { id: 'bs-16', type: 'data', cells: ['Note receivable from affiliate', '5, 14', '341,850', '341,850'], bold: true, indent: 1 },
        { id: 'bs-17', type: 'data', cells: ['Long-term advance to affiliates', '14', '17,995,355', '15,216,050'], bold: true, shading: '#CCECFF', indent: 1 },
        { id: 'bs-18', type: 'data', cells: ['Capital advances', '7', '2,659,851', '1,708,194'], bold: true, indent: 1 },
        { id: 'bs-19', type: 'data', cells: ['Loan initiation fees', '', '3,095,271', '3,282,221'], bold: true, shading: '#CCECFF', indent: 1 },
        { id: 'bs-20', type: 'data', cells: ['Product development costs, net', '8', '7,933,299', '6,682,795'], bold: true, indent: 1 },
        { id: 'bs-21', type: 'data', cells: ['Intangibles', '8', '13,840,706', '10,355,079'], bold: true, shading: '#CCECFF', indent: 1 },
        { id: 'bs-22', type: 'data', cells: ['Goodwill', '3,8', '18,735,192', '12,106,307'], bold: true, indent: 1 },
        { id: 'bs-23', type: 'data', cells: ['Other long-term assets', '3', '1,292,937', '1,080,656'], bold: true, shading: '#CCECFF', indent: 1 },
        { id: 'bs-24', type: 'total', cells: ['Total long–term assets', '', '90,968,701', '66,553,248'], bold: true, indent: 2 },
        { id: 'bs-25', type: 'total', cells: ['Total assets', '', '149,270,429', '99,763,441'], bold: true, shading: '#CCECFF', indent: 2 },
        { id: 'bs-26', type: 'header', cells: ['Liabilities and shareholders’ equity', '', '', ''], bold: true },
        { id: 'bs-27', type: 'section_title', cells: ['Current liabilities', '', '', ''], bold: true, shading: '#CCECFF' },
        { id: 'bs-28', type: 'data', cells: ['Accounts payable and accrued liabilities', '', '9,466,499', '9,074,281'], bold: true, indent: 1 },
        { id: 'bs-29', type: 'data', cells: ['Warrant liability', '', '16,687,117', '0'], bold: true, shading: '#CCECFF', indent: 1 },
        { id: 'bs-30', type: 'data', cells: ['Contract Liabilities', '3', '1,784,223', '1,270,958'], bold: true, indent: 1 },
        { id: 'bs-31', type: 'data', cells: ['Lease liability', '3', '1,598,413', '921,068'], bold: true, shading: '#CCECFF', indent: 1 },
        { id: 'bs-32', type: 'data', cells: ['Current portion of loans payable', '9', '4,443,463', '3,689,457'], bold: true, indent: 1 },
        { id: 'bs-33', type: 'total', cells: ['Total current liabilities', '', '33,979,714', '14,955,764'], bold: true, shading: '#CCECFF', indent: 2 },
        { id: 'bs-34', type: 'section_title', cells: ['Long–term liabilities', '', '', ''], bold: true, shading: '#CCECFF' },
        { id: 'bs-35', type: 'data', cells: ['Long-term lease obligation', '3', '6,483,504', '3,279,270'], bold: true, indent: 1 },
        { id: 'bs-36', type: 'data', cells: ['Loans payable', '9', '17,437,359', '13,566,956'], bold: true, shading: '#CCECFF', indent: 1 },
        { id: 'bs-37', type: 'total', cells: ['Total long–term liabilities', '', '23,920,863', '16,846,226'], bold: true, indent: 2 },
        { id: 'bs-38', type: 'total', cells: ['Total liabilities', '', '57,900,577', '31,801,990'], bold: true, shading: '#CCECFF', indent: 2 },
        { id: 'bs-39', type: 'section_title', cells: ['Shareholders’ equity', '', '', ''], bold: true, shading: '#CCECFF' },
        { id: 'bs-40', type: 'data', cells: ['Super voting stock', '10', '5,550,000', '1,800,000'], bold: true, indent: 1 },
        { id: 'bs-41', type: 'data', cells: ['Preferred stock', '10', '82,710,000', '51,810,000'], bold: true, shading: '#CCECFF', indent: 1 },
        { id: 'bs-42', type: 'data', cells: ['Common stock', '10', '27,865,258', '14,406,266'], bold: true, indent: 1 },
        { id: 'bs-43', type: 'data', cells: ['Warrants', '10', '361,058', '361,058'], bold: true, shading: '#CCECFF', indent: 1 },
        { id: 'bs-44', type: 'data', cells: ['Contributed surplus', '', '239,917,894', '110,671,268'], bold: true, indent: 1 },
        { id: 'bs-45', type: 'data', cells: ['Foreign currency translation reserve', '2', '1,686,412', '(606,722)'], bold: true, shading: '#CCECFF', indent: 1 },
        { id: 'bs-46', type: 'data', cells: ['Accumulated deficit', '', '(104,859,747)', '(53,742,186)'], bold: true, indent: 1 },
        { id: 'bs-47', type: 'data', cells: ['Common Control Adjustment Account', '', '(161,861,023)', '(56,738,233)'], bold: true, shading: '#CCECFF', indent: 1 },
        { id: 'bs-48', type: 'total', cells: ['Total shareholders’ equity', '', '91,369,852', '67,961,451'], bold: true, indent: 2 },
        { id: 'bs-49', type: 'total', cells: ['Total liabilities and shareholders’ equity', '', '$149,270,429', '$99,763,441'], bold: true, shading: '#CCECFF', indent: 2 }
      ]
    }
  },
  {
    id: 'income_statement',
    name: 'Income Statement (Comprehensive Loss)',
    badge: '5 Cols',
    description: 'Revenue, operating expenses, other income, comprehensive loss, EPS & share counts',
    icon: TrendingDown,
    color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50',
    block: {
      title: 'Table: Statements of Comprehensive Loss',
      // Mirrors the live filing's Statements of Comprehensive Loss: the comparative
      // period caption lives in the first three rows of the table body, and every
      // value column is right aligned.
      headers: ['', 'Three Months Ended', 'Six Months Ended', '', ''],
      columnAlignments: ['left', 'right', 'right', 'right', 'right'],
      rows: [
        { id: 'is-1', type: 'header', cells: ['', 'Three Months Ended', 'Six Months Ended', '', ''], bold: true },
        { id: 'is-2', type: 'data', cells: ['', 'June 30,', 'June 30,', '', ''], bold: true },
        { id: 'is-3', type: 'data', cells: ['', '2026', '2025', '2026', '2025'], bold: true },
        { id: 'is-4', type: 'section_title', cells: ['Revenue', '', '', '', ''], bold: true, shading: '#DAE9F7' },
        { id: 'is-5', type: 'data', cells: ['Drone as a Service', '$8,100,566', '$1,580,582', '$16,442,433', '$1,983,348'], shading: '#CCECFF' },
        { id: 'is-6', type: 'data', cells: ['Software as a Service', '1,231,720', '661,080', '1,292,172', '1,393,968'], bold: true },
        { id: 'is-7', type: 'total', cells: ['Total revenue', '9,332,286', '2,241,662', '17,734,605', '3,377,316'], bold: true, underline: true, doubleUnderline: true, shading: '#CCECFF' },
        { id: 'is-8', type: 'section_title', cells: ['General and administrative expenses', '', '', '', ''], bold: true, shading: '#DAE9F7' },
        { id: 'is-9', type: 'data', cells: ['Sales and marketing', '7,118,782', '1,636,621', '11,108,368', '3,237,017'], bold: true, shading: '#CCECFF' },
        { id: 'is-10', type: 'data', cells: ['Wages and benefits', '12,095,294', '2,413,056', '20,559,782', '3,219,003'], bold: true },
        { id: 'is-11', type: 'data', cells: ['Stock-based compensation', '67,275', '35,000', '8,941,526', '430,000'], shading: '#CCECFF' },
        { id: 'is-12', type: 'data', cells: ['Stock issued for services', '–', '84,439', '–', '235,544'] },
        { id: 'is-13', type: 'data', cells: ['General and administrative', '5,537,985', '943,832', '9,322,830', '1,602,653'], shading: '#CCECFF' },
        { id: 'is-14', type: 'data', cells: ['Professional fees', '1,482,748', '191,991', '2,894,467', '494,300'] },
        { id: 'is-15', type: 'data', cells: ['Amortization and depreciation', '1,218,818', '207,791', '2,594,305', '371,189'], shading: '#CCECFF' },
        { id: 'is-16', type: 'data', cells: ['Programming and support fees', '3,714,536', '597,479', '5,785,640', '689,431'] },
        { id: 'is-17', type: 'total', cells: ['Total operating expenses', '31,235,438', '6,151,472', '61,206,918', '10,279,137'], bold: true, underline: true, doubleUnderline: true, shading: '#CCECFF' },
        { id: 'is-18', type: 'data', cells: ['Loss before other income (expenses)', '(21,903,152)', '(3,909,810)', '(43,472,313)', '(6,901,821)'], bold: true },
        { id: 'is-19', type: 'section_title', cells: ['Other (Income)/Expenses', '', '', '', ''], bold: true, shading: '#CCECFF' },
        { id: 'is-20', type: 'data', cells: ['Finance expenses', '(1,573,428)', '2,563,359', '3,509,972', '4,180,908'] },
        { id: 'is-21', type: 'data', cells: ['Interest income', '(549,039)', '(7,074)', '(562,928)', '(14,176)'], shading: '#CCECFF' },
        { id: 'is-22', type: 'data', cells: ['Foreign currency exchange (gain)/loss', '2,098,985', '(344,584)', '2,067,798', '(336,723)'] },
        { id: 'is-23', type: 'data', cells: ['Unrealized (gain)/loss on marketable securities', '2,687,985', '–', '2,630,405', '–'], shading: '#CCECFF' },
        { id: 'is-24', type: 'total', cells: ['Net loss for the period', '(24,567,655)', '(6,121,511)', '(51,117,560)', '(10,731,830)'], bold: true, underline: true, doubleUnderline: true },
        { id: 'is-25', type: 'section_title', cells: ['Other comprehensive items', '', '', '', ''], bold: true, shading: '#CCECFF' },
        { id: 'is-26', type: 'data', cells: ['Foreign currency translation reserve', '2,949,513', '(676,806)', '2,293,134', '(678,923)'], bold: true },
        { id: 'is-27', type: 'data', cells: ['Comprehensive (loss) for the period', '$(21,618,143)', '$(6,798,317)', '$(48,824,427)', '$(11,410,753)'], bold: true, shading: '#CCECFF' },
        { id: 'is-28', type: 'section_title', cells: ['Net (loss) per share:', '', '', '', ''], bold: true, shading: '#DAE9F7' },
        { id: 'is-29', type: 'data', cells: ['Basic', '$(0.30)', '(0.21)', '(0.76)', '$(0.38)'], shading: '#CCECFF' },
        { id: 'is-30', type: 'data', cells: ['Diluted', '$(0.30)', '(0.21)', '(0.76)', '$(0.38)'] },
        { id: 'is-31', type: 'data', cells: ['Net comprehensive (loss) loss per share', '', '', '', ''], shading: '#CCECFF' },
        { id: 'is-32', type: 'data', cells: ['Basic', '$(0.27)', '(0.24)', '(0.72)', '$(0.40)'], bold: true },
        { id: 'is-33', type: 'data', cells: ['Diluted', '$(0.27)', '(0.24)', '(0.72)', '$(0.40)'], shading: '#CCECFF' },
        { id: 'is-34', type: 'section_title', cells: ['Shares used in computing earnings per share:', '', '', '', ''], bold: true, shading: '#DAE9F7' },
        { id: 'is-35', type: 'data', cells: ['Basic', '80,977,561', '28,526,538', '67,375,487', '28,526,538'], shading: '#CCECFF' },
        { id: 'is-36', type: 'data', cells: ['Diluted', '80,977,561', '28,526,538', '67,375,487', '28,526,538'], bold: true }
      ]
    }
  },
  {
    id: 'cash_flows',
    name: 'Statement of Cash Flows',
    badge: '4 Cols',
    description: 'Operating, Investing & Financing activities with cash reconciliation',
    icon: Activity,
    color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50',
    block: {
      title: 'Consolidated Statements of Cash Flows',
      headers: ['Description / Line Item', 'Notes', 'Six Months Ended June 30, 2026', 'Six Months Ended June 30, 2025'],
      columnAlignments: ['left', 'center', 'right', 'right'],
      columnWidths: ['52%', '8%', '20%', '20%'],
      rows: [
        { id: 'cf-1', type: 'category_header', cells: ['Operating activities', '', '', ''], bold: true, shading: '#DAE9F7' },
        { id: 'cf-2', type: 'data', cells: ['Net loss for the period', '', '$(3,198,295)', '$(3,998,384)'] },
        { id: 'cf-3', type: 'data', cells: ['Depreciation and amortization', '5', '840,200', '620,100'] },
        { id: 'cf-4', type: 'data', cells: ['Share-based compensation', '9', '450,000', '310,000'] },
        { id: 'cf-5', type: 'data', cells: ['Changes in operating assets and liabilities', '', '(1,120,400)', '(850,200)'] },
        { id: 'cf-6', type: 'subtotal', cells: ['Cash used in operating activities', '', '(3,028,495)', '(3,918,484)'], bold: true, underline: true },
        { id: 'cf-7', type: 'category_header', cells: ['Investing activities', '', '', ''], bold: true, shading: '#DAE9F7' },
        { id: 'cf-8', type: 'data', cells: ['Purchase of equipment', '5', '(1,450,000)', '(620,000)'] },
        { id: 'cf-9', type: 'data', cells: ['Net sale (purchase) of marketable securities', '3', '(13,247,000)', '1,200,000'] },
        { id: 'cf-10', type: 'subtotal', cells: ['Cash used in investing activities', '', '(14,697,000)', '580,000'], bold: true, underline: true },
        { id: 'cf-11', type: 'category_header', cells: ['Financing activities', '', '', ''], bold: true, shading: '#DAE9F7' },
        { id: 'cf-12', type: 'data', cells: ['Proceeds from issuance of common shares, net', '9', '20,250,000', '4,500,000'] },
        { id: 'cf-13', type: 'data', cells: ['Proceeds from loans payable', '8', '3,730,388', '1,200,000'] },
        { id: 'cf-14', type: 'subtotal', cells: ['Cash provided by financing activities', '', '23,980,388', '5,700,000'], bold: true, underline: true },
        { id: 'cf-15', type: 'subtotal', cells: ['Net increase in cash and cash equivalents', '', '6,254,893', '2,361,516'], bold: true, underline: true },
        { id: 'cf-16', type: 'data', cells: ['Cash and cash equivalents, beginning of period', '', '5,980,366', '3,618,850'] },
        { id: 'cf-17', type: 'total', cells: ['Cash and cash equivalents, end of period', '', '$12,235,259', '$5,980,366'], bold: true, underline: true, doubleUnderline: true }
      ]
    }
  },
  {
    id: 'shareholders_equity',
    name: 'Shareholders’ Equity Matrix',
    badge: '5 Cols',
    description: 'Rollforward matrix: Common shares, Contributed surplus & Deficit',
    icon: PieChart,
    color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50',
    block: {
      title: 'Consolidated Statements of Changes in Shareholders’ Equity',
      headers: ['Description / Activity', 'Common Shares ($)', 'Contributed Surplus ($)', 'Deficit ($)', 'Total Equity ($)'],
      columnAlignments: ['left', 'right', 'right', 'right', 'right'],
      columnWidths: ['36%', '16%', '16%', '16%', '16%'],
      rows: [
        { id: 'se-1', type: 'data', cells: ['Balance, December 31, 2025', '38,200,000', '3,850,000', '(13,438,412)', '28,611,588'], bold: true },
        { id: 'se-2', type: 'data', cells: ['Shares issued for cash (private placement)', '19,500,000', '', '', '19,500,000'] },
        { id: 'se-3', type: 'data', cells: ['Share issue transaction costs', '(250,000)', '', '', '(250,000)'] },
        { id: 'se-4', type: 'data', cells: ['Stock-based compensation expense', '', '270,000', '', '270,000'] },
        { id: 'se-5', type: 'data', cells: ['Shares issued on warrant exercises', '1,000,000', '', '', '1,000,000'] },
        { id: 'se-6', type: 'data', cells: ['Net loss and comprehensive loss for period', '', '', '(3,198,295)', '(3,198,295)'] },
        { id: 'se-7', type: 'total', cells: ['Balance, June 30, 2026', '$58,450,000', '$4,120,000', '$(16,302,830)', '$46,267,170'], bold: true, underline: true, doubleUnderline: true }
      ]
    }
  },
  {
    id: 'note_schedule',
    name: 'Note Disclosure Schedule',
    badge: '4 Cols',
    description: 'Comparative schedule for loans, leases, receivables, or debt notes',
    icon: FileSpreadsheet,
    color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50',
    block: {
      title: 'Schedule of Financial Details',
      headers: ['Description / Category', 'Note Ref', 'June 30, 2026 ($)', 'December 31, 2025 ($)'],
      columnAlignments: ['left', 'center', 'right', 'right'],
      columnWidths: ['50%', '10%', '20%', '20%'],
      rows: [
        { id: 'ns-1', type: 'category_header', cells: ['Current period balances', '', '', ''], bold: true, shading: '#DAE9F7' },
        { id: 'ns-2', type: 'data', cells: ['Principal / Primary amount', '7', '4,250,000', '3,100,000'] },
        { id: 'ns-3', type: 'data', cells: ['Accrued interest and adjustments', '', '320,000', '180,000'] },
        { id: 'ns-4', type: 'data', cells: ['Unamortized discount / fees', '', '(70,000)', '(90,000)'] },
        { id: 'ns-5', type: 'total', cells: ['Carrying value at period end', '', '4,500,000', '3,190,000'], bold: true, underline: true, doubleUnderline: true }
      ]
    }
  },
  {
    id: 'blank_table',
    name: 'Blank / Custom Financial Table',
    badge: 'Custom',
    description: 'Clean 4-column multi-period grid ready for custom lines and headings',
    icon: Table,
    color: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-zinc-800',
    block: {
      title: 'Financial Statement Table',
      headers: ['Description / Line Item', 'Notes', 'Current Period', 'Prior Period'],
      columnAlignments: ['left', 'center', 'right', 'right'],
      columnWidths: ['50%', '10%', '20%', '20%'],
      rows: [
        { id: 'bt-1', type: 'category_header', cells: ['Category header', '', '', ''], bold: true, shading: '#DAE9F7' },
        { id: 'bt-2', type: 'data', cells: ['Line item description', '', '', ''], indent: 1 },
        { id: 'bt-3', type: 'total', cells: ['Total net', '', '', ''], bold: true, underline: true, doubleUnderline: true, indent: 2 }
      ]
    }
  }
];
