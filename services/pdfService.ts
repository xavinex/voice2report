
import { StructuredReport } from "../types";

export const downloadAsPDF = async (report: StructuredReport) => {
  const { jsPDF } = (window as any).jspdf;
  const doc = new jsPDF();
  const margin = 20;
  let cursorY = 20;

  // Helper to add text and update cursor
  const addText = (text: string, size: number, style: 'normal' | 'bold' = 'normal') => {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    const lines = doc.splitTextToSize(text, 170);
    doc.text(lines, margin, cursorY);
    cursorY += (lines.length * (size * 0.5)) + 5;
    
    if (cursorY > 270) {
      doc.addPage();
      cursorY = 20;
    }
  };

  // Header
  addText(report.title, 22, 'bold');
  addText(`Date: ${report.date}`, 10, 'normal');
  cursorY += 5;

  // Sections
  report.sections.forEach(section => {
    addText(section.title.toUpperCase(), 12, 'bold');
    doc.setLineWidth(0.5);
    doc.line(margin, cursorY - 4, margin + 40, cursorY - 4);
    
    if (section.content) {
      addText(section.content, 11, 'normal');
    }

    if (section.items && section.items.length > 0) {
      section.items.forEach(item => {
        addText(`• ${item}`, 10, 'normal');
      });
      cursorY += 5;
    }
    cursorY += 5;
  });

  doc.save(`${report.title.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
};
