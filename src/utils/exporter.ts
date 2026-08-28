import pptxgen from 'pptxgenjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import { PresentationProject, SlideItem } from '../types';

export const ExporterService = {
  /**
   * 1. Export PowerPoint Presentation (.pptx)
   */
  async exportToPPTX(project: PresentationProject) {
    const pres = new pptxgen();
    pres.title = project.title;
    pres.author = project.author || 'Farhee Intelligent (PGV Creation)';
    pres.layout = project.aspectRatio === '4:3' ? 'LAYOUT_4x3' : 'LAYOUT_16x9';

    // Theme color palettes
    const getColors = (theme: string) => {
      switch (theme) {
        case 'cyberpunk':
          return { bg: '0B0D0E', text: 'F3F4F6', accent: 'CCFF00', sub: '10B981', cardBg: '141A1E' };
        case 'corporate':
          return { bg: 'FFFFFF', text: '1E293B', accent: '0284C7', sub: '0369A1', cardBg: 'F1F5F9' };
        case 'midnight':
          return { bg: '030712', text: 'E2E8F0', accent: '6366F1', sub: '818CF8', cardBg: '0F172A' };
        case 'minimal':
          return { bg: 'FAFAFA', text: '18181B', accent: '18181B', sub: '71717A', cardBg: 'E4E4E7' };
        case 'emerald':
        default:
          return { bg: '0B0D0E', text: 'F9FAFB', accent: '10B981', sub: 'CCFF00', cardBg: '12171B' };
      }
    };

    const palette = getColors(project.theme);

    project.slides.forEach((slideItem, index) => {
      const slide = pres.addSlide();
      slide.background = { color: palette.bg };

      // Top banner or header
      if (slideItem.layout === 'title' || index === 0) {
        // Title Slide
        slide.addShape(pres.ShapeType.rect, {
          x: 0,
          y: 0,
          w: '100%',
          h: 0.15,
          fill: { color: palette.accent },
        });

        slide.addText(slideItem.title || project.title, {
          x: 0.8,
          y: 2.0,
          w: 8.5,
          h: 1.5,
          fontSize: 36,
          bold: true,
          color: palette.accent,
          fontFace: 'Arial',
        });

        if (slideItem.subtitle || project.subtitle) {
          slide.addText(slideItem.subtitle || project.subtitle, {
            x: 0.8,
            y: 3.6,
            w: 8.5,
            h: 1.0,
            fontSize: 20,
            color: palette.text,
            fontFace: 'Arial',
          });
        }

        slide.addText(`Engineered with Farhee Intelligent • PGV Creation`, {
          x: 0.8,
          y: 5.8,
          w: 8.5,
          h: 0.4,
          fontSize: 12,
          color: palette.sub,
          italic: true,
          fontFace: 'Arial',
        });
      } else {
        // Content Slide Header
        slide.addText(slideItem.title, {
          x: 0.8,
          y: 0.5,
          w: 8.5,
          h: 0.8,
          fontSize: 26,
          bold: true,
          color: palette.accent,
          fontFace: 'Arial',
        });

        if (slideItem.subtitle) {
          slide.addText(slideItem.subtitle, {
            x: 0.8,
            y: 1.2,
            w: 8.5,
            h: 0.4,
            fontSize: 14,
            color: palette.sub,
            fontFace: 'Arial',
          });
        }

        // Bullet points
        if (slideItem.bulletPoints && slideItem.bulletPoints.length > 0) {
          const bulletTexts = slideItem.bulletPoints.map(bp => ({
            text: bp,
            options: {
              bullet: { code: '25BA', color: palette.sub },
              color: palette.text,
              fontSize: 15,
              paraSpaceAfter: 12,
              fontFace: 'Arial',
            },
          }));

          slide.addText(bulletTexts, {
            x: 0.8,
            y: 1.8,
            w: 8.4,
            h: 4.2,
          });
        }

        // Metrics card if any
        if (slideItem.metrics && slideItem.metrics.length > 0) {
          const colWidth = 7.8 / slideItem.metrics.length;
          slideItem.metrics.forEach((metric, mIdx) => {
            const posX = 0.8 + mIdx * colWidth;
            slide.addShape(pres.ShapeType.roundRect, {
              x: posX,
              y: 4.2,
              w: colWidth - 0.2,
              h: 1.8,
              fill: { color: palette.cardBg },
              line: { color: palette.accent, width: 1 },
              rectRadius: 0.1,
            });

            slide.addText(metric.value, {
              x: posX + 0.1,
              y: 4.3,
              w: colWidth - 0.4,
              h: 0.7,
              fontSize: 22,
              bold: true,
              color: palette.accent,
              align: 'center',
              fontFace: 'Arial',
            });

            slide.addText(metric.label, {
              x: posX + 0.1,
              y: 5.0,
              w: colWidth - 0.4,
              h: 0.8,
              fontSize: 11,
              color: palette.text,
              align: 'center',
              fontFace: 'Arial',
            });
          });
        }

        // Slide number & footer
        slide.addText(`Slide ${index + 1} | Farhee AI • PGV Creation`, {
          x: 0.8,
          y: 6.8,
          w: 8.5,
          h: 0.3,
          fontSize: 9,
          color: '6B7280',
          fontFace: 'Arial',
        });
      }
    });

    const fileName = `${project.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Farhee_Presentation'}.pptx`;
    await pres.writeFile({ fileName });
  },

  /**
   * 2. Export Presentation or Document to PDF (.pdf)
   */
  exportToPDF(title: string, subtitle: string, sections: { heading: string; bullets?: string[]; content?: string }[]) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor: [number, number, number] = [16, 185, 129]; // Emerald
    const textColor: [number, number, number] = [30, 41, 59];

    // Header bar
    doc.setFillColor(11, 13, 14);
    doc.rect(0, 0, 210, 24, 'F');
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 24, 210, 1.5, 'F');

    doc.setTextColor(204, 255, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('FARHEE INTELLIGENT', 14, 15);

    doc.setTextColor(156, 163, 175);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('PGV Creation • Batticaloa, Sri Lanka', 130, 15);

    // Title
    let currentY = 38;
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, currentY);

    if (subtitle) {
      currentY += 8;
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(subtitle, 14, currentY);
    }

    currentY += 12;

    sections.forEach((sec, idx) => {
      // Check page overflow
      if (currentY > 260) {
        doc.addPage();
        currentY = 25;
      }

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}. ${sec.heading}`, 14, currentY);
      currentY += 6;

      if (sec.content) {
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const splitText = doc.splitTextToSize(sec.content, 180);
        doc.text(splitText, 14, currentY);
        currentY += splitText.length * 5 + 4;
      }

      if (sec.bullets && sec.bullets.length > 0) {
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        sec.bullets.forEach((b) => {
          if (currentY > 270) {
            doc.addPage();
            currentY = 25;
          }
          doc.setFillColor(16, 185, 129);
          doc.circle(16, currentY - 1, 1, 'F');
          const splitBullet = doc.splitTextToSize(b, 172);
          doc.text(splitBullet, 20, currentY);
          currentY += splitBullet.length * 5 + 2;
        });
      }

      currentY += 6;
    });

    // Page numbers
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${i} of ${totalPages} • Generated by Farhee Intelligent (PGV Creation)`, 14, 290);
    }

    const fileName = `${title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Farhee_Document'}.pdf`;
    doc.save(fileName);
  },

  /**
   * 3. Export Presentation or Data to Excel Spreadsheet (.xlsx)
   */
  exportToExcel(title: string, slides: SlideItem[]) {
    const rows = slides.map((s, idx) => ({
      'Slide #': idx + 1,
      'Title': s.title,
      'Subtitle': s.subtitle || '',
      'Key Points / Content': s.bulletPoints.join(' | '),
      'Metrics / Data': s.metrics ? s.metrics.map(m => `${m.label}: ${m.value}`).join(', ') : '',
      'Speaker Notes': s.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Presentation Outline');

    // Add metadata info sheet
    const metaSheet = XLSX.utils.aoa_to_sheet([
      ['Farhee Intelligent - Export Report'],
      ['Project Title', title],
      ['Creator', 'PGV Creation (Batticaloa, Sri Lanka)'],
      ['Total Slides', slides.length],
      ['Exported At', new Date().toLocaleString()],
    ]);
    XLSX.utils.book_append_sheet(workbook, metaSheet, 'Metadata');

    const fileName = `${title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Farhee_Slides'}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  },

  /**
   * 4. Export Presentation or Document to Microsoft Word (.docx)
   */
  async exportToDocx(title: string, subtitle: string, slides: SlideItem[]) {
    const docChildren: any[] = [
      new Paragraph({
        text: 'FARHEE INTELLIGENT',
        heading: HeadingLevel.HEADING_3,
      }),
      new Paragraph({
        text: title,
        heading: HeadingLevel.TITLE,
      }),
      new Paragraph({
        text: subtitle || 'Generated with AI Presentation & Docx Engine by PGV Creation',
        heading: HeadingLevel.HEADING_2,
      }),
      new Paragraph({ text: '' }),
    ];

    slides.forEach((s, idx) => {
      docChildren.push(
        new Paragraph({
          text: `Slide ${idx + 1}: ${s.title}`,
          heading: HeadingLevel.HEADING_1,
        })
      );

      if (s.subtitle) {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: s.subtitle, italics: true, color: '555555' })],
          })
        );
      }

      if (s.bulletPoints && s.bulletPoints.length > 0) {
        s.bulletPoints.forEach(bp => {
          docChildren.push(
            new Paragraph({
              text: `• ${bp}`,
              indent: { left: 400 },
            })
          );
        });
      }

      if (s.notes) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Speaker Notes: ', bold: true }),
              new TextRun({ text: s.notes, italics: true }),
            ],
            indent: { left: 400 },
          })
        );
      }

      docChildren.push(new Paragraph({ text: '' }));
    });

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docChildren,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `${title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Farhee_Document'}.docx`;
    saveAs(blob, fileName);
  }
};
