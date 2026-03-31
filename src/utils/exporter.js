import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable'; // <-- IMPORTANTE AÑADIR ESTO
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

    // Función auxiliar para convertir líneas Markdown en datos de tabla
    parseTable(lines) {
        const rows = lines.map(l => l.split('|').map(c => c.trim()).slice(1, -1));
        if (rows.length < 3) return { headers: [], body: [] };
        
        const headers = rows[0];
        const body = rows.slice(2); // Saltamos la fila 1 que suele ser |---|---|
        return { headers, body };
    },

    // ==========================================
    // EXPORTACIÓN A PDF (Estilizado)
    // ==========================================
    async downloadPDF(fname, title, rawContent) { 
        const doc = new jsPDF(); 
        const margin = 15;
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const maxWidth = pageWidth - (margin * 2);
        let y = 20;

        // --- ENCABEZADO CORPORATIVO ---
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

        // --- CUERPO DEL DOCUMENTO ---
        messages.forEach(msg => {
            if (y > pageHeight - 25) { doc.addPage(); y = 20; }

            const isPida = msg.role === 'model';
            const roleName = isPida ? "RESPUESTA PIDA" : "CONSULTA INVESTIGADOR";
            
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            if (isPida) doc.setTextColor(29, 53, 87); 
            else doc.setTextColor(80); 
            
            doc.text(roleName, margin, y);
            y += 6;

            const lines = msg.content.split('\n');
            let tableBuffer = []; // <-- BUFFER PARA TABLAS

            lines.forEach((line, index) => {
                let text = line.trim();

                // DETECCIÓN DE TABLAS
                if (text.startsWith('|') && text.endsWith('|')) {
                    tableBuffer.push(text);
                    // Si es la última línea del mensaje y tenemos una tabla, la renderizamos
                    if (index === lines.length - 1) {
                        const tableData = this.parseTable(tableBuffer);
                        autoTable(doc, {
                            startY: y,
                            head: [tableData.headers],
                            body: tableData.body,
                            theme: 'grid',
                            headStyles: { fillColor: [29, 53, 87] },
                            margin: { left: margin, right: margin }
                        });
                        y = doc.lastAutoTable.finalY + 5;
                        tableBuffer = [];
                    }
                    return; 
                } else if (tableBuffer.length > 0) {
                    // Si encontramos texto normal pero teníamos una tabla en memoria, la dibujamos
                    const tableData = this.parseTable(tableBuffer);
                    autoTable(doc, {
                        startY: y,
                        head: [tableData.headers],
                        body: tableData.body,
                        theme: 'grid',
                        headStyles: { fillColor: [29, 53, 87] },
                        margin: { left: margin, right: margin }
                    });
                    y = doc.lastAutoTable.finalY + 5;
                    tableBuffer = [];
                }

                if (!text) { y += 3; return; }

                let isQuote = false;
                if (text.startsWith('>')) {
                    isQuote = true;
                    text = text.substring(1).trim();
                }

                let isHeader = false;
                if (text.startsWith('#')) {
                    isHeader = true;
                    text = text.replace(/^#+\s/, '');
                }

                text = text.replace(/\[(.*?)\]\((.*?)\)/g, '$1');
                text = text.replace(/\*\*/g, ''); 

                if (isHeader) {
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(29, 53, 87);
                    doc.setFontSize(11);
                } else if (isQuote) {
                    doc.setFont("helvetica", "italic");
                    doc.setTextColor(51, 65, 85);
                    doc.setFontSize(10);
                } else {
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(0);
                    doc.setFontSize(10);
                }

                const splitLines = doc.splitTextToSize(text, isQuote ? maxWidth - 10 : maxWidth);

                splitLines.forEach(sl => {
                    if (y > pageHeight - 15) { doc.addPage(); y = 20; }
                    
                    if (isQuote) {
                        doc.setDrawColor(29, 53, 87);
                        doc.setLineWidth(0.8);
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

    // ==========================================
    // EXPORTACIÓN A DOCX (Word Rico y Formateado)
    // ==========================================
    async downloadDOCX(fname, title, rawContent) { 
        // IMPORTANTE: Añadidos Table, TableRow, TableCell y WidthType
        const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ExternalHyperlink, ShadingType, Table, TableRow, TableCell, WidthType } = docx; 
        
        const docChildren = [];
        const messages = this.normalizeContent(rawContent);

        docChildren.push(
            new Paragraph({
                text: title || "Documento PIDA",
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: { after: 300 }
            })
        );

        messages.forEach(msg => {
            const isPida = msg.role === 'model';
            const roleName = isPida ? "PIDA" : "INVESTIGADOR";
            const roleColor = isPida ? "1D3557" : "666666"; 

            docChildren.push(
                new Paragraph({
                    children: [ new TextRun({ text: roleName, bold: true, color: roleColor, size: 24 }) ],
                    spacing: { before: 200, after: 100 },
                    border: { bottom: { color: "CCCCCC", space: 1, value: "single", size: 6 } }
                })
            );

            const lines = msg.content.split('\n');
            let tableBuffer = []; // <-- BUFFER PARA TABLAS

            lines.forEach((line, index) => {
                const trimmed = line.trim();

                // DETECCIÓN DE TABLAS
                if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                    tableBuffer.push(trimmed);
                    if (index === lines.length - 1) {
                        const tableData = this.parseTable(tableBuffer);
                        docChildren.push(this._createDocxTable(tableData, docx));
                        tableBuffer = [];
                    }
                    return;
                } else if (tableBuffer.length > 0) {
                    const tableData = this.parseTable(tableBuffer);
                    docChildren.push(this._createDocxTable(tableData, docx));
                    docChildren.push(new Paragraph({ text: "", spacing: { after: 100 } })); // Espacio post-tabla
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

                const runs = [];
                const regex = /(\*\*.*?\*\*|\[.*?\]\(.*?\))/g;
                let lastIndex = 0;
                let match;

                while ((match = regex.exec(textToProcess)) !== null) {
                    if (match.index > lastIndex) {
                        runs.push(new TextRun({ text: textToProcess.substring(lastIndex, match.index), size: 22 }));
                    }

                    const token = match[0];
                    if (token.startsWith('**')) {
                        runs.push(new TextRun({ text: token.substring(2, token.length - 2), bold: true, color: "1D3557", size: 22 }));
                    } else if (token.startsWith('[')) {
                        const linkMatch = token.match(/\[(.*?)\]\((.*?)\)/);
                        if (linkMatch) {
                            runs.push(new ExternalHyperlink({
                                children: [new TextRun({ text: linkMatch[1], color: "0284C7", style: "Hyperlink", size: 22 })],
                                link: linkMatch[2]
                            }));
                        }
                    }
                    lastIndex = regex.lastIndex;
                }
                
                if (lastIndex < textToProcess.length) {
                    runs.push(new TextRun({ text: textToProcess.substring(lastIndex), size: 22 }));
                }

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

    // Constructor privado para las tablas de Word
    _createDocxTable(tableData, docxLib) {
        const { Table, TableRow, TableCell, Paragraph, TextRun, WidthType, ShadingType } = docxLib;

        // Crear Fila de Encabezados
        const headerRow = new TableRow({
            children: tableData.headers.map(header => new TableCell({
                children: [new Paragraph({ 
                    children: [new TextRun({ text: header, bold: true, color: "FFFFFF" })],
                    alignment: docxLib.AlignmentType.CENTER
                })],
                shading: { type: ShadingType.CLEAR, color: "auto", fill: "1D3557" }, // Fondo azul PIDA
                margins: { top: 100, bottom: 100, left: 100, right: 100 }
            }))
        });

        // Crear Filas de Datos
        const dataRows = tableData.body.map(row => new TableRow({
            children: row.map(cell => new TableCell({
                children: [new Paragraph({ text: cell })],
                margins: { top: 100, bottom: 100, left: 100, right: 100 }
            }))
        }));

        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
        });
    },

    // ==========================================
    // EXPORTACIÓN A TXT (Limpio)
    // ==========================================
    downloadTXT(fname, title, rawContent) { 
        let t = (title || "Documento PIDA") + "\n";
        t += "====================================\n\n";
        
        const messages = this.normalizeContent(rawContent);
        
        messages.forEach(c => {
            const role = c.role === 'model' ? "PIDA" : "INVESTIGADOR";
            let clean = c.content.replace(/\[(.*?)\]\((.*?)\)/g, '$1: $2');
            clean = clean.replace(/\*\*/g, ''); 
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