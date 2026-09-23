import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  convertInchesToTwip,
  Header,
  Footer,
  PageNumber
} from 'docx';
import type { SecFilingDocument } from '../types/secFiling';

/**
 * Dynamically exports any SEC Filing Document (including added/removed/reordered blocks)
 * into a beautifully formatted Microsoft Word (.docx) document.
 */
export async function exportSecFilingToDocx(doc: SecFilingDocument): Promise<Blob> {
  const children: any[] = [];

  for (const block of doc.blocks) {
    if (block.type === 'metadata') {
      // Dynamic Filing Metadata Cover Block
      if (block.companyName) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER as any,
            children: [
              new TextRun({
                text: block.companyName,
                bold: true,
                size: 28,
                color: '0E2841',
                font: 'Calibri'
              })
            ],
            spacing: { before: 200, after: 100 }
          })
        );
      }

      if (block.documentTitle || block.formType) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER as any,
            children: [
              new TextRun({
                text: block.documentTitle || block.formType,
                bold: true,
                size: 24,
                color: '0E2841',
                font: 'Calibri'
              })
            ],
            spacing: { after: 100 }
          })
        );
      }

      if (block.periodEnded) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER as any,
            children: [
              new TextRun({
                text: `For the Period Ended ${block.periodEnded}`,
                bold: true,
                size: 22,
                font: 'Calibri'
              })
            ],
            spacing: { after: 80 }
          })
        );
      }

      const currencyText = block.currency ? `Expressed in ${block.currency}` : '';
      if (currencyText) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER as any,
            children: [
              new TextRun({
                text: `${currencyText} — Unaudited`,
                italics: true,
                size: 20,
                font: 'Calibri'
              })
            ],
            spacing: { after: 300 }
          })
        );
      }
    } else if (block.type === 'heading') {
      let headingLevel: any = HeadingLevel.HEADING_1;
      let size = 24;
      if (block.level === 2) {
        headingLevel = HeadingLevel.HEADING_2;
        size = 22;
      } else if (block.level === 3) {
        headingLevel = HeadingLevel.HEADING_3;
        size = 20;
      } else if (block.level === 4) {
        headingLevel = HeadingLevel.HEADING_4;
        size = 18;
      }

      let alignment: any = AlignmentType.LEFT;
      if (block.alignment === 'center') alignment = AlignmentType.CENTER;
      if (block.alignment === 'right') alignment = AlignmentType.RIGHT;

      const isStatementTitle = block.text.includes('Statements of');

      const headingColor = block.color
        ? block.color.replace('#', '')
        : block.level <= 2
        ? '0E2841'
        : '000000';

      children.push(
        new Paragraph({
          heading: headingLevel,
          alignment,
          pageBreakBefore: isStatementTitle,
          children: [
            new TextRun({
              text: block.text,
              bold: block.bold ?? true,
              italics: block.italic ?? false,
              size,
              color: headingColor,
              font: 'Calibri'
            })
          ],
          spacing: { before: isStatementTitle ? 0 : 200, after: 100 }
        })
      );
    } else if (block.type === 'paragraph') {
      let alignment: any = AlignmentType.LEFT;
      if (block.alignment === 'center') alignment = AlignmentType.CENTER;
      if (block.alignment === 'right') alignment = AlignmentType.RIGHT;
      if (block.alignment === 'justify') alignment = AlignmentType.JUSTIFIED;

      const textColor = block.color ? block.color.replace('#', '') : '000000';

      children.push(
        new Paragraph({
          alignment,
          children: [
            new TextRun({
              text: block.text,
              bold: block.bold ?? false,
              italics: block.italic ?? false,
              size: 20,
              color: textColor,
              font: 'Calibri'
            })
          ],
          spacing: { before: 60, after: 80, line: 260 }
        })
      );
    } else if (block.type === 'callout') {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    block.title
                      ? new Paragraph({
                          children: [
                            new TextRun({
                              text: block.title,
                              bold: true,
                              size: 19,
                              color: '0E2841',
                              font: 'Calibri'
                            })
                          ],
                          spacing: { after: 60 }
                        })
                      : new Paragraph({ text: '' }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: block.content,
                          italics: true,
                          size: 18,
                          font: 'Calibri'
                        })
                      ]
                    })
                  ],
                  margins: { top: 100, bottom: 100, left: 140, right: 140 },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
                    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
                    left: { style: BorderStyle.SINGLE, size: 12, color: '2563EB' },
                    right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }
                  }
                })
              ]
            })
          ]
        }),
        new Paragraph({ spacing: { after: 120 } })
      );
    } else if (block.type === 'financial_table') {
      const tableRows: TableRow[] = [];

      const noBorder = { style: BorderStyle.NONE, size: 0, color: 'auto' };
      const singleLine = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
      const doubleLine = { style: BorderStyle.DOUBLE, size: 8, color: '000000' };

      // Dynamic Table Headers
      if (block.headers && block.headers.length > 0) {
        const headerFill = (block.headerShading || 'CCECFF').replace('#', '');
        tableRows.push(
          new TableRow({
            tableHeader: true,
            children: block.headers.map((h, i) => {
              const align = block.columnAlignments[i] || (i === 0 ? 'left' : 'right');
              return new TableCell({
                shading: { fill: headerFill },
                children: [
                  new Paragraph({
                    alignment:
                      align === 'center'
                        ? (AlignmentType.CENTER as any)
                        : align === 'right'
                        ? (AlignmentType.RIGHT as any)
                        : (AlignmentType.LEFT as any),
                    children: [
                      new TextRun({
                        text: h,
                        bold: true,
                        size: 18,
                        color: '0E2841',
                        font: 'Calibri'
                      })
                    ]
                  })
                ],
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                borders: {
                  top: noBorder,
                  left: noBorder,
                  right: noBorder,
                  bottom: singleLine
                }
              });
            })
          })
        );
      }

      // Dynamic Data Rows
      for (const row of block.rows) {
        const fillHex = row.shading
          ? row.shading.replace('#', '')
          : row.type === 'section_title'
          ? 'DAE9F7'
          : undefined;

        tableRows.push(
          new TableRow({
            children: row.cells.map((cellText, colIndex) => {
              const align = block.columnAlignments[colIndex] || (colIndex === 0 ? 'left' : 'right');
              const isFirstCol = colIndex === 0;
              const indent = isFirstCol && row.indent ? row.indent * 200 : 0;

              let topBorder: any = noBorder;
              let bottomBorder: any = noBorder;

              if (row.type === 'subtotal') {
                topBorder = singleLine;
                bottomBorder = singleLine;
              } else if (row.type === 'total') {
                topBorder = singleLine;
                bottomBorder = doubleLine;
              }

              return new TableCell({
                shading: fillHex ? { fill: fillHex } : undefined,
                children: [
                  new Paragraph({
                    alignment:
                      align === 'center'
                        ? (AlignmentType.CENTER as any)
                        : align === 'right'
                        ? (AlignmentType.RIGHT as any)
                        : (AlignmentType.LEFT as any),
                    indent: indent > 0 ? { left: indent } : undefined,
                    children: [
                      new TextRun({
                        text: cellText,
                        bold: row.bold || row.type === 'total' || row.type === 'section_title',
                        italics: row.italic,
                        size: 18,
                        font: 'Calibri'
                      })
                    ]
                  })
                ],
                margins: { top: 40, bottom: 40, left: 80, right: 80 },
                borders: {
                  top: topBorder,
                  left: noBorder,
                  right: noBorder,
                  bottom: bottomBorder
                }
              });
            })
          })
        );
      }

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows
        })
      );

      // Dynamic Footnotes
      if (block.footnotes && block.footnotes.length > 0) {
        for (const fn of block.footnotes) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: fn,
                  italics: true,
                  size: 17,
                  color: '555555',
                  font: 'Calibri'
                })
              ],
              spacing: { before: 60, after: 120 }
            })
          );
        }
      } else {
        children.push(new Paragraph({ spacing: { after: 120 } }));
      }
    } else if (block.type === 'signature') {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: block.title || 'SIGNATURES',
              bold: true,
              size: 22,
              color: '0E2841',
              font: 'Calibri'
            })
          ],
          spacing: { before: 200, after: 100 }
        })
      );

      for (const officer of block.officers) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: officer.signatureText || `/s/ ${officer.name}`,
                bold: true,
                size: 20,
                font: 'Calibri'
              })
            ],
            spacing: { before: 80 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `${officer.name} — ${officer.title}`,
                size: 19,
                font: 'Calibri'
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Date: ${officer.date}`,
                italics: true,
                size: 18,
                font: 'Calibri'
              })
            ],
            spacing: { after: 140 }
          })
        );
      }
    } else if (block.type === 'divider') {
      if (block.pageBreak) {
        children.push(
          new Paragraph({
            pageBreakBefore: true,
            children: block.label
              ? [
                  new TextRun({
                    text: block.label,
                    bold: true,
                    size: 18,
                    color: '666666',
                    font: 'Calibri'
                  })
                ]
              : []
          })
        );
      }
    } else if (block.type === 'image') {
      let alignment: any = AlignmentType.CENTER;
      if (block.alignment === 'left') alignment = AlignmentType.LEFT;
      if (block.alignment === 'right') alignment = AlignmentType.RIGHT;

      if (block.caption) {
        children.push(
          new Paragraph({
            alignment,
            children: [
              new TextRun({
                text: `[Image: ${block.alt || 'Corporate Logo / Graphic'}]`,
                italics: true,
                size: 18,
                color: '666666',
                font: 'Calibri'
              })
            ],
            spacing: { before: 100, after: 40 }
          }),
          new Paragraph({
            alignment,
            children: [
              new TextRun({
                text: block.caption,
                italics: true,
                size: 16,
                color: '888888',
                font: 'Calibri'
              })
            ],
            spacing: { after: 120 }
          })
        );
      }
    }
  }

  const docxDocument = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1)
            }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT as any,
                children: [
                  new TextRun({
                    text: `${doc.symbol || 'SEC Filing'} — ${doc.period || doc.version}`,
                    italics: true,
                    size: 16,
                    color: '888888',
                    font: 'Calibri'
                  })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER as any,
                children: [
                  new TextRun({
                    text: 'Page ',
                    size: 16,
                    color: '888888',
                    font: 'Calibri'
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '888888',
                    font: 'Calibri'
                  })
                ]
              })
            ]
          })
        },
        children
      }
    ]
  });

  return await Packer.toBlob(docxDocument);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Dynamically prints or exports any SEC Filing Document to PDF using native browser rendering.
 */
export function printSecFiling(doc: SecFilingDocument) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print/export the SEC filing to PDF.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${doc.title || 'SEC Filing'} - ${doc.version}</title>
        <style>
          @page {
            size: letter;
            margin: 1in;
          }
          body {
            font-family: Calibri, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 10.5pt;
            line-height: 1.35;
            color: #111;
            margin: 0;
            padding: 24px;
          }
          .page-break {
            page-break-before: always;
          }
          .sec-header {
            text-align: center;
            margin-bottom: 24px;
          }
          .sec-header h1 {
            font-size: 15pt;
            margin: 0 0 4px 0;
            font-weight: bold;
            color: #0E2841;
          }
          .sec-header h2 {
            font-size: 13pt;
            margin: 0 0 4px 0;
            font-weight: bold;
            color: #0E2841;
          }
          .sec-header p {
            margin: 2px 0;
            font-style: italic;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 14px 0;
            font-size: 9.5pt;
          }
          th {
            background-color: #CCECFF;
            color: #0E2841;
            border-bottom: 1.5pt solid #0E2841;
            padding: 6px 6px;
            font-weight: bold;
          }
          td {
            padding: 3px 6px;
            border: none;
          }
          .subtotal td {
            border-top: 1pt solid #000;
            border-bottom: 1pt solid #000;
            font-weight: bold;
          }
          .total td {
            border-top: 1pt solid #000;
            border-bottom: 3pt double #000;
            font-weight: bold;
          }
          .section_title td {
            background-color: #DAE9F7;
            font-weight: bold;
            color: #0E2841;
          }
          .align-left { text-align: left; }
          .align-center { text-align: center; }
          .align-right { text-align: right; }
          .indent-1 { padding-left: 16px; }
          .indent-2 { padding-left: 32px; }
          .callout {
            border: 1pt solid #cbd5e1;
            border-left: 3pt solid #2563eb;
            background: #f8fafc;
            padding: 10px 14px;
            margin: 14px 0;
            font-size: 9.5pt;
          }
          .signatures {
            margin-top: 30px;
          }
          .signature-item {
            margin-bottom: 20px;
          }
          @media print {
            body { padding: 0; }
            th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="sec-document">
          ${doc.blocks
            .map((b) => {
              if (b.type === 'metadata') {
                return `
                  <div class="sec-header">
                    <h1>${b.companyName || 'ZenaTech, Inc.'}</h1>
                    <h2>${b.documentTitle || b.formType || 'Consolidated Financial Statements'}</h2>
                    ${b.periodEnded ? `<p><strong>For the Period Ended ${b.periodEnded}</strong></p>` : ''}
                    ${b.currency ? `<p>Expressed in ${b.currency} — Unaudited</p>` : ''}
                  </div>
                `;
              }
              if (b.type === 'heading') {
                const alignClass = `align-${b.alignment || 'left'}`;
                const isStatement = b.text.includes('Statements of');
                return `<h${b.level} class="${alignClass} ${isStatement ? 'page-break' : ''}" style="margin: 14px 0 6px 0; font-weight: bold; color: ${b.color || '#0E2841'};">${b.text}</h${b.level}>`;
              }
              if (b.type === 'paragraph') {
                const alignClass = `align-${b.alignment || 'left'}`;
                return `<p class="${alignClass}" style="margin: 5px 0; color: ${b.color || 'inherit'};">${b.text}</p>`;
              }
              if (b.type === 'callout') {
                return `
                  <div class="callout">
                    ${b.title ? `<strong>${b.title}</strong><br/>` : ''}
                    <em>${b.content}</em>
                  </div>
                `;
              }
              if (b.type === 'financial_table') {
                const headerBg = b.headerShading || '#CCECFF';
                return `
                  <table>
                    <thead>
                      <tr style="background-color: ${headerBg};">
                        ${b.headers
                          .map((h, i) => `<th class="align-${b.columnAlignments[i] || 'left'}">${h}</th>`)
                          .join('')}
                      </tr>
                    </thead>
                    <tbody>
                      ${b.rows
                        .map((r) => {
                          const rowClass = r.type === 'total' ? 'total' : r.type === 'subtotal' ? 'subtotal' : r.type === 'section_title' ? 'section_title' : '';
                          const rowBg = r.shading ? `background-color: ${r.shading};` : (r.type === 'section_title' ? 'background-color: #DAE9F7;' : '');
                          return `
                            <tr class="${rowClass}" style="${rowBg}">
                              ${r.cells
                                .map((c, i) => {
                                  const align = `align-${b.columnAlignments[i] || 'left'}`;
                                  const indent = i === 0 && r.indent ? `indent-${r.indent}` : '';
                                  const bold = r.bold || r.type === 'section_title' ? 'font-weight: bold;' : '';
                                  const italic = r.italic ? 'font-style: italic;' : '';
                                  return `<td class="${align} ${indent}" style="${bold} ${italic}">${c || '&nbsp;'}</td>`;
                                })
                                .join('')}
                            </tr>
                          `;
                        })
                        .join('')}
                    </tbody>
                  </table>
                  ${
                    b.footnotes
                      ? b.footnotes.map((fn) => `<p style="font-size: 8.5pt; font-style: italic;">${fn}</p>`).join('')
                      : ''
                  }
                `;
              }
              if (b.type === 'signature') {
                return `
                  <div class="signatures">
                    <h3>${b.title || 'SIGNATURES'}</h3>
                    ${b.officers
                      .map(
                        (off) => `
                      <div class="signature-item">
                        <p><strong>${off.signatureText || `/s/ ${off.name}`}</strong><br/>
                        ${off.name} — ${off.title}<br/>
                        <em>Date: ${off.date}</em></p>
                      </div>
                    `
                      )
                      .join('')}
                  </div>
                `;
              }
              if (b.type === 'divider') {
                return b.pageBreak ? '<div class="page-break"></div>' : '<hr style="border: 0.5pt solid #ccc; margin: 20px 0;" />';
              }
              if (b.type === 'image') {
                const alignClass = `align-${b.alignment || 'center'}`;
                return `
                  <div class="${alignClass}" style="margin: 14px 0; text-align: ${b.alignment || 'center'};">
                    <img src="${b.url || '/Picture1.jpg'}" alt="${b.alt || 'Graphic'}" style="max-width: ${b.width || 260}px; width: 100%; height: auto; display: inline-block;" />
                    ${b.caption ? `<p style="font-size: 8.5pt; font-style: italic; color: #666; margin-top: 4px;">${b.caption}</p>` : ''}
                  </div>
                `;
              }
              return '';
            })
            .join('')}
        </div>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
