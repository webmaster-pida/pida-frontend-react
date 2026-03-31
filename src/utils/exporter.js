import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as docx from "docx";

export const Exporter = {
    // Normaliza la entrada
    normalizeContent(content) {
        if (Array.isArray(content)) {
            return content; 
        } else {
            return [{ role: 'model', content: content }];
        }
    },

    // ==========================================
    // UTILIDADES DE TEXTO Y TABLAS
    // ==========================================

    parseTable(lines) {
        const rows = lines.map(l => l.split('|').map(c => c.trim()).slice(1, -1));
        if (rows.length < 3) return { headers: [], body: [] };
        
        const headers = rows[0];
        const body = rows.slice(2); 
        return { headers, body };
    },

    // Limpia el Markdown crudo para las celdas del PDF
    cleanMarkdownText(text) {
        let clean = text.replace(/\[(.*?)\]\((.*?)\)/g, '$1'); // Deja solo el texto del enlace
        clean = clean.replace(/\*\*/g, ''); // Quita los asteriscos
        return clean;
    },

    // Generador de Texto Rico (Negritas y Enlaces) para DOCX
    createDocxRichText(textToProcess, docxLib, fontSize = 22) {
        const { TextRun, ExternalHyperlink } = docxLib;
        const runs = [];
        const regex = /(\*\*.*?\*\*|\[.*?\]\(.*?\))/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(textToProcess)) !== null) {
            // Texto normal antes de la coincidencia
            if (match.index > lastIndex) {
                runs.push(new TextRun({ text: textToProcess.substring(lastIndex, match.index), size: fontSize }));
            }

            const token = match[0];
            if (token.startsWith('**')) {
                // Es Negrita
                runs.push(new TextRun({ text: token.substring(2, token.length - 2), bold: true, color: "1D3557", size: fontSize }));
            } else if (token.startsWith('[')) {
                // Es un Enlace
                const linkMatch = token.match(/\[(.*?)\]\((.*?)\)/);
                if (linkMatch) {
                    runs.push(new ExternalHyperlink({
                        children: [new TextRun({ text: linkMatch[1], color: "0284C7", style: "Hyperlink", size: fontSize })],
                        link: linkMatch[2]
                    }));
                }
            }
            lastIndex = regex.lastIndex;
        }
        
        // Añadir el texto restante
        if (lastIndex < textToProcess.length) {
            runs.push(new TextRun({ text: textToProcess.substring(lastIndex), size: fontSize }));
        }

        return runs;
    },

    // ==========================================
    // EXPORTACIÓN A PDF 
    // ==========================================
    async downloadPDF(fname, title, rawContent) { 
        const doc = new jsPDF(); 
        const margin = 15;
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const maxWidth = pageWidth - (margin * 2);
        let y = 20;

        // --- ENCABEZADO ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(29, 53, 87);
        doc.text("PIDA", margin, y);
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text("Plataforma de Investigación y Defensa Avanzada", margin + 25, y);
        y += 10;
        doc.setDrawColor(29, 53, 87);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text(title || "Reporte Generado", margin, y);
        y += 6;
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(`Fecha: ${new Date().toLocaleString()} | pida-ai.com`, margin, y);
        y += 15; 

        const messages = this.normalizeContent(rawContent);

        messages.forEach(msg => {
            if (y > pageHeight - 25) { doc.addPage(); y = 20; }

            const isPida = msg.role === 'model';
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(isPida ? 29 : 80, isPida ? 53 : 80, isPida ? 87 : 80); 
            doc.text(isPida ? "RESPUESTA PIDA" : "CONSULTA INVESTIGADOR", margin, y);
            y += 6;

            const lines = msg.content.split('\n');
            let tableBuffer = []; 

            lines.forEach((line, index) => {
                let text = line.trim();

                if (text.startsWith('|') && text.endsWith('|')) {
                    tableBuffer.push(text);
                    if (index === lines.length - 1) {
                        this._drawPdfTable(doc, tableBuffer, margin, y);
                        y = doc.lastAutoTable.finalY + 5;
                        tableBuffer = [];
                    }
                    return; 
                } else if (tableBuffer.length > 0) {
                    this._drawPdfTable(doc, tableBuffer, margin, y);
                    y = doc.lastAutoTable.finalY + 5;
                    tableBuffer = [];
                }

                if (!text) { y += 3; return; }

                let isQuote = text.startsWith('>');
                if (isQuote) text = text.substring(1).trim();

                let isHeader = text.startsWith('#');
                if (isHeader) text = text.replace(/^#+\s/, '');

                text = this.cleanMarkdownText(text);

                if (isHeader) {
                    doc.setFont("helvetica", "bold"); doc.setTextColor(29, 53, 87); doc.setFontSize(11);
                } else if (isQuote) {
                    doc.setFont("helvetica", "italic"); doc.setTextColor(51, 65, 85); doc.setFontSize(10);
                } else {
                    doc.setFont("helvetica", "normal"); doc.setTextColor(0); doc.setFontSize(10);
                }

                const splitLines = doc.splitTextToSize(text, isQuote ? maxWidth - 10 : maxWidth);

                splitLines.forEach(sl => {
                    if (y > pageHeight - 15) { doc.addPage(); y = 20; }
                    if (isQuote) {
                        doc.setDrawColor(29, 53, 87); doc.setLineWidth(0.8);
                        doc.line(margin, y - 3, margin, y + 1); 
                        doc.text(sl, margin + 4, y);
                    } else {
                        doc.text(sl, margin, y);
                    }
                    y += 5; 
                });
                y += 2; 
            });
            y += 10; 
        });

        doc.save(fname + ".pdf"); 
    },

    // Helper para dibujar la tabla en PDF limpiando el contenido
    _drawPdfTable(doc, tableBuffer, margin, startY) {
        const tableData = this.parseTable(tableBuffer);
        
        // Limpiamos los encabezados y celdas antes de enviarlos a AutoTable
        const cleanHeaders = tableData.headers.map(h => this.cleanMarkdownText(h));
        const cleanBody = tableData.body.map(row => row.map(cell => this.cleanMarkdownText(cell)));

        autoTable(doc, {
            startY: startY,
            head: [cleanHeaders],
            body: cleanBody,
            theme: 'grid',
            headStyles: { fillColor: [29, 53, 87] },
            margin: { left: margin, right: margin },
            styles: { fontSize: 9 }
        });
    },

    // ==========================================
    // EXPORTACIÓN A DOCX 
    // ==========================================
    async downloadDOCX(fname, title, rawContent) { 
        const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ShadingType, Table, TableRow, TableCell, WidthType } = docx; 
        
        const docChildren = [];
        const messages = this.normalizeContent(rawContent);

        docChildren.push(
            new Paragraph({ text: title || "Documento PIDA", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 300 } })
        );

        messages.forEach(msg => {
            const isPida = msg.role === 'model';
            docChildren.push(
                new Paragraph({
                    children: [ new TextRun({ text: isPida ? "PIDA" : "INVESTIGADOR", bold: true, color: isPida ? "1D3557" : "666666", size: 24 }) ],
                    spacing: { before: 200, after: 100 },
                    border: { bottom: { color: "CCCCCC", space: 1, value: "single", size: 6 } }
                })
            );

            const lines = msg.content.split('\n');
            let tableBuffer = []; 

            lines.forEach((line, index) => {
                const trimmed = line.trim();

                if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                    tableBuffer.push(trimmed);
                    if (index === lines.length - 1) {
                        docChildren.push(this._createDocxTable(this.parseTable(tableBuffer), docx));
                        tableBuffer = [];
                    }
                    return;
                } else if (tableBuffer.length > 0) {
                    docChildren.push(this._createDocxTable(this.parseTable(tableBuffer), docx));
                    docChildren.push(new Paragraph({ text: "", spacing: { after: 100 } })); 
                    tableBuffer = [];
                }

                if (!trimmed) {
                    docChildren.push(new Paragraph({ text: "", spacing: { after: 100 } }));
                    return;
                }

                let isQuote = false;
                let textToProcess = trimmed;
                
                if (trimmed.startsWith('>')) {
                    isQuote = true;
                    textToProcess = textToProcess.substring(1).trim();
                }

                let headingLevel = null;
                if (textToProcess.startsWith('### ')) { headingLevel = HeadingLevel.HEADING_3; textToProcess = textToProcess.substring(4); }
                else if (textToProcess.startsWith('## ')) { headingLevel = HeadingLevel.HEADING_2; textToProcess = textToProcess.substring(3); }
                else if (textToProcess.startsWith('# ')) { headingLevel = HeadingLevel.HEADING_1; textToProcess = textToProcess.substring(2); }

                // Usamos nuestra nueva función helper para los párrafos normales
                const runs = this.createDocxRichText(textToProcess, docx, 22);

                const pOptions = { children: runs, spacing: { after: 120 } };
                if (headingLevel) pOptions.heading = headingLevel;
                
                if (isQuote) {
                    pOptions.shading = { type: ShadingType.CLEAR, color: "auto", fill: "F8FAFC" }; 
                    pOptions.border = { left: { color: "1D3557", space: 1, value: "single", size: 12 } }; 
                    pOptions.indent = { left: 300, right: 100 };
                }

                docChildren.push(new Paragraph(pOptions));
            });
        });

        const doc = new Document({ sections: [{ children: docChildren }] }); 

        Packer.toBlob(doc).then(b => {
            const u = URL.createObjectURL(b);
            const a = document.createElement('a');
            a.href = u;
            a.download = fname + ".docx";
            a.click();
        }); 
    },

    // Constructor privado para las tablas de Word con soporte Rich Text
    _createDocxTable(tableData, docxLib) {
        const { Table, TableRow, TableCell, Paragraph, WidthType, ShadingType } = docxLib;

        const headerRow = new TableRow({
            children: tableData.headers.map(header => new TableCell({
                // Usamos la función helper pero forzamos el texto a blanco para que contraste con el fondo azul
                children: [new Paragraph({ 
                    children: this.createDocxRichText(header, docxLib, 20).map(run => {
                        run.options.color = "FFFFFF"; // Forzamos blanco en encabezados
                        return run;
                    }),
                    alignment: docxLib.AlignmentType.CENTER
                })],
                shading: { type: ShadingType.CLEAR, color: "auto", fill: "1D3557" }, 
                margins: { top: 100, bottom: 100, left: 100, right: 100 }
            }))
        });

        const dataRows = tableData.body.map(row => new TableRow({
            children: row.map(cell => new TableCell({
                // ¡Aquí está la magia! Evaluamos el contenido de cada celda con nuestra función helper
                children: [new Paragraph({ 
                    children: this.createDocxRichText(cell, docxLib, 20) 
                })],
                margins: { top: 100, bottom: 100, left: 100, right: 100 }
            }))
        }));

        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
        });
    },

    // ==========================================
    // EXPORTACIÓN A TXT 
    // ==========================================
    downloadTXT(fname, title, rawContent) { 
        let t = (title || "Documento PIDA") + "\n====================================\n\n";
        const messages = this.normalizeContent(rawContent);
        
        messages.forEach(c => {
            const role = c.role === 'model' ? "PIDA" : "INVESTIGADOR";
            let clean = this.cleanMarkdownText(c.content); // Reusamos el helper del PDF
            clean = clean.replace(/^#+\s/gm, ''); 
            t += `[${role}]:\n${clean}\n\n------------------------------------\n\n`;
        });

        const b = new Blob([t]); 
        const u = URL.createObjectURL(b); 
        const a = document.createElement('a');
        a.href = u;
        a.download = fname + ".txt";
        a.click(); 
    }
};

export const getTimestampedName = (prefix) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-').substring(0, 5);
    return `${prefix}_${dateStr}_${timeStr}`;
};