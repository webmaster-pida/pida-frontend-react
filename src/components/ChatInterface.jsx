import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw'; 
import { Exporter, getTimestampedName } from '../utils/exporter';

import { Box, TextField, Button, ButtonGroup, Fab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip, CircularProgress, Typography } from '@mui/material';

// Importación para procesar el Markdown en el PDF frontend
import { marked } from 'marked';

const API_CHAT = "https://chat-v20-genai-465781488910.us-central1.run.app";

const PreviewLink = ({ href, children, node, title, ...props }) => {
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchedUrl, setFetchedUrl] = useState(null);
  const [isScrapeBlocked, setIsScrapeBlocked] = useState(false); 

  const MICROLINK_API_KEY = import.meta.env.VITE_MICROLINK_KEY || "";

  let hostname = "";
  try { hostname = new URL(href).hostname.replace('www.', ''); } catch (e) {}

  const fetchPreview = async () => {
    if (!href || !href.startsWith('http') || fetchedUrl === href) return;
    
    setFetchedUrl(href); 
    setLoading(true);
    setIsScrapeBlocked(false);

    try {
      const cleanHref = href.replace(/[\.\)]+$/, '');
      const res = await fetch(`https://pro.microlink.io?url=${encodeURIComponent(cleanHref)}`, {
        headers: MICROLINK_API_KEY ? { 'x-api-key': MICROLINK_API_KEY } : {}
      });
      
      const data = await res.json();

      if (data.status === 'success') {
        const returnedTitle = (data.data.title || '').toLowerCase();
        const blockedKeywords = ['error:', 'could not be satisfied', 'cloudflare', 'attention required', 'access denied', '403 forbidden', 'not acceptable', 'security check'];

        if (blockedKeywords.some(kw => returnedTitle.includes(kw))) {
          setIsScrapeBlocked(true); 
        } else {
          setPreviewData(data.data);
        }
      } else {
        setIsScrapeBlocked(true);
      }
    } catch (e) {
      setIsScrapeBlocked(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPreview();
    }, 1500);
    return () => clearTimeout(timer);
  }, [href]);

  return (
    <Tooltip
      placement="top"
      arrow
      enterDelay={100} 
      PopperProps={{ sx: { zIndex: 999999 } }}
      title={
        <Box sx={{ width: 380, p: 0.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} sx={{ color: '#60a5fa' }} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <img 
                  src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`} 
                  alt="icon" 
                  style={{ width: 16, height: 16, borderRadius: '2px', backgroundColor: 'white' }} 
                />
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                  {hostname}
                </Typography>
              </Box>

              {!isScrapeBlocked && previewData ? (
                <>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      fontWeight: 'bold', lineHeight: 1.3, color: 'white',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                    }}
                  >
                    {previewData.title || "Fuente de información"}
                  </Typography>
                  {previewData.description && (
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontSize: '0.8rem', color: '#cbd5e1', mt: 0.5,
                        display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4
                      }}
                    >
                      {previewData.description}
                    </Typography>
                  )}
                </>
              ) : (
                <Typography variant="body2" sx={{ color: '#cbd5e1', mt: 0.5, fontSize: '0.8rem' }}>
                  Documento Institucional Externo
                </Typography>
              )}
            </Box>
          )}
        </Box>
      }
      slotProps={{
        tooltip: {
          sx: {
            maxWidth: 420, maxHeight: 500, overflowY: 'auto',
            bgcolor: '#0f172a', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7)',
            borderRadius: '8px', border: '1px solid #334155', p: 1.5,
            '&::-webkit-scrollbar': { width: '4px' },
            '&::-webkit-scrollbar-thumb': { backgroundColor: '#334155', borderRadius: '10px' }
          }
        },
        arrow: { sx: { color: '#0f172a' } }
      }}
    >
      <span style={{ display: 'inline' }}>
        <a 
          href={href} target="_blank" rel="noopener noreferrer" 
          style={{ color: 'var(--pida-primary)', textDecoration: 'underline', fontWeight: 600, cursor: 'pointer' }}
          {...props}
        >
          {children}
        </a>
      </span>
    </Tooltip>
  );
}

export default function ChatInterface({ user, resetSignal, loadChatId, refreshHistory }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatId, setChatId] = useState(null);
  
  // Estados para manejo visual de la carga de PDF
  const [isExportingPDF, setIsExportingPDF] = useState(false); 
  
  const [currentStatus, setCurrentStatus] = useState('Iniciando...'); 
  const [statusQueue, setStatusQueue] = useState([]);
  const [isProcessingStatus, setIsProcessingStatus] = useState(false);
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;
      setIsAtBottom(distanceToBottom < 80);
    }
  };

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (statusQueue.length > 0 && !isProcessingStatus) {
      setIsProcessingStatus(true);
      setCurrentStatus(statusQueue[0]); 
      
      setTimeout(() => {
        setStatusQueue(prev => prev.slice(1)); 
        setIsProcessingStatus(false); 
      }, 1200); 
    }
  }, [statusQueue, isProcessingStatus]);

  const markdownComponents = {
    a: ({ node, ...props }) => <PreviewLink href={props.href} {...props}>{props.children}</PreviewLink>,
    table: ({ node, ...props }) => (
      <TableContainer component={Paper} sx={{ my: 2, boxShadow: 'none', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        <Table size="small" {...props} />
      </TableContainer>
    ),
    thead: ({ node, ...props }) => <TableHead sx={{ bgcolor: '#f1f5f9' }} {...props} />,
    tbody: ({ node, ...props }) => <TableBody {...props} />,
    tr: ({ node, ...props }) => <TableRow hover {...props} />,
    th: ({ node, ...props }) => (
      <TableCell 
        sx={{ 
          fontWeight: 'bold', 
          color: 'var(--pida-primary)', 
          borderBottom: '2px solid #cbd5e1',
          whiteSpace: 'nowrap'
        }} 
        {...props} 
      />
    ),
    td: ({ node, ...props }) => (
      <TableCell 
        sx={{ 
          borderColor: '#e2e8f0',
          verticalAlign: 'top'
        }} 
        {...props} 
      />
    )
  };

  useEffect(() => {
    if (resetSignal > 0) {
      setMessages([]);
      setChatId(null);
      setInput('');
      setIsAtBottom(true);
      setStatusQueue([]);
      setIsProcessingStatus(false);
    }
  }, [resetSignal]);

  useEffect(() => {
    if (loadChatId) {
      const loadPastChat = async () => {
        try {
          const token = await user.getIdToken();
          const res = await fetch(`${API_CHAT}/conversations/${loadChatId}/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const msgs = await res.json();
          setChatId(loadChatId);
          setMessages(msgs);
          setIsAtBottom(true);
          setTimeout(() => scrollToBottom('auto'), 100);
        } catch (err) {
          console.error("Error cargando chat", err);
        }
      };
      loadPastChat();
    }
  }, [loadChatId, user]);

  const startConversation = async () => {
    const token = await user.getIdToken();
    const res = await fetch(`${API_CHAT}/conversations`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: "Nuevo Chat" })
    });
    
    if (!res.ok) throw new Error(res.status === 403 ? "Suscripción inactiva." : "Error al crear la conversación.");
    
    const data = await res.json();
    setChatId(data.id);
    return data.id;
  };

  const handleSend = async (e, textOverride = null) => {
    if (e) e.preventDefault();
    
    const textToSend = textOverride || input.trim();
    if (!textToSend || isTyping) return;

    if (!textOverride) setInput('');
    
    setMessages(prev => [...prev, { role: 'user', content: textToSend }]);
    setIsTyping(true);
    setCurrentStatus('Conectando...');
    setStatusQueue([]); 
    
    setIsAtBottom(true);
    setTimeout(() => scrollToBottom(), 50);

    try {
      let currentChatId = chatId;
      let isNewConversation = false;
      
      if (!currentChatId) {
        currentChatId = await startConversation();
        isNewConversation = true; 
      }

      const token = await user.getIdToken();
      
      if (isNewConversation) {
        try {
          await fetch(`${API_CHAT}/conversations/${currentChatId}/title`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: textToSend.substring(0, 40) })
          });
          if (refreshHistory) refreshHistory();
        } catch (err) {
          console.error("Error actualizando título:", err);
        }
      }

      const res = await fetch(`${API_CHAT}/chat-stream/${currentChatId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToSend })
      });

      if (!res.ok) {
        if (res.status === 403 || res.status === 402 || res.status === 429) {
             throw new Error("Has alcanzado tu límite de consultas o tu suscripción no está activa.");
        }
        throw new Error(`Error del servidor (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              if (data.event === 'status' && data.message) {
                setStatusQueue(prev => [...prev, data.message]);
              } 
              else if (data.text) {
                const chars = data.text;
                const step = 10; 
                for (let i = 0; i < chars.length; i += step) {
                  fullText += chars.substring(i, i + step);
                  
                  setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.role === 'model') {
                      return [...prev.slice(0, -1), { ...lastMsg, content: fullText }];
                    } else {
                      return [...prev, { role: 'model', content: fullText }];
                    }
                  });
                  
                  await new Promise(resolve => setTimeout(resolve, 2));
                }
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: `❌ **Ocurrió un problema:** ${error.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  // --- 1. RESTAURACIÓN DE LA FUNCIÓN DEL BACKEND PARA DOCX ---
  const handleBackendDownload = async (format) => {
    if (!chatId) {
      alert("Por favor, interactúa en el chat antes de descargarlo.");
      return;
    }
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append("convo_id", chatId);
      formData.append("file_format", format);

      const res = await fetch(`${API_CHAT}/download-chat`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) throw new Error("Error en el servidor al generar el documento.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${getTimestampedName("Experto_PIDA")}.${format}`; 
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Hubo un problema descargando el archivo.");
    }
  };

  // --- 2. GENERACIÓN NATIVA DE PDF EN EL FRONTEND ---
  const getCleanChatHTML = () => {
    // CORRECCIÓN: Se eliminó el font-family: Arial que provocaba el crash de pdfmake
    let htmlContent = `
      <div style="font-size: 11pt;">
        <h2 style="color: #1e293b; text-align: center;">Reporte Experto Jurídico - PIDA</h2>
        <br/>
    `;

    messages.forEach(msg => {
      const isUser = msg.role === 'user';
      const roleName = isUser ? 'Usuario' : 'Experto PIDA';
      const color = isUser ? '#475569' : '#2563eb';
      
      let cleanText = msg.content.replace(/_Fin del análisis\._/g, "");
      cleanText = cleanText.replace(/<pida_questions>([\s\S]*?)<\/pida_questions>/g, "");
      
      const htmlParsed = marked.parse(cleanText);

      htmlContent += `
        <div style="margin-bottom: 15px;">
          <strong style="color: ${color}; font-size: 12pt;">${roleName}:</strong>
          <div style="margin-top: 5px;">${htmlParsed}</div>
        </div>
        <br/>
      `;
    });

    htmlContent += `</div>`;
    return htmlContent;
  };

  const handleFrontendPDF = async () => {
    if (messages.length === 0) {
      alert("No hay mensajes para exportar.");
      return;
    }
    
    setIsExportingPDF(true); 
    
    try {
      const htmlString = getCleanChatHTML();
      
      // Importación asíncrona para no afectar la carga inicial de Vite
      const pdfMakeModule = await import("pdfmake/build/pdfmake");
      const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
      const htmlToPdfmakeModule = await import("html-to-pdfmake");

      const pdfMake = pdfMakeModule.default || pdfMakeModule;
      const pdfFonts = pdfFontsModule.default || pdfFontsModule;
      const htmlToPdfmake = htmlToPdfmakeModule.default || htmlToPdfmakeModule;

      if (pdfMake && pdfFonts && pdfFonts.pdfMake) {
        pdfMake.vfs = pdfFonts.pdfMake.vfs;
      }
      
      const pdfmakeContent = htmlToPdfmake(htmlString, {
        defaultStyles: {
          p: { margin: [0, 5, 0, 10] },
          h1: { fontSize: 16, bold: true, margin: [0, 10, 0, 5] },
          h2: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
          h3: { fontSize: 12, bold: true, margin: [0, 10, 0, 5] },
          table: { margin: [0, 10, 0, 10] }
        }
      });

      const docDefinition = {
        content: pdfmakeContent,
        defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.2 }, // Usa Roboto por defecto
        pageMargins: [40, 60, 40, 60],
        footer: function(currentPage, pageCount) {
          return { text: `Página ${currentPage} de ${pageCount}`, alignment: 'center', fontSize: 9, margin: [0, 10, 0, 0] };
        }
      };

      pdfMake.createPdf(docDefinition).download(`${getTimestampedName("Experto_PIDA")}.pdf`);
      
    } catch (error) {
      console.error("Error cargando librerías o generando PDF:", error);
      alert("Hubo un problema al generar el PDF.");
    } finally {
      setIsExportingPDF(false); 
    }
  };

  const handleTXTDownload = () => {
    const cleanMessages = messages.map(msg => {
      if (msg.role !== 'model') return msg;
      
      let content = msg.content.replace(/_Fin del análisis\._/g, "");
      
      content = content.replace(/<pida_questions>([\s\S]*?)<\/pida_questions>/g, (match, p1) => {
          const qs = p1.split('|').map(q => q.trim()).filter(q => q);
          if (qs.length === 0) return "";
          return "\n\nPreguntas de seguimiento sugeridas:\n" + qs.map(q => `- ${q}`).join('\n');
      });

      content = content.replace(/^\|?[\s\-:]+\|[\s\-:|]+$/gm, "");

      content = content.replace(/\|/g, " - ");

      content = content.replace(/\*\*/g, "");

      return { ...msg, content };
    });

    Exporter.downloadTXT(getTimestampedName("Experto_PIDA"), "Reporte Experto Jurídico", cleanMessages);
  };

  const renderMessageContent = (msg, index) => {
    if (msg.role === 'user') {
      return <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>{msg.content}</ReactMarkdown>;
    }

    const isCurrentlyTypingThis = isTyping && index === messages.length - 1;
    let displayContent = msg.content;

    displayContent = displayContent.split('\n').map(line => {
      const count = (line.match(/\*\*/g) || []).length;
      if (count % 2 !== 0) {
        return line.replace(/\*\*/g, ''); 
      }
      return line;
    }).join('\n');

    let questions = [];

    const tagStart = "<pida_questions>";
    const tagEnd = "</pida_questions>";

    if (displayContent.includes(tagStart)) {
      const parts = displayContent.split(tagStart);
      let textBeforeTags = parts[0];
      let textInsideAndAfter = parts[1] || "";
      
      let qString = "";
      let textAfterTags = ""; 

      if (textInsideAndAfter.includes(tagEnd)) {
        const subParts = textInsideAndAfter.split(tagEnd);
        qString = subParts[0]; 
        textAfterTags = subParts.slice(1).join(tagEnd); 
      } else {
        qString = textInsideAndAfter;
      }

      displayContent = textBeforeTags + "\n" + textAfterTags;

      if (!isCurrentlyTypingThis && textInsideAndAfter.includes(tagEnd)) {
        questions = qString.split('|').map(q => q.trim()).filter(q => q.length > 0);
      }
    }

    displayContent = displayContent.replace(/["']br["']/g, '<br />');

    if (displayContent.includes('## Fuentes y Jurisprudencia')) {
      const splitPoint = '## Fuentes y Jurisprudencia';
      const parts = displayContent.split(splitPoint);
      let fuentesText = parts[1];
      
      fuentesText = fuentesText.replace(/\|?\s*:?-{2,}:?\s*\|?/g, '');
      fuentesText = fuentesText.replace(/\|/g, ' • ');
      
      displayContent = parts[0] + splitPoint + fuentesText;
    }

    return (
      <>
        <div className="markdown-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
            {displayContent}
          </ReactMarkdown>
        </div>
        
        {questions.length > 0 && (
          <div className="follow-up-section">
            <strong style={{ display: 'block', marginTop: '15px', marginBottom: '10px', color: 'var(--pida-primary)' }}>
              Preguntas de seguimiento sugeridas:
            </strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {questions.map((q, i) => (
                <button 
                  key={i} 
                  className="follow-up-btn"
                  onClick={(e) => handleSend(e, q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="pida-view" style={{ position: 'relative' }}>
      
      <div className="pida-view-content" ref={chatContainerRef} onScroll={handleScroll}>
        <div id="pida-chat-box">
          
          {messages.length === 0 && (
            <div className="pida-bubble pida-message-bubble">
              <div className="pida-welcome-content">
                <div className="pida-welcome-text">
                  <h3>¡Hola! Soy PIDA, tu asistente experto en Derechos Humanos y temas afines.</h3>
                  <p style={{ color: 'var(--text)'}}>Estoy para apoyarte y responder cualquier pregunta que me hagas, incluyendo investigaciones, análisis de casos, búsqueda de jurisprudencia y redacción legal de todo tipo de documentos, cartas, informes, elaboración de proyectos y seguimiento y monitoreo.</p>
                  <strong style={{ color: 'var(--pida-primary)'}}>¿Qué te gustaría pedirme ahora?</strong>
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`pida-bubble ${msg.role === 'user' ? 'user-message-bubble' : 'pida-message-bubble'}`}>
              {renderMessageContent(msg, idx)}
            </div>
          ))}

          {isTyping && (messages.length === 0 || messages[messages.length - 1].role === 'user' || messages[messages.length - 1].content === '') && (
            <div className="pida-bubble pida-message-bubble">
              <Box sx={{ 
                width: '400px', 
                maxWidth: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2, 
                py: 1, 
                px: 2,
                color: '#475569' 
              }}>
                <CircularProgress size={20} sx={{ color: 'var(--pida-primary)' }} />
                <Typography variant="body2" sx={{ fontWeight: 500, fontStyle: 'italic' }}>
                  {currentStatus}
                </Typography>
              </Box>
            </div>
          )}
          
          <div ref={messagesEndRef} style={{ height: '1px' }} />
        </div>
      </div>

      {!isAtBottom && messages.length > 0 && (
        <Fab
          color="primary"
          size="medium"
          onClick={(e) => {
            e.preventDefault();
            setIsAtBottom(true);
            scrollToBottom();
          }}
          sx={{
            position: 'absolute',
            bottom: '120px',
            right: '25px',
            zIndex: 900,
            opacity: 0.9,
            backgroundColor: 'var(--pida-primary)',
            '&:hover': { backgroundColor: 'var(--pida-accent)', opacity: 1 }
          }}
          title="Ir al último mensaje"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <polyline points="19 12 12 19 5 12"></polyline>
          </svg>
        </Fab>
      )}

      <form className="pida-view-form" onSubmit={(e) => handleSend(e)}>
        
        {messages.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
            <ButtonGroup size="small" variant="outlined" color="inherit" sx={{ borderColor: '#e2e8f0', bgcolor: 'white' }}>
              <Button sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }} onClick={handleTXTDownload}>TXT</Button>
              {/* DOCX VUELVE A SER GENERADO PROFESIONALMENTE EN EL BACKEND */}
              <Button sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }} onClick={() => handleBackendDownload('docx')}>DOCX</Button>
              {/* PDF SE GENERA VECTORIALMENTE EN EL FRONTEND */}
              <Button 
                sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }} 
                onClick={handleFrontendPDF}
                disabled={isExportingPDF}
              >
                {isExportingPDF ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CircularProgress size={12} color="inherit" />
                    Generando...
                  </Box>
                ) : (
                  'PDF'
                )}
              </Button>
            </ButtonGroup>
          </Box>
        )}

        <TextField 
          multiline
          minRows={2}
          maxRows={5}
          fullWidth
          placeholder="Consulta a PIDA..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }}
          sx={{ 
            mb: 2, 
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#FAFAFA',
              borderRadius: 2,
            }
          }}
        />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button 
            variant="text" 
            onClick={() => { setMessages([]); setChatId(null); setInput(''); setIsAtBottom(true); }}
            sx={{ color: 'text.secondary', fontWeight: 500, '&:hover': { textDecoration: 'underline', backgroundColor: 'transparent' } }}
          >
            Limpiar
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            disabled={isTyping}
            sx={{ width: 220, py: 1.2, borderRadius: 2, fontWeight: 600, bgcolor: 'var(--pida-primary)', '&:hover': { bgcolor: 'var(--pida-accent)' } }}
          >
            Enviar
          </Button>
        </Box>
      </form>
    </div>
  );
}