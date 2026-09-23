import React, { useRef, useEffect, useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Plus,
  AlertCircle,
  Tag,
  CheckSquare,
  Square,
  Upload,
  FolderArchive,
  Menu,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CornerDownRight
} from 'lucide-react';
import { MediaBucketModal } from './MediaBucketModal';
import { mediaBucketService } from '../../../services/mediaBucketService';
import { ZENATECH_LOGO_DATA_URL } from '../../../data/zenatechLogoAsset';
import type {
  SecBlock,
  SecHeadingBlock,
  SecParagraphBlock,
  SecFinancialTableBlock,
  SecCalloutBlock,
  SecSignatureBlock,
  SecDividerBlock,
  SecMetadataBlock,
  SecImageBlock,
  SecTableRow,
  SecBlockSpacing
} from '../../../types/secFiling';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../../../components/ui/dropdown-menu';

interface BlockItemProps {
  block: SecBlock;
  index: number;
  totalBlocks: number;
  isSelected: boolean;
  isMultiSelected?: boolean;
  onSelect: (e?: React.MouseEvent) => void;
  onToggleSelect?: (multiSelect: boolean) => void;
  onUpdate: (updates: Partial<SecBlock>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isDiffModified?: boolean;
  diffType?: 'added' | 'modified' | 'deleted' | 'unchanged';
  viewMode?: 'word' | 'blocks';
  globalSpacing?: SecBlockSpacing;
}

const BlockItemComponent: React.FC<BlockItemProps> = ({
  block,
  index,
  totalBlocks,
  isSelected,
  isMultiSelected = false,
  onSelect,
  onToggleSelect,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  diffType,
  viewMode = 'word',
  globalSpacing = 'normal'
}) => {
  const isWordMode = viewMode === 'word';
  const effectiveSpacing = block.spacing || globalSpacing;
  const currentSpacingTop = typeof block.spacingTop === 'number' ? block.spacingTop : 0;

  const isTextType = block.type === 'heading' || block.type === 'paragraph';
  const currentAlign = (block as any).alignment || 'left';
  const isBold = (block as any).bold !== false && ((block as any).bold === true || block.type === 'heading');
  const isItalic = !!(block as any).italic;
  const isUnderline = !!(block as any).underline;
  const currentColor = (block as any).color || (block.type === 'heading' ? '#0E2841' : '#111827');
  const currentFontSize =
    (block as any).fontSize ||
    (block.type === 'heading'
      ? (block as SecHeadingBlock).level === 1
        ? 20
        : (block as SecHeadingBlock).level === 2
        ? 16
        : 14.5
      : 14);

  const currentFontFamily = (block as any).fontFamily || 'Calibri, "Segoe UI", Arial, sans-serif';

  const spacingMarginClass =
    effectiveSpacing === 'compact'
      ? 'my-0.5 py-0'
      : effectiveSpacing === 'relaxed'
      ? 'my-2.5 py-0.5'
      : effectiveSpacing === 'loose'
      ? 'my-4 py-1'
      : 'my-1.5 py-0';

  const isHighlighted = isSelected || isMultiSelected;

  let wrapperClass = isWordMode
    ? `relative ${spacingMarginClass} rounded-sm transition-colors hover:bg-slate-50/70 dark:hover:bg-zinc-800/30`
    : `relative rounded-xl border border-slate-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900/90 shadow-xs ${spacingMarginClass}`;

  if (isHighlighted) {
    wrapperClass = isWordMode
      ? `relative ${spacingMarginClass} rounded-sm ring-2 ring-blue-500/70 bg-blue-50/25 dark:bg-blue-950/30`
      : `relative rounded-xl border border-blue-500 ring-2 ring-blue-500/30 shadow-md bg-blue-50/10 dark:bg-zinc-900 ${spacingMarginClass}`;
  } else if (diffType === 'added') {
    wrapperClass = `relative ${spacingMarginClass} border-l-4 border-emerald-500 bg-emerald-50/20 pl-2 rounded`;
  } else if (diffType === 'modified') {
    wrapperClass = `relative ${spacingMarginClass} border-l-4 border-amber-500 bg-amber-50/20 pl-2 rounded`;
  } else if (diffType === 'deleted') {
    wrapperClass = `relative ${spacingMarginClass} border-l-4 border-red-500 bg-red-50/20 pl-2 rounded opacity-60`;
  }

  const updateSpacingTop = (delta: number) => {
    const next = Math.max(-10, Math.min(120, currentSpacingTop + delta));
    onUpdate({ spacingTop: next });
  };

  const setDirectSpacingTop = (val: number) => {
    onUpdate({ spacingTop: Math.max(-10, Math.min(120, val)) });
  };

  const updateFontSize = (delta: number) => {
    const next = Math.max(8, Math.min(48, currentFontSize + delta));
    onUpdate({ fontSize: next } as any);
  };

  const setAlignment = (align: 'left' | 'center' | 'right' | 'justify') => {
    onUpdate({ alignment: align } as any);
  };

  const convertBlockType = (newType: 'h1' | 'h2' | 'h3' | 'paragraph') => {
    if (newType === 'paragraph') {
      onUpdate({
        type: 'paragraph',
        text: (block as any).text || '',
        bold: false,
        fontSize: 14
      } as any);
    } else {
      const level = newType === 'h1' ? 1 : newType === 'h2' ? 2 : 3;
      onUpdate({
        type: 'heading',
        level,
        text: (block as any).text || '',
        bold: true,
        fontSize: level === 1 ? 20 : level === 2 ? 16 : 14.5
      } as any);
    }
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          onToggleSelect ? onToggleSelect(true) : onSelect(e);
        } else {
          onSelect(e);
        }
      }}
      style={{
        marginTop: currentSpacingTop !== 0 ? `${currentSpacingTop}px` : undefined
      }}
      className={`group ${wrapperClass}`}
    >
      {/* Visual Top Gap Spacer Indicator (Only when clicked into the block and custom spacing is set) */}
      {currentSpacingTop !== 0 && isHighlighted && (
        <div
          className="w-full absolute -top-5 inset-x-0 h-5 flex items-center justify-center select-none z-20 pointer-events-auto"
        >
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px border-t border-dashed border-blue-400/50" />
          <div className="relative z-10 flex items-center gap-1 bg-white dark:bg-zinc-900 border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 px-1.5 py-0.2 rounded-full text-[9px] font-mono shadow-xs">
            <span>↑ {currentSpacingTop}px gap</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                updateSpacingTop(-2);
              }}
              className="hover:text-blue-800 font-bold px-0.5"
              title="Decrease gap (-2px)"
            >
              -
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                updateSpacingTop(2);
              }}
              className="hover:text-blue-800 font-bold px-0.5"
              title="Increase gap (+2px)"
            >
              +
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDirectSpacingTop(0);
              }}
              className="text-slate-400 hover:text-red-500 pl-0.5 font-bold"
              title="Reset gap to 0"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Floating Rich Formatting Toolbar (Appears ONLY when clicked into the box / selected) */}
      {isHighlighted && (
        <div
          className="absolute right-1 -top-8.5 z-40 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 shadow-xl text-xs select-none pointer-events-auto animate-in fade-in zoom-in-95 duration-100"
        >
        {/* Selection Checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect ? onToggleSelect(true) : onSelect(e);
          }}
          title={isMultiSelected ? 'Deselect block (Part of Multi-Selection)' : 'Select block (Hold Shift/Ctrl for Multiple)'}
          className={`p-0.5 rounded flex items-center justify-center transition-colors ${
            isMultiSelected
              ? 'text-blue-600 font-bold'
              : 'text-slate-400 hover:text-blue-600'
          }`}
        >
          {isMultiSelected ? (
            <CheckSquare className="w-3.5 h-3.5 text-blue-600 fill-blue-50" />
          ) : (
            <Square className="w-3.5 h-3.5" />
          )}
        </button>

        <div className="h-3.5 w-px bg-slate-200 dark:bg-zinc-700 mx-0.5" />

        {/* Block Type & Heading Level Selector */}
        {isTextType ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                title="Change Text Style (H1, H2, H3, Paragraph)"
                className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-slate-100 hover:bg-blue-50 text-blue-700 dark:bg-zinc-800 dark:text-blue-400 flex items-center gap-1 transition-colors"
              >
                <span>
                  {block.type === 'heading'
                    ? `H${(block as SecHeadingBlock).level || 1}`
                    : '¶'}
                </span>
                <span className="text-[9px] font-normal normal-case text-slate-500">
                  {block.type === 'heading'
                    ? `Heading ${(block as SecHeadingBlock).level}`
                    : 'Paragraph'}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 p-1 text-xs">
              <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Text Style & Level
              </div>
              <DropdownMenuItem
                onClick={() => convertBlockType('h1')}
                className="flex items-center justify-between text-xs py-1.5 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#0E2841]">H1</span>
                  <span className="font-bold text-sm">Document Title (20pt)</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => convertBlockType('h2')}
                className="flex items-center justify-between text-xs py-1.5 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#0E2841]">H2</span>
                  <span className="font-bold text-xs">Statement Header (16pt)</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => convertBlockType('h3')}
                className="flex items-center justify-between text-xs py-1.5 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#0E2841]">H3</span>
                  <span className="font-semibold text-xs">Section Subtitle (14pt)</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => convertBlockType('paragraph')}
                className="flex items-center justify-between text-xs py-1.5 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">¶</span>
                  <span>Standard Paragraph (14pt)</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="text-[9px] font-mono uppercase font-bold text-slate-500 px-1">
            {block.type.replace('_', ' ')}
          </span>
        )}

        {/* Text Formatting Controls */}
        {isTextType && (
          <>
            <div className="h-3.5 w-px bg-slate-200 dark:bg-zinc-700 mx-0.5" />

            {/* Font Family Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  title="Change Font Family"
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors max-w-[80px] truncate"
                >
                  {currentFontFamily.split(',')[0].replace(/"/g, '')}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-44 p-1 text-xs">
                <div className="px-2 py-0.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                  Font Family
                </div>
                {[
                  { name: 'Calibri (Word Standard)', family: 'Calibri, "Segoe UI", Arial, sans-serif' },
                  { name: 'Aptos (Modern Office)', family: 'Aptos, "Segoe UI", sans-serif' },
                  { name: 'Arial (Clean Sans)', family: 'Arial, Helvetica, sans-serif' },
                  { name: 'Times New Roman (Formal)', family: '"Times New Roman", Times, serif' },
                  { name: 'Georgia (Editorial)', family: 'Georgia, serif' },
                  { name: 'Garamond (Executive)', family: 'Garamond, "EB Garamond", serif' },
                  { name: 'Courier New (Monospace)', family: '"Courier New", Courier, monospace' }
                ].map((f) => (
                  <DropdownMenuItem
                    key={f.family}
                    onClick={() => onUpdate({ fontFamily: f.family } as any)}
                    className="flex items-center justify-between text-xs py-1.5 cursor-pointer"
                    style={{ fontFamily: f.family }}
                  >
                    <span>{f.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Font Size Stepper & Dropdown */}
            <div className="flex items-center bg-slate-100 dark:bg-zinc-800 rounded px-1 py-0.2 text-[9px] font-mono border border-slate-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateFontSize(-1);
                }}
                title="Decrease font size (-1pt)"
                className="px-0.5 hover:text-blue-600 font-bold"
              >
                -
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    title="Font Size"
                    className="px-1 font-semibold text-slate-700 dark:text-zinc-200 hover:text-blue-600"
                  >
                    {currentFontSize}pt
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-28 p-1 text-xs">
                  <div className="px-2 py-0.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                    Font Size
                  </div>
                  {[9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32].map((size) => (
                    <DropdownMenuItem
                      key={size}
                      onClick={() => onUpdate({ fontSize: size } as any)}
                      className={`text-xs py-1 cursor-pointer ${
                        currentFontSize === size ? 'font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/50' : ''
                      }`}
                    >
                      <span>{size} pt</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateFontSize(1);
                }}
                title="Increase font size (+1pt)"
                className="px-0.5 hover:text-blue-600 font-bold"
              >
                +
              </button>
            </div>

            <div className="h-3.5 w-px bg-slate-200 dark:bg-zinc-700 mx-0.5" />

            {/* Bold */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({ bold: !isBold } as any);
              }}
              title="Toggle Bold"
              className={`p-1 rounded transition-colors ${
                isBold
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Bold className="w-3 h-3" />
            </button>

            {/* Italic */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({ italic: !isItalic } as any);
              }}
              title="Toggle Italic"
              className={`p-1 rounded transition-colors ${
                isItalic
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Italic className="w-3 h-3" />
            </button>

            {/* Underline */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({ underline: !isUnderline } as any);
              }}
              title="Toggle Underline"
              className={`p-1 rounded transition-colors ${
                isUnderline
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Underline className="w-3 h-3" />
            </button>

            <div className="h-3.5 w-px bg-slate-200 dark:bg-zinc-700 mx-0.5" />

            {/* Direct Alignment Buttons (Left, Center, Right, Justify) */}
            <div className="flex items-center bg-slate-100 dark:bg-zinc-800 rounded p-0.5 gap-0.5 border border-slate-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAlignment('left');
                }}
                title="Align Left"
                className={`p-1 rounded transition-colors ${
                  currentAlign === 'left' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700'
                }`}
              >
                <AlignLeft className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAlignment('center');
                }}
                title="Align Center"
                className={`p-1 rounded transition-colors ${
                  currentAlign === 'center' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700'
                }`}
              >
                <AlignCenter className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAlignment('right');
                }}
                title="Align Right"
                className={`p-1 rounded transition-colors ${
                  currentAlign === 'right' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700'
                }`}
              >
                <AlignRight className="w-3 h-3" />
              </button>
              {block.type === 'paragraph' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAlignment('justify');
                  }}
                  title="Justify"
                  className={`p-1 rounded transition-colors ${
                    currentAlign === 'justify' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700'
                  }`}
                >
                  <AlignJustify className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Font Color Picker */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  title="Change Font Color"
                  className="p-1 rounded flex items-center gap-0.5 hover:bg-slate-100 dark:hover:bg-zinc-800"
                >
                  <span
                    className="w-3 h-3 rounded-full border border-slate-300 dark:border-zinc-700 shadow-2xs"
                    style={{ backgroundColor: currentColor }}
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-44 p-1.5 text-xs">
                <div className="px-2 py-0.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                  Text Color
                </div>
                {[
                  { name: 'Corporate Navy', color: '#0E2841' },
                  { name: 'Charcoal Black', color: '#111827' },
                  { name: 'Muted Slate', color: '#64748B' },
                  { name: 'Executive Blue', color: '#2563EB' },
                  { name: 'Alert Red', color: '#DC2626' },
                  { name: 'Success Green', color: '#16A34A' },
                  { name: 'Warm Amber', color: '#B45309' }
                ].map((c) => (
                  <DropdownMenuItem
                    key={c.color}
                    onClick={() => onUpdate({ color: c.color } as any)}
                    className="flex items-center justify-between text-xs py-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-200" style={{ backgroundColor: c.color }} />
                      <span>{c.name}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <div className="p-1 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Custom Color</span>
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => onUpdate({ color: e.target.value } as any)}
                    className="w-6 h-6 p-0 border border-slate-300 rounded cursor-pointer"
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        {/* Picture / Image Specific Floating Controls */}
        {block.type === 'image' && (
          <>
            {/* Image Alignment */}
            <div className="flex items-center bg-slate-100 dark:bg-zinc-800 rounded p-0.5 gap-0.5 border border-slate-200 dark:border-zinc-700">
              {(['left', 'center', 'right'] as const).map((al) => (
                <button
                  key={al}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate({ alignment: al } as any);
                  }}
                  title={`Align ${al.charAt(0).toUpperCase() + al.slice(1)}`}
                  className={`p-1 rounded transition-colors ${
                    ((block as SecImageBlock).alignment || 'center') === al
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700'
                  }`}
                >
                  {al === 'left' ? (
                    <AlignLeft className="w-3 h-3" />
                  ) : al === 'center' ? (
                    <AlignCenter className="w-3 h-3" />
                  ) : (
                    <AlignRight className="w-3 h-3" />
                  )}
                </button>
              ))}
            </div>

            {/* Image Width Presets */}
            <div className="flex items-center bg-slate-100 dark:bg-zinc-800 rounded px-1 py-0.2 text-[9px] font-mono border border-slate-200 dark:border-zinc-700">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    title="Change Image Width"
                    className="px-1 font-bold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>
                      {(block as SecImageBlock).width
                        ? `${(block as SecImageBlock).width}px`
                        : '260px'}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-36 p-1 text-xs">
                  <div className="px-2 py-0.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                    Picture Width
                  </div>
                  {[
                    { px: 120, label: '120px (Icon)' },
                    { px: 180, label: '180px (Small)' },
                    { px: 260, label: '260px (Standard Logo)' },
                    { px: 360, label: '360px (Medium)' },
                    { px: 480, label: '480px (Large)' },
                    { px: 650, label: '650px (Full Page)' }
                  ].map((w) => (
                    <DropdownMenuItem
                      key={w.px}
                      onClick={() => onUpdate({ width: w.px } as any)}
                      className={`text-xs py-1 cursor-pointer ${
                        ((block as SecImageBlock).width || 260) === w.px
                          ? 'font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/50'
                          : ''
                      }`}
                    >
                      {w.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}

        <div className="h-3.5 w-px bg-slate-200 dark:bg-zinc-700 mx-0.5" />

        {/* Per-Block Number Spacing Stepper & Dropdown */}
        <div className="flex items-center bg-slate-100 dark:bg-zinc-800 rounded px-1 py-0.2 text-[9px] font-mono border border-slate-200 dark:border-zinc-700">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              updateSpacingTop(-2);
            }}
            disabled={currentSpacingTop <= -10}
            title="Decrease top gap (-2px)"
            className="px-0.5 hover:text-blue-600 disabled:opacity-30 font-bold"
          >
            -
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                title="Top Spacing (gap above this block)"
                className="px-1 font-bold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <span>{currentSpacingTop}px</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 p-1 text-xs">
              <div className="px-2 py-1 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                Top Spacing Gap
              </div>
              {[
                { px: -4, label: '-4px', desc: 'Ultra Close' },
                { px: -2, label: '-2px', desc: 'Very Close (Subtitle)' },
                { px: 0, label: '0px', desc: 'Flush (Connected)' },
                { px: 2, label: '2px', desc: 'Hairline Gap' },
                { px: 4, label: '4px', desc: 'Tight Gap' },
                { px: 8, label: '8px', desc: 'Normal Gap' },
                { px: 12, label: '12px', desc: 'Moderate Gap' },
                { px: 16, label: '16px', desc: 'Section Gap' },
                { px: 24, label: '24px', desc: 'Large Gap' },
                { px: 32, label: '32px', desc: 'Major Break' }
              ].map((opt) => (
                <DropdownMenuItem
                  key={opt.px}
                  onClick={() => setDirectSpacingTop(opt.px)}
                  className={`flex items-center justify-between text-xs py-1 cursor-pointer ${
                    currentSpacingTop === opt.px ? 'font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/50' : ''
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className="text-[10px] text-slate-400">{opt.desc}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              updateSpacingTop(2);
            }}
            disabled={currentSpacingTop >= 120}
            title="Increase top gap (+2px)"
            className="px-0.5 hover:text-blue-600 disabled:opacity-30 font-bold"
          >
            +
          </button>
        </div>

        <div className="h-3.5 w-px bg-slate-200 dark:bg-zinc-700 mx-0.5" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={index === 0}
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          title="Move Up in Document"
          className="h-5 w-5 text-slate-500 hover:text-blue-600 disabled:opacity-20"
        >
          <ChevronUp className="w-3 h-3" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={index === totalBlocks - 1}
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          title="Move Down in Document"
          className="h-5 w-5 text-slate-500 hover:text-blue-600 disabled:opacity-20"
        >
          <ChevronDown className="w-3 h-3" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          title="Duplicate Block"
          className="h-5 w-5 text-slate-500 hover:text-blue-600"
        >
          <Copy className="w-3 h-3" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete Block"
          className="h-5 w-5 text-slate-500 hover:text-red-600"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
      )}

      {/* Block Content Editor */}
      <div className="w-full">
        {block.type === 'heading' && (
          <HeadingBlockEditor
            block={block as SecHeadingBlock}
            onUpdate={(u) => onUpdate(u)}
          />
        )}

        {block.type === 'paragraph' && (
          <ParagraphBlockEditor
            block={block as SecParagraphBlock}
            onUpdate={(u) => onUpdate(u)}
          />
        )}

        {block.type === 'financial_table' && (
          <FinancialTableBlockEditor
            block={block as SecFinancialTableBlock}
            onUpdate={(u) => onUpdate(u)}
          />
        )}

        {block.type === 'callout' && (
          <CalloutBlockEditor
            block={block as SecCalloutBlock}
            onUpdate={(u) => onUpdate(u)}
          />
        )}

        {block.type === 'signature' && (
          <SignatureBlockEditor
            block={block as SecSignatureBlock}
            onUpdate={(u) => onUpdate(u)}
          />
        )}

        {block.type === 'divider' && (
          <DividerBlockEditor
            block={block as SecDividerBlock}
            onUpdate={(u) => onUpdate(u)}
          />
        )}

        {block.type === 'metadata' && (
          <MetadataBlockEditor
            block={block as SecMetadataBlock}
            onUpdate={(u) => onUpdate(u)}
            isWordMode={isWordMode}
          />
        )}

        {block.type === 'image' && (
          <ImageBlockEditor
            block={block as SecImageBlock}
            onUpdate={(u) => onUpdate(u)}
          />
        )}
      </div>
    </div>
  );
};

export const BlockItem = React.memo(BlockItemComponent, (prev, next) => {
  return (
    prev.block === next.block &&
    prev.isSelected === next.isSelected &&
    prev.isMultiSelected === next.isMultiSelected &&
    prev.diffType === next.diffType &&
    prev.viewMode === next.viewMode &&
    prev.globalSpacing === next.globalSpacing &&
    prev.index === next.index &&
    prev.totalBlocks === next.totalBlocks
  );
});

/* ------------------------------------------------------------------------- */
/* 1. HEADING BLOCK EDITOR                                                   */
/* ------------------------------------------------------------------------- */
const HeadingBlockEditor: React.FC<{
  block: SecHeadingBlock;
  onUpdate: (u: Partial<SecHeadingBlock>) => void;
}> = ({ block, onUpdate }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localText, setLocalText] = useState(block.text);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    setLocalText(block.text);
  }, [block.text]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalText(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdate({ text: val });
    }, 250);
  };

  const handleBlur = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (localText !== block.text) {
      onUpdate({ text: localText });
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [localText, block.fontSize, block.fontFamily]);

  const defaultFontSize =
    block.level === 1 ? 20 : block.level === 2 ? 16 : block.level === 3 ? 14.5 : 13.5;
  const effectiveFontSize = block.fontSize || defaultFontSize;

  return (
    <div className="group/head relative m-0 p-0">
      <textarea
        ref={textareaRef}
        rows={1}
        value={localText}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Section Title..."
        style={{
          color: block.color || '#0E2841',
          fontFamily: block.fontFamily || 'Calibri, "Segoe UI", Arial, sans-serif',
          fontSize: `${effectiveFontSize}px`,
          textAlign: block.alignment || 'left',
          textDecoration: block.underline ? 'underline' : 'none',
          fontStyle: block.italic ? 'italic' : 'normal',
          fontWeight: block.bold !== false ? 'bold' : 'normal',
          lineHeight: block.lineSpacing ? `${block.lineSpacing}` : '1.2'
        }}
        className="w-full bg-transparent border-none focus:outline-none focus:bg-blue-50/20 dark:focus:bg-blue-950/20 rounded px-1 py-0 transition-colors resize-none overflow-hidden m-0 p-0"
      />
    </div>
  );
};

/* ------------------------------------------------------------------------- */
/* 2. PARAGRAPH BLOCK EDITOR (Word Body Text)                                */
/* ------------------------------------------------------------------------- */
const ParagraphBlockEditor: React.FC<{
  block: SecParagraphBlock;
  onUpdate: (u: Partial<SecParagraphBlock>) => void;
}> = ({ block, onUpdate }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localText, setLocalText] = useState(block.text);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    setLocalText(block.text);
  }, [block.text]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalText(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdate({ text: val });
    }, 250);
  };

  const handleBlur = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (localText !== block.text) {
      onUpdate({ text: localText });
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [localText, block.fontSize, block.fontFamily]);

  const effectiveFontSize = block.fontSize || 14;

  return (
    <div className="relative group/p m-0 p-0">
      <textarea
        ref={textareaRef}
        rows={1}
        value={localText}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Enter document paragraph text..."
        style={{
          color: block.color || (block.bold ? '#0E2841' : '#111827'),
          fontFamily: block.fontFamily || 'Calibri, "Segoe UI", Arial, sans-serif',
          fontSize: `${effectiveFontSize}px`,
          textAlign: block.alignment || 'left',
          textDecoration: block.underline ? 'underline' : 'none',
          fontStyle: block.italic ? 'italic' : 'normal',
          fontWeight: block.bold ? 'bold' : 'normal',
          lineHeight: block.lineSpacing ? `${block.lineSpacing}` : '1.3'
        }}
        className="w-full bg-transparent border-none focus:outline-none focus:bg-blue-50/15 dark:focus:bg-blue-950/20 rounded px-1 py-0 transition-colors resize-none overflow-hidden m-0 p-0"
      />
    </div>
  );
};

/* ------------------------------------------------------------------------- */
/* 3. FINANCIAL STATEMENT TABLE EDITOR (Authentic Word Financial Table)       */
/* ------------------------------------------------------------------------- */
const FinancialTableBlockEditor: React.FC<{
  block: SecFinancialTableBlock;
  onUpdate: (u: Partial<SecFinancialTableBlock>) => void;
}> = ({ block, onUpdate }) => {
  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const nextRows = [...block.rows];
    const targetRow = { ...nextRows[rowIndex] };
    const nextCells = [...targetRow.cells];
    nextCells[colIndex] = value;
    targetRow.cells = nextCells;
    nextRows[rowIndex] = targetRow;
    onUpdate({ rows: nextRows });
  };

  const handleHeaderChange = (colIndex: number, value: string) => {
    const nextHeaders = [...block.headers];
    nextHeaders[colIndex] = value;
    onUpdate({ headers: nextHeaders });
  };

  const addRow = (type: SecTableRow['type'] = 'data') => {
    addRowAt(block.rows.length, type);
  };

  const addRowAt = (targetIdx: number, type: SecTableRow['type'] = 'data') => {
    const newRow: SecTableRow = {
      id: `r-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      cells: block.headers.map(() => ''),
      bold: type === 'total' || type === 'section_title',
      doubleUnderline: type === 'total',
      underline: type === 'subtotal' || type === 'total',
      shading: type === 'section_title' ? '#DAE9F7' : undefined
    };
    const nextRows = [...block.rows];
    const safeIdx = Math.max(0, Math.min(targetIdx, nextRows.length));
    nextRows.splice(safeIdx, 0, newRow);
    onUpdate({ rows: nextRows });
  };

  const moveRow = (rowIndex: number, direction: 'up' | 'down') => {
    if (direction === 'up' && rowIndex === 0) return;
    if (direction === 'down' && rowIndex === block.rows.length - 1) return;
    const targetIdx = direction === 'up' ? rowIndex - 1 : rowIndex + 1;
    const nextRows = [...block.rows];
    const [moved] = nextRows.splice(rowIndex, 1);
    nextRows.splice(targetIdx, 0, moved);
    onUpdate({ rows: nextRows });
  };

  const duplicateRow = (rowIndex: number) => {
    const source = block.rows[rowIndex];
    const duplicated: SecTableRow = {
      ...source,
      id: `r-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      cells: [...source.cells]
    };
    const nextRows = [...block.rows];
    nextRows.splice(rowIndex + 1, 0, duplicated);
    onUpdate({ rows: nextRows });
  };

  const deleteRow = (rowIndex: number) => {
    const nextRows = block.rows.filter((_, i) => i !== rowIndex);
    onUpdate({ rows: nextRows });
  };

  const addColumn = () => {
    addColumnAt(block.headers.length, 'New Period ($)', 'right');
  };

  const addColumnAt = (
    targetIdx: number,
    headerName = 'New Period ($)',
    align: 'left' | 'center' | 'right' = 'right'
  ) => {
    const nextHeaders = [...block.headers];
    const nextAligns = [...block.columnAlignments];
    const safeIdx = Math.max(0, Math.min(targetIdx, nextHeaders.length));

    nextHeaders.splice(safeIdx, 0, headerName);
    nextAligns.splice(safeIdx, 0, align);

    const nextRows = block.rows.map((r) => {
      const nextCells = [...r.cells];
      nextCells.splice(safeIdx, 0, '');
      return { ...r, cells: nextCells };
    });

    onUpdate({
      headers: nextHeaders,
      columnAlignments: nextAligns,
      rows: nextRows
    });
  };

  const moveColumn = (colIndex: number, direction: 'left' | 'right') => {
    if (direction === 'left' && colIndex === 0) return;
    if (direction === 'right' && colIndex === block.headers.length - 1) return;
    const targetIdx = direction === 'left' ? colIndex - 1 : colIndex + 1;

    const nextHeaders = [...block.headers];
    const [movedHeader] = nextHeaders.splice(colIndex, 1);
    nextHeaders.splice(targetIdx, 0, movedHeader);

    const nextAligns = [...block.columnAlignments];
    const [movedAlign] = nextAligns.splice(colIndex, 1);
    nextAligns.splice(targetIdx, 0, movedAlign);

    const nextRows = block.rows.map((r) => {
      const nextCells = [...r.cells];
      const [movedCell] = nextCells.splice(colIndex, 1);
      nextCells.splice(targetIdx, 0, movedCell);
      return { ...r, cells: nextCells };
    });

    onUpdate({
      headers: nextHeaders,
      columnAlignments: nextAligns,
      rows: nextRows
    });
  };

  const duplicateColumn = (colIndex: number) => {
    const nextHeaders = [...block.headers];
    const nextAligns = [...block.columnAlignments];
    const currentHeader = block.headers[colIndex];
    const currentAlign = block.columnAlignments[colIndex] || 'right';

    nextHeaders.splice(colIndex + 1, 0, `${currentHeader} (Copy)`);
    nextAligns.splice(colIndex + 1, 0, currentAlign);

    const nextRows = block.rows.map((r) => {
      const nextCells = [...r.cells];
      nextCells.splice(colIndex + 1, 0, r.cells[colIndex] || '');
      return { ...r, cells: nextCells };
    });

    onUpdate({
      headers: nextHeaders,
      columnAlignments: nextAligns,
      rows: nextRows
    });
  };

  const deleteColumn = (colIndex: number) => {
    if (block.headers.length <= 1) {
      return;
    }
    const nextHeaders = block.headers.filter((_, i) => i !== colIndex);
    const nextAligns = block.columnAlignments.filter((_, i) => i !== colIndex);
    const nextRows = block.rows.map((r) => ({
      ...r,
      cells: r.cells.filter((_, i) => i !== colIndex)
    }));
    onUpdate({
      headers: nextHeaders,
      columnAlignments: nextAligns,
      rows: nextRows
    });
  };

  const setColumnAlignment = (colIndex: number, align: 'left' | 'center' | 'right') => {
    const nextAligns = [...block.columnAlignments];
    nextAligns[colIndex] = align;
    onUpdate({ columnAlignments: nextAligns });
  };

  const toggleRowIndent = (rowIndex: number) => {
    const nextRows = [...block.rows];
    const r = { ...nextRows[rowIndex] };
    const current = r.indent || 0;
    r.indent = current >= 2 ? 0 : current + 1;
    nextRows[rowIndex] = r;
    onUpdate({ rows: nextRows });
  };

  const setRowType = (rowIndex: number, type: SecTableRow['type']) => {
    const nextRows = [...block.rows];
    const r = { ...nextRows[rowIndex] };
    r.type = type;
    r.bold = type === 'total' || type === 'section_title';
    r.doubleUnderline = type === 'total';
    r.underline = type === 'subtotal' || type === 'total';
    if (type === 'section_title' && !r.shading) {
      r.shading = '#DAE9F7';
    } else if (type !== 'section_title' && r.shading === '#DAE9F7') {
      r.shading = undefined;
    }
    nextRows[rowIndex] = r;
    onUpdate({ rows: nextRows });
  };

  return (
    <div
      className="my-3 space-y-1 font-sans"
      style={{ fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif' }}
    >
      {/* Table Title and Quick Add Controls */}
      <div className="flex items-center justify-between gap-2 opacity-60 hover:opacity-100 transition-opacity pb-0.5">
        <span className="text-[11px] font-bold text-[#0E2841] tracking-wide">
          {block.title || 'Financial Schedule'}
        </span>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => addRow('data')}
            className="h-5 text-[10px] gap-1 px-1.5 text-blue-700 hover:bg-blue-50"
          >
            <Plus className="w-3 h-3" />
            <span>Add Row</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addColumn}
            className="h-5 text-[10px] gap-1 px-1.5 text-blue-700 hover:bg-blue-50"
          >
            <Plus className="w-3 h-3" />
            <span>Add Column</span>
          </Button>
        </div>
      </div>

      {/* Authentic Word Financial Table Grid */}
      <div className="overflow-x-auto w-full my-1">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr
              style={{ backgroundColor: block.headerShading || '#CCECFF' }}
              className="border-t border-b-2 border-slate-900 text-[#0E2841]"
            >
              {/* Left Sandwich Bar Column Header */}
              <th className="w-7 min-w-[28px] max-w-[28px] p-1 text-center font-normal text-[10px] text-slate-400">
                #
              </th>

              {block.headers.map((header, colIdx) => {
                const align = block.columnAlignments[colIdx] || 'left';
                const isFirst = colIdx === 0;

                return (
                  <th
                    key={colIdx}
                    className={`p-1 font-bold text-[#0E2841] text-${align} group/col relative ${
                      isFirst ? 'min-w-[220px] w-2/5' : 'min-w-[70px]'
                    }`}
                  >
                    <div className="flex items-center gap-1 justify-between">
                      <input
                        type="text"
                        value={header}
                        onChange={(e) => handleHeaderChange(colIdx, e.target.value)}
                        className={`w-full bg-transparent font-bold text-[#0E2841] text-${align} hover:bg-white/60 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                      />

                      {/* Column Sandwich Menu Button */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            title="Column Actions: Add Left/Right, Move Left/Right, Align, Delete"
                            className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-blue-700 hover:bg-white/80 transition-colors opacity-0 group-hover/col:opacity-100 shrink-0"
                          >
                            <Menu className="w-3 h-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 p-1 text-xs font-normal">
                          <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Column {colIdx + 1} Actions
                          </div>

                          {/* Add Column Left */}
                          <DropdownMenuItem
                            onClick={() => addColumnAt(colIdx, 'New Column', align)}
                            className="flex items-center gap-2 py-1.5 cursor-pointer text-blue-600 dark:text-blue-400 font-medium"
                          >
                            <div className="flex items-center">
                              <Plus className="w-3.5 h-3.5" />
                              <ArrowLeft className="w-3 h-3 -ml-0.5" />
                            </div>
                            <span>Add Column Left</span>
                          </DropdownMenuItem>

                          {/* Add Column Right */}
                          <DropdownMenuItem
                            onClick={() => addColumnAt(colIdx + 1, 'New Column', align)}
                            className="flex items-center gap-2 py-1.5 cursor-pointer text-blue-600 dark:text-blue-400 font-medium"
                          >
                            <div className="flex items-center">
                              <Plus className="w-3.5 h-3.5" />
                              <ArrowRight className="w-3 h-3 -ml-0.5" />
                            </div>
                            <span>Add Column Right</span>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {/* Move Column Left */}
                          <DropdownMenuItem
                            disabled={colIdx === 0}
                            onClick={() => moveColumn(colIdx, 'left')}
                            className="flex items-center gap-2 py-1.5 cursor-pointer disabled:opacity-40"
                          >
                            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                            <span>Move Column Left</span>
                          </DropdownMenuItem>

                          {/* Move Column Right */}
                          <DropdownMenuItem
                            disabled={colIdx === block.headers.length - 1}
                            onClick={() => moveColumn(colIdx, 'right')}
                            className="flex items-center gap-2 py-1.5 cursor-pointer disabled:opacity-40"
                          >
                            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                            <span>Move Column Right</span>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {/* Duplicate Column */}
                          <DropdownMenuItem
                            onClick={() => duplicateColumn(colIdx)}
                            className="flex items-center gap-2 py-1.5 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Duplicate Column</span>
                          </DropdownMenuItem>

                          {/* Column Alignment */}
                          <div className="px-2 py-1 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                            Alignment
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1">
                            <button
                              type="button"
                              onClick={() => setColumnAlignment(colIdx, 'left')}
                              className={`flex-1 p-1 rounded text-center transition-colors flex items-center justify-center ${
                                align === 'left' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200'
                              }`}
                              title="Align Left"
                            >
                              <AlignLeft className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setColumnAlignment(colIdx, 'center')}
                              className={`flex-1 p-1 rounded text-center transition-colors flex items-center justify-center ${
                                align === 'center' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200'
                              }`}
                              title="Align Center"
                            >
                              <AlignCenter className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setColumnAlignment(colIdx, 'right')}
                              className={`flex-1 p-1 rounded text-center transition-colors flex items-center justify-center ${
                                align === 'right' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200'
                              }`}
                              title="Align Right"
                            >
                              <AlignRight className="w-3 h-3" />
                            </button>
                          </div>

                          <DropdownMenuSeparator />

                          {/* Delete Column */}
                          <DropdownMenuItem
                            disabled={block.headers.length <= 1}
                            onClick={() => deleteColumn(colIdx)}
                            className="flex items-center gap-2 py-1.5 cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 disabled:opacity-40"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            <span>Delete Column</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIdx) => {
              const isSection = row.type === 'section_title';
              const isSubtotal = row.type === 'subtotal';
              const isTotal = row.type === 'total';

              let rowClass = 'hover:bg-blue-50/20 dark:hover:bg-zinc-800/40';
              if (row.shading) {
                // custom row shading
              } else if (isTotal) {
                rowClass = 'font-bold bg-slate-50/40';
              } else if (isSubtotal) {
                rowClass = 'font-semibold';
              } else if (isSection) {
                rowClass = 'bg-[#DAE9F7] font-bold text-[#0E2841]';
              }

              return (
                <tr
                  key={row.id || rowIdx}
                  style={row.shading ? { backgroundColor: row.shading } : undefined}
                  className={`group/row transition-colors ${rowClass}`}
                >
                  {/* Left Sandwich Bar Menu Handle */}
                  <td className="w-7 min-w-[28px] max-w-[28px] py-0.5 px-0.5 text-center align-middle select-none">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          title="Row Actions: Add Above/Below, Move Up/Down, Style, Delete"
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-zinc-800 transition-colors mx-auto group-hover/row:text-slate-600"
                        >
                          <Menu className="w-3.5 h-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56 p-1 text-xs">
                        <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Row {rowIdx + 1} Actions
                        </div>

                        {/* Add Row Above */}
                        <DropdownMenuItem
                          onClick={() => addRowAt(rowIdx, 'data')}
                          className="flex items-center gap-2 py-1.5 cursor-pointer text-blue-600 dark:text-blue-400 font-medium"
                        >
                          <div className="flex items-center">
                            <Plus className="w-3.5 h-3.5" />
                            <ArrowUp className="w-3 h-3 -ml-0.5" />
                          </div>
                          <span>Add Row Above</span>
                        </DropdownMenuItem>

                        {/* Add Row Below */}
                        <DropdownMenuItem
                          onClick={() => addRowAt(rowIdx + 1, 'data')}
                          className="flex items-center gap-2 py-1.5 cursor-pointer text-blue-600 dark:text-blue-400 font-medium"
                        >
                          <div className="flex items-center">
                            <Plus className="w-3.5 h-3.5" />
                            <ArrowDown className="w-3 h-3 -ml-0.5" />
                          </div>
                          <span>Add Row Below</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* Move Row Up */}
                        <DropdownMenuItem
                          disabled={rowIdx === 0}
                          onClick={() => moveRow(rowIdx, 'up')}
                          className="flex items-center gap-2 py-1.5 cursor-pointer disabled:opacity-40"
                        >
                          <ArrowUp className="w-3.5 h-3.5 text-slate-500" />
                          <span>Move Row Up</span>
                        </DropdownMenuItem>

                        {/* Move Row Down */}
                        <DropdownMenuItem
                          disabled={rowIdx === block.rows.length - 1}
                          onClick={() => moveRow(rowIdx, 'down')}
                          className="flex items-center gap-2 py-1.5 cursor-pointer disabled:opacity-40"
                        >
                          <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
                          <span>Move Row Down</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* Duplicate Row */}
                        <DropdownMenuItem
                          onClick={() => duplicateRow(rowIdx)}
                          className="flex items-center gap-2 py-1.5 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Duplicate Row</span>
                        </DropdownMenuItem>

                        {/* Indent Line Item */}
                        <DropdownMenuItem
                          onClick={() => toggleRowIndent(rowIdx)}
                          className="flex items-center gap-2 py-1.5 cursor-pointer"
                        >
                          <CornerDownRight className="w-3.5 h-3.5 text-slate-500" />
                          <span>Indent Line Item ({row.indent ? `Indent ${row.indent}` : 'No Indent'})</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* Row Format Type */}
                        <div className="px-2 py-0.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                          Row Style
                        </div>
                        {[
                          { type: 'data' as const, label: 'Data Line Item' },
                          { type: 'section_title' as const, label: 'Section Header (#DAE9F7)' },
                          { type: 'subtotal' as const, label: 'Subtotal (Bordered)' },
                          { type: 'total' as const, label: 'Total Net (Double Underline)' },
                          { type: 'blank' as const, label: 'Blank Spacer' }
                        ].map((styleOpt) => (
                          <DropdownMenuItem
                            key={styleOpt.type}
                            onClick={() => setRowType(rowIdx, styleOpt.type)}
                            className={`flex items-center justify-between text-xs py-1 cursor-pointer ${
                              row.type === styleOpt.type ? 'font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/50' : ''
                            }`}
                          >
                            <span>{styleOpt.label}</span>
                          </DropdownMenuItem>
                        ))}

                        <DropdownMenuSeparator />

                        {/* Delete Row */}
                        <DropdownMenuItem
                          onClick={() => deleteRow(rowIdx)}
                          className="flex items-center gap-2 py-1.5 cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          <span>Delete Row</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>

                  {row.cells.map((cellValue, colIdx) => {
                    const align = block.columnAlignments[colIdx] || 'left';
                    const isFirst = colIdx === 0;
                    const indentPadding =
                      isFirst && row.indent ? (row.indent === 1 ? 'pl-6' : 'pl-10') : 'pl-1.5';

                    let cellBorderStyle = '';
                    if (isTotal) {
                      cellBorderStyle =
                        'border-t border-slate-900 border-b-[3px] border-b-double border-b-slate-900';
                    } else if (isSubtotal) {
                      cellBorderStyle = 'border-t border-slate-500 border-b border-slate-500';
                    }

                    return (
                      <td
                        key={colIdx}
                        className={`py-0.5 pr-1.5 ${indentPadding} ${cellBorderStyle} text-${align} ${
                          isFirst ? 'min-w-[220px]' : 'min-w-[55px]'
                        }`}
                      >
                        <input
                          type="text"
                          value={cellValue}
                          onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                          placeholder={isFirst ? '' : '-'}
                          className={`w-full bg-transparent hover:bg-white/80 dark:hover:bg-zinc-800/80 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-${align} ${
                            isTotal || row.bold
                              ? 'font-bold text-slate-900 dark:text-zinc-100'
                              : 'text-slate-900 dark:text-zinc-200'
                          } ${row.italic ? 'italic text-slate-700 dark:text-zinc-300' : ''}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footnotes */}
      {block.footnotes && block.footnotes.length > 0 && (
        <div className="text-[11px] italic text-slate-600 pt-1">
          {block.footnotes.map((fn, idx) => (
            <div key={idx}>{fn}</div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------------- */
/* 4. CALLOUT / AUDITOR NOTICE BLOCK EDITOR                                  */
/* ------------------------------------------------------------------------- */
const CalloutBlockEditor: React.FC<{
  block: SecCalloutBlock;
  onUpdate: (u: Partial<SecCalloutBlock>) => void;
}> = ({ block, onUpdate }) => {
  const isUnaudited = block.variant === 'unaudited' || block.variant === 'warning';
  const borderColor = isUnaudited ? 'border-l-amber-500' : 'border-l-blue-600';
  const iconColor = isUnaudited ? 'text-amber-600' : 'text-blue-600';

  return (
    <div className={`my-3 p-3.5 rounded border border-slate-300 dark:border-zinc-700 border-l-4 ${borderColor} bg-slate-50/90 dark:bg-zinc-900/60 space-y-1.5`}>
      <div className="flex items-center gap-2">
        <AlertCircle className={`w-4 h-4 ${iconColor} shrink-0`} />
        <input
          type="text"
          value={block.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Notice / Disclosure Title..."
          className="font-bold text-xs text-slate-900 dark:text-zinc-100 bg-transparent border-none focus:outline-none w-full"
        />
      </div>

      <textarea
        value={block.content}
        onChange={(e) => onUpdate({ content: e.target.value })}
        rows={2}
        placeholder="Enter auditor notice or disclosure details..."
        className="w-full text-xs bg-transparent border-none focus:outline-none resize-none italic text-slate-800 dark:text-zinc-300 leading-relaxed"
      />
    </div>
  );
};

/* ------------------------------------------------------------------------- */
/* 5. SIGNATURE BLOCK EDITOR                                                 */
/* ------------------------------------------------------------------------- */
const SignatureBlockEditor: React.FC<{
  block: SecSignatureBlock;
  onUpdate?: (u: Partial<SecSignatureBlock>) => void;
}> = ({ block, onUpdate }) => {
  const addOfficer = () => {
    if (!onUpdate) return;
    const newOfficer = {
      id: `off-${Date.now()}`,
      name: 'Executive Signer',
      title: 'Chief Financial Officer',
      signatureText: '/s/ Executive Signer',
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      signed: true
    };
    onUpdate({ officers: [...block.officers, newOfficer] });
  };

  const updateOfficer = (idx: number, updates: Partial<typeof block.officers[0]>) => {
    if (!onUpdate) return;
    const next = [...block.officers];
    next[idx] = { ...next[idx], ...updates };
    onUpdate({ officers: next });
  };

  const removeOfficer = (idx: number) => {
    if (!onUpdate) return;
    const next = block.officers.filter((_, i) => i !== idx);
    onUpdate({ officers: next });
  };

  return (
    <div
      className="my-6 pt-4 border-t border-slate-300 dark:border-zinc-800 space-y-3"
      style={{ fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif' }}
    >
      <div className="flex items-center justify-between">
        <input
          type="text"
          value={block.title || 'SIGNATURES'}
          onChange={(e) => onUpdate && onUpdate({ title: e.target.value })}
          className="font-bold text-sm text-[#0E2841] dark:text-zinc-100 bg-transparent border-none focus:outline-none uppercase tracking-wide"
        />
        {onUpdate && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addOfficer}
            className="h-5 text-[10px] gap-1 px-1.5 text-blue-700 hover:bg-blue-50"
          >
            <Plus className="w-3 h-3" />
            <span>Add Signer</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {block.officers.map((officer, idx) => (
          <div key={officer.id || idx} className="space-y-1 text-xs group/sig relative">
            <input
              type="text"
              value={officer.signatureText || `/s/ ${officer.name}`}
              onChange={(e) => updateOfficer(idx, { signatureText: e.target.value })}
              className="w-full font-mono font-bold text-sm text-slate-900 dark:text-zinc-100 border-b border-slate-400 pb-0.5 bg-transparent focus:outline-none focus:border-blue-500"
            />
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={officer.name}
                onChange={(e) => updateOfficer(idx, { name: e.target.value, signatureText: `/s/ ${e.target.value}` })}
                placeholder="Officer Name"
                className="font-semibold text-slate-900 dark:text-zinc-200 bg-transparent border-none focus:outline-none flex-1"
              />
              <span className="text-slate-400">—</span>
              <input
                type="text"
                value={officer.title}
                onChange={(e) => updateOfficer(idx, { title: e.target.value })}
                placeholder="Title"
                className="text-slate-700 dark:text-zinc-300 bg-transparent border-none focus:outline-none flex-1"
              />
            </div>
            <div className="flex items-center justify-between text-slate-500 italic">
              <input
                type="text"
                value={officer.date}
                onChange={(e) => updateOfficer(idx, { date: e.target.value })}
                className="text-xs italic text-slate-500 bg-transparent border-none focus:outline-none w-3/4"
              />
              {block.officers.length > 1 && onUpdate && (
                <button
                  type="button"
                  onClick={() => removeOfficer(idx)}
                  className="opacity-0 group-hover/sig:opacity-100 text-red-500 hover:text-red-700 p-0.5"
                  title="Remove Signer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------------- */
/* 6. DIVIDER & PAGE BREAK EDITOR                                            */
/* ------------------------------------------------------------------------- */
const DividerBlockEditor: React.FC<{
  block: SecDividerBlock;
  onUpdate?: (u: Partial<SecDividerBlock>) => void;
}> = ({ block, onUpdate }) => {
  return (
    <div className="my-6 py-2 flex items-center justify-between gap-3 text-xs text-slate-400 select-none">
      <div className="h-px bg-dashed border-t border-slate-300 dark:border-zinc-700 flex-1" />
      <input
        type="text"
        value={block.label || 'Page Break / Next Section'}
        onChange={(e) => onUpdate && onUpdate({ label: e.target.value })}
        className="text-[10px] font-mono uppercase tracking-widest text-slate-600 bg-slate-200/80 dark:bg-zinc-800 px-3 py-1 rounded shadow-xs text-center border-none focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <div className="h-px bg-dashed border-t border-slate-300 dark:border-zinc-700 flex-1" />
    </div>
  );
};

/* ------------------------------------------------------------------------- */
/* 7. SEC FILING METADATA BLOCK EDITOR                                       */
/* ------------------------------------------------------------------------- */
const MetadataBlockEditor: React.FC<{
  block: SecMetadataBlock;
  onUpdate: (u: Partial<SecMetadataBlock>) => void;
  isWordMode?: boolean;
}> = ({ block, onUpdate, isWordMode }) => {
  if (isWordMode) {
    return (
      <div
        className="text-center space-y-1 mb-8"
        style={{ fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif' }}
      >
        <input
          type="text"
          value={block.companyName}
          onChange={(e) => onUpdate({ companyName: e.target.value })}
          className="text-2xl font-bold text-[#0E2841] text-center bg-transparent border-none focus:outline-none w-full"
        />
        <input
          type="text"
          value={block.documentTitle}
          onChange={(e) => onUpdate({ documentTitle: e.target.value })}
          className="text-lg font-bold text-[#0E2841] text-center bg-transparent border-none focus:outline-none w-full"
        />
        <input
          type="text"
          value={`For the Period Ended ${block.periodEnded}`}
          onChange={(e) =>
            onUpdate({ periodEnded: e.target.value.replace('For the Period Ended ', '') })
          }
          className="text-sm font-semibold text-slate-700 dark:text-zinc-300 text-center bg-transparent border-none focus:outline-none w-full"
        />
        <div className="text-xs italic text-slate-500">
          Expressed in {block.currency} — Unaudited
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2">
      <div className="flex items-center gap-2">
        <Tag className="w-4 h-4 text-blue-600" />
        <span className="font-bold text-xs text-slate-700 dark:text-zinc-300">
          SEC Filing Cover Header
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Input
          value={block.companyName}
          onChange={(e) => onUpdate({ companyName: e.target.value })}
          placeholder="Company Name"
          className="h-7 text-xs"
        />
        <Input
          value={block.documentTitle}
          onChange={(e) => onUpdate({ documentTitle: e.target.value })}
          placeholder="Document Title"
          className="h-7 text-xs"
        />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------------- */
/* 8. PICTURE / CORPORATE IMAGE BLOCK EDITOR                                 */
/* ------------------------------------------------------------------------- */
const ImageBlockEditor: React.FC<{
  block: SecImageBlock;
  onUpdate: (u: Partial<SecImageBlock>) => void;
}> = ({ block, onUpdate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMediaBucketOpen, setIsMediaBucketOpen] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Save directly to the company media bucket so other documents/companies can reuse it
      const asset = await mediaBucketService.uploadAsset(file);
      onUpdate({
        url: asset.url,
        alt: asset.name
      });
    } catch {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          onUpdate({
            url: uploadEvent.target.result as string,
            alt: file.name
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const align = block.alignment || 'center';
  const alignClass =
    align === 'left'
      ? 'justify-start text-left'
      : align === 'right'
      ? 'justify-end text-right'
      : 'justify-center text-center';

  const widthPx = block.width || 260;

  return (
    <div className={`w-full flex flex-col ${alignClass} py-1 my-1 select-none group/img`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Media Bucket Manager Modal */}
      {isMediaBucketOpen && (
        <MediaBucketModal
          isOpen={isMediaBucketOpen}
          onClose={() => setIsMediaBucketOpen(false)}
          selectedImageUrl={block.url}
          onSelectImage={(asset) => {
            onUpdate({
              url: asset.url,
              alt: asset.name
            });
            setIsMediaBucketOpen(false);
          }}
        />
      )}

      <div
        className={`inline-flex flex-col relative items-center max-w-full ${
          align === 'left' ? 'self-start' : align === 'right' ? 'self-end' : 'self-center'
        }`}
        style={{ width: `${widthPx}px` }}
      >
        <div className="relative group/pic w-full rounded-md overflow-hidden border border-transparent hover:border-blue-400/50 hover:shadow-md transition-all">
          <img
            src={block.url || ZENATECH_LOGO_DATA_URL}
            alt={block.alt || 'SEC Document Image'}
            className="w-full h-auto object-contain rounded-sm"
          />

          {/* Quick Change Overlay Buttons on Hover */}
          <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover/pic:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMediaBucketOpen(true);
              }}
              className="bg-blue-600 text-white text-xs font-semibold px-2.5 py-1 rounded shadow flex items-center gap-1.5 hover:bg-blue-700 transition-colors"
              title="Open Company Media Bucket (Select or delete images)"
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Media Bucket</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="bg-white/95 text-slate-800 dark:bg-zinc-900/95 dark:text-zinc-100 text-xs font-semibold px-2.5 py-1 rounded shadow flex items-center gap-1.5 hover:bg-white hover:text-blue-600 transition-colors"
              title="Upload directly from computer to bucket"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>Upload New</span>
            </button>
          </div>
        </div>

        {/* Editable Caption */}
        <input
          type="text"
          value={block.caption || ''}
          onChange={(e) => onUpdate({ caption: e.target.value })}
          placeholder="Add optional image caption..."
          className="w-full mt-1.5 text-xs text-center text-slate-500 dark:text-zinc-400 italic bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-blue-500 focus:outline-none transition-colors"
        />
      </div>
    </div>
  );
};


