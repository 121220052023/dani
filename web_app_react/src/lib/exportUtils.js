import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

export function exportAnalyticsToPDF(analytics, language = 'en') {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235);  // Primary blue
  doc.text('VoltCart Analytics Report', pageWidth / 2, 20, { align: 'center' });
  
  // Date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });
  
  let yPosition = 40;
  
  // Summary Cards
  if (analytics?.summaryCards) {
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Summary', 14, yPosition);
    yPosition += 10;
    
    // Simple table without autoTable
    const startX = 14;
    const colWidth = (pageWidth - 28) / 3;
    
    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(startX, yPosition, pageWidth - 28, 8, 'F');
    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.text('Metric', startX + 2, yPosition + 6);
    doc.text('Value', startX + colWidth + 2, yPosition + 6);
    doc.text('Change', startX + 2 * colWidth + 2, yPosition + 6);
    yPosition += 10;
    
    // Rows
    doc.setTextColor(0);
    analytics.summaryCards.forEach((card, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(240);
        doc.rect(startX, yPosition - 2, pageWidth - 28, 8, 'F');
      }
      doc.text(card.label, startX + 2, yPosition + 4);
      doc.text(typeof card.value === 'number' ? card.value.toLocaleString() : card.value, startX + colWidth + 2, yPosition + 4);
      doc.text(card.meta || '', startX + 2 * colWidth + 2, yPosition + 4);
      yPosition += 8;
    });
    
    yPosition += 20;
  }
  
  // Daily Orders
  if (analytics?.ordersByDay) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Daily Orders (Last 7 Days)', 14, yPosition);
    yPosition += 10;
    
    const startX = 14;
    const colWidth = (pageWidth - 28) / 2;
    
    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(startX, yPosition, pageWidth - 28, 8, 'F');
    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.text('Day', startX + 2, yPosition + 6);
    doc.text('Orders', startX + colWidth + 2, yPosition + 6);
    yPosition += 10;
    
    // Rows
    doc.setTextColor(0);
    analytics.ordersByDay.forEach((item, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(240);
        doc.rect(startX, yPosition - 2, pageWidth - 28, 8, 'F');
      }
      doc.text(item.day, startX + 2, yPosition + 4);
      doc.text(item.orders.toString(), startX + colWidth + 2, yPosition + 4);
      yPosition += 8;
    });
    
    yPosition += 20;
  }
  
  // Category Mix
  if (analytics?.categoryMix) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Category Distribution', 14, yPosition);
    yPosition += 10;
    
    const startX = 14;
    const colWidth = (pageWidth - 28) / 2;
    
    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(startX, yPosition, pageWidth - 28, 8, 'F');
    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.text('Category', startX + 2, yPosition + 6);
    doc.text('Products', startX + colWidth + 2, yPosition + 6);
    yPosition += 10;
    
    // Rows
    doc.setTextColor(0);
    analytics.categoryMix.forEach((item, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(240);
        doc.rect(startX, yPosition - 2, pageWidth - 28, 8, 'F');
      }
      doc.text(item.name, startX + 2, yPosition + 4);
      doc.text(item.value.toString(), startX + colWidth + 2, yPosition + 4);
      yPosition += 8;
    });
  }
  
  // Save
  doc.save(`voltcart-analytics-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportAnalyticsToWord(analytics, language = 'en') {
  const sections = [];
  
  // Title
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'VoltCart Analytics Report',
          bold: true,
          size: 32,
          color: '2563EB',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );
  
  // Date
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated: ${new Date().toLocaleString()}`,
          size: 18,
          color: '666666',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );
  
  // Summary Cards
  if (analytics?.summaryCards) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Summary',
            bold: true,
            size: 24,
          }),
        ],
        spacing: { before: 200, after: 200 },
      })
    );
    
    const summaryRows = analytics.summaryCards.map(card => 
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph(card.label)],
            width: { size: 33, type: 'pct' },
          }),
          new TableCell({
            children: [new Paragraph(typeof card.value === 'number' ? card.value.toLocaleString() : card.value)],
            width: { size: 33, type: 'pct' },
          }),
          new TableCell({
            children: [new Paragraph(card.meta || '')],
            width: { size: 34, type: 'pct' },
          }),
        ],
      })
    );
    
    sections.push(
      new Table({
        width: { size: 100, type: 'pct' },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'Metric', bold: true })] })],
                width: { size: 33, type: 'pct' },
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'Value', bold: true })] })],
                width: { size: 33, type: 'pct' },
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'Change', bold: true })] })],
                width: { size: 34, type: 'pct' },
              }),
            ],
          }),
          ...summaryRows,
        ],
      })
    );
  }
  
  // Daily Orders
  if (analytics?.ordersByDay) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Daily Orders (Last 7 Days)',
            bold: true,
            size: 24,
          }),
        ],
        spacing: { before: 400, after: 200 },
      })
    );
    
    const orderRows = analytics.ordersByDay.map(item => 
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph(item.day)],
            width: { size: 50, type: 'pct' },
          }),
          new TableCell({
            children: [new Paragraph(item.orders.toString())],
            width: { size: 50, type: 'pct' },
          }),
        ],
      })
    );
    
    sections.push(
      new Table({
        width: { size: 100, type: 'pct' },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'Day', bold: true })] })],
                width: { size: 50, type: 'pct' },
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'Orders', bold: true })] })],
                width: { size: 50, type: 'pct' },
              }),
            ],
          }),
          ...orderRows,
        ],
      })
    );
  }
  
  // Category Mix
  if (analytics?.categoryMix) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Category Distribution',
            bold: true,
            size: 24,
          }),
        ],
        spacing: { before: 400, after: 200 },
      })
    );
    
    const categoryRows = analytics.categoryMix.map(item => 
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph(item.name)],
            width: { size: 50, type: 'pct' },
          }),
          new TableCell({
            children: [new Paragraph(item.value.toString())],
            width: { size: 50, type: 'pct' },
          }),
        ],
      })
    );
    
    sections.push(
      new Table({
        width: { size: 100, type: 'pct' },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'Category', bold: true })] })],
                width: { size: 50, type: 'pct' },
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'Products', bold: true })] })],
                width: { size: 50, type: 'pct' },
              }),
            ],
          }),
          ...categoryRows,
        ],
      })
    );
  }
  
  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sections,
      },
    ],
  });
  
  // Generate and save
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `voltcart-analytics-${new Date().toISOString().slice(0, 10)}.docx`);
}
