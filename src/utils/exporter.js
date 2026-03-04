import { jsPDF } from "jspdf";
import * as docx from "docx";

export const Exporter = {
    // Limpia el Markdown para impresión (quita **, ##, __)
    cleanText(text) {
        if (!text) return "";
        return text
            .replace(/\*\*/g, "")      // Negritas
            .replace(/__/g, "")        // Cursivas
            .replace(/^#+\s/gm, "")    // Títulos (## Título)
            .replace(/^\* /gm, "• ")   // Viñetas
            .replace(/\[/g, "(")       // Corchetes
            .replace(/\]/g, ")");
    },

    // Normaliza la entrada (sea Chat array o texto único)
    normalizeContent(content) {
        if (Array.isArray(content)) {
            return content; 
        } else {
            return [{ role: 'model', content: content }];
        }
    },

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
        doc.setTextColor(29, 53, 87); // Azul PIDA (#1D3557)
        doc.text("PIDA", margin, y);
        
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text("Plataforma de Investigación y Defensa Avanzada", margin + 25, y);

        y += 10;
        doc.setDrawColor(29, 53, 87);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y); // Línea azul

        y += 10;
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text(title || "Reporte Generado", margin, y);
        
        y += 6;
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(`Fecha: ${new Date().toLocaleString()} | pida-ai.com`, margin, y);
        
        y += 15; // Espacio antes del contenido

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
            y += 5;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.setTextColor(0); 

            const cleanContent = this.cleanText(msg.content);
            const lines = doc.splitTextToSize(cleanContent, maxWidth);

            if (y + (lines.length * 5) > pageHeight - 15) {
                lines.forEach(line => {
                    if (y > pageHeight - 15) { doc.addPage(); y = 20; }
                    doc.text(line, margin, y);
                    y += 5; 
                });
            } else {
                doc.text(lines, margin, y);
                y += (lines.length * 5);
            }
            y += 10; 
        });

        doc.save(fname + ".pdf"); 
    },

    async downloadDOCX(fname, title, rawContent) { 
        const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx; 
        
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
                    children: [
                        new TextRun({ text: roleName, bold: true, color: roleColor, size: 24 })
                    ],
                    spacing: { before: 200, after: 100 },
                    border: { bottom: { color: "CCCCCC", space: 1, value: "single", size: 6 } }
                })
            );

            const cleanContent = this.cleanText(msg.content);
            const paragraphs = cleanContent.split('\n');
            
            paragraphs.forEach(pText => {
                if(pText.trim()) {
                    docChildren.push(
                        new Paragraph({
                            children: [ new TextRun({ text: pText.trim(), size: 22 }) ],
                            spacing: { after: 120 }
                        })
                    );
                }
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

    downloadTXT(fname, title, rawContent) { 
        let t = (title || "Documento PIDA") + "\n";
        t += "====================================\n\n";
        
        const messages = this.normalizeContent(rawContent);
        
        messages.forEach(c => {
            const role = c.role === 'model' ? "PIDA" : "INVESTIGADOR";
            const cleanContent = this.cleanText(c.content);
            t += `[${role}]:\n${cleanContent}\n\n------------------------------------\n\n`;
        });

        const b = new Blob([t]); 
        const u = URL.createObjectURL(b); 
        const a = document.createElement('a');
        a.href = u;
        a.download = fname + ".txt";
        a.click(); 
    }
};

// Generador de nombres de archivo
export const getTimestampedName = (prefix) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-').substring(0, 5);
    return `${prefix}_${dateStr}_${timeStr}`;
};