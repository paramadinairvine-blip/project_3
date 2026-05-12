import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Export table data to PDF (A4 format).
 *
 * @param {string} title - Report title
 * @param {string[]} headers - Column headers
 * @param {Array<Array<string|number>>} data - Table rows (array of arrays)
 * @param {string} [filename='laporan.pdf'] - Output filename
 * @param {object} [options] - Additional options
 * @param {string} [options.subtitle] - Subtitle/filter info
 * @param {Array<'left'|'center'|'right'>} [options.columnStyles] - Column alignments
 */
export function exportTableToPDF(title, headers, data, filename = 'laporan.pdf', options = {}) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // ─── Header ─────────────────────────────────────────
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('TOKO MATERIAL PESANTREN', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text('Jl. Pesantren No. 1 | Telp: (021) 1234567', pageWidth / 2, 21, { align: 'center' });

  // Divider
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(14, 24, pageWidth - 14, 24);

  // Title
  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.text(title, pageWidth / 2, 32, { align: 'center' });

  // Subtitle / filter info
  let startY = 36;
  if (options.subtitle) {
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(options.subtitle, pageWidth / 2, 38, { align: 'center' });
    startY = 42;
  }

  // Print date
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  const now = new Date();
  const dateStr = `Dicetak: ${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
  doc.text(dateStr, pageWidth - 14, startY, { align: 'right' });
  startY += 4;

  // ─── Table ──────────────────────────────────────────
  const columnStyles = {};
  if (options.columnStyles) {
    options.columnStyles.forEach((align, i) => {
      columnStyles[i] = { halign: align };
    });
  }

  autoTable(doc, {
    head: [headers],
    body: data,
    startY,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles,
    styles: {
      cellPadding: 2,
      overflow: 'linebreak',
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer: page numbers
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(
        `Halaman ${data.pageNumber} dari ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    },
  });

  doc.save(filename);
}
