import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw'; 
import { Exporter, getTimestampedName } from '../utils/exporter';

import { Box, TextField, Button, ButtonGroup, Fab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip, CircularProgress, Typography } from '@mui/material';

const API_CHAT = "https://chat-v20-perplexity-465781488910.us-central1.run.app";

// =========================================================================
// COMPONENTE DE TARJETA DE PREVISUALIZACIÓN (ESTILO MINIMALISTA PROFESIONAL)
// =========================================================================
const PreviewLink = ({ href, children, node, title, ...props }) => {
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [isScrapeBlocked, setIsScrapeBlocked] = useState(false);

  // Extraemos el dominio limpio para mostrarlo siempre
  let hostname = "";
  try { hostname = new URL(href).hostname.replace('www.', ''); } catch (e) {}

  const fetchPreview = async () => {
    if (fetched || !href || !href.startsWith('http')) return;
    setFetched(true);
    setLoading(true);
    try {
      const cleanHref = href.replace(/[\.\)]+$/, '');
      const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(cleanHref)}`);
      const data = await res.json();

      if (data.status === 'success') {
        const returnedTitle = (data.data.title || '').toLowerCase();
        // Filtro estricto para bloquear páginas de error de Cloudflare/WAF como el de la ONU
        const blockedKeywords = ['error:', 'could not be satisfied', 'cloudflare', 'attention required', 'access denied', '403 forbidden', 'not acceptable'];

        if (blockedKeywords.some(kw => returnedTitle.includes(kw))) {
          setIsScrapeBlocked(true);
        } else {
          setPreviewData(data.data);
        }
      } else {
        setIsScrapeBlocked(true);
      }
    } catch (e) {
      console.error("Error cargando preview:", e);
      setIsScrapeBlocked(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip
      placement="top"
      arrow
      enterDelay={300}
      onOpen={fetchPreview}
      PopperProps={{ sx: { zIndex: 999999 } }}
      title={
        <Box sx={{ width: 300, p: 0.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} sx={{ color: '#60a5fa' }} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              
              {/* Encabezado: Logotipo pequeño (Favicon) + URL */}
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

              {/* Cuerpo de la tarjeta: Dinámico según si hubo error o éxito */}
              {!isScrapeBlocked && previewData ? (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', lineHeight: 1.3, color: 'white' }}>
                    {previewData.title || "Fuente de información"}
                  </Typography>
                  {previewData.description && (
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#cbd5e1', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', mt: 0.5 }}>
                      {previewData.description}
                    </Typography>
                  )}
                </>
              ) : (
                // Fallback Elegante: Si la ONU u otro sitio bloquea el acceso, mostramos esto
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', lineHeight: 1.3, color: 'white' }}>
                    Documento Institucional Externo
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#cbd5e1', mt: 0.5 }}>
                    Haz clic para acceder y validar la información directamente en el sitio web original.
                  </Typography>
                </>
              )}
            </Box>
          )}
        </Box>
      }
      componentsProps={{
        tooltip: {
          sx: {
            bgcolor: '#0f172a', // Un azul casi negro, muy premium
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7)',
            borderRadius: '8px',
            border: '1px solid #334155',
            p: 1.5,
          }
        },
        arrow: {
          sx: { color: '#0f172a' }
        }
      }}
    >
      <span style={{ display: 'inline' }}>
        <a 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ color: 'var(--pida-primary)', textDecoration: 'underline', fontWeight: 600, cursor: 'pointer' }}
          {...props}
        >
          {children}
        </a>
      </span>
    </Tooltip>
  );
};

export default function ChatInterface({ user, resetSignal, loadChatId, refreshHistory }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatId, setChatId] = useState(null);
  
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
              if (data.text) {
                
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

  // =========================================================================
  // RENDERIZADO PROFESIONAL (PARSER ESTRUCTURADO)
  // =========================================================================
  const renderMessageContent = (msg, index) => {
    if (msg.role === 'user') {
      return <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>{msg.content}</ReactMarkdown>;
    }

    const isCurrentlyTypingThis = isTyping && index === messages.length - 1;
    let displayContent = msg.content;
    let questions = [];

    // Buscamos la etiqueta estructurada
    const tagStart = "<pida_questions>";
    const tagEnd = "</pida_questions>";

    if (displayContent.includes(tagStart)) {
      const parts = displayContent.split(tagStart);
      let textBeforeTags = parts[0];
      let textInsideAndAfter = parts[1] || "";
      
      let qString = "";
      let textAfterTags = ""; // Aquí guardaremos lo que inyecta Vertex AI

      if (textInsideAndAfter.includes(tagEnd)) {
        // Separamos lo que son preguntas de lo que Vertex puso al final
        const subParts = textInsideAndAfter.split(tagEnd);
        qString = subParts[0]; 
        textAfterTags = subParts.slice(1).join(tagEnd); 
      } else {
        qString = textInsideAndAfter;
      }

      // Reconstruimos el Markdown: Texto Principal + (Saltamos las preguntas) + Fuentes de Vertex
      displayContent = textBeforeTags + "\n" + textAfterTags;

      // Solo mostramos los botones si ya terminó de escribir la etiqueta de cierre
      if (!isCurrentlyTypingThis && textInsideAndAfter.includes(tagEnd)) {
        questions = qString.split('|').map(q => q.trim()).filter(q => q.length > 0);
      }
    }

    // Limpieza de alucinaciones de formato en tablas
    displayContent = displayContent.replace(/["']br["']/g, '<br />');

    // 👇 NUEVO ESCUDO DE SEGURIDAD FRONTEND 👇
    // Previene que tablas rotas o código crudo arruinen la vista de la sección de Fuentes.
    if (displayContent.includes('## Fuentes y Jurisprudencia')) {
      const splitPoint = '## Fuentes y Jurisprudencia';
      const parts = displayContent.split(splitPoint);
      let fuentesText = parts[1];
      
      // Eliminar formato separador de tablas de Markdown (ej. |:---| o |---|)
      fuentesText = fuentesText.replace(/\|?\s*:?-{2,}:?\s*\|?/g, '');
      // Reemplazar barras verticales por un separador visual limpio
      fuentesText = fuentesText.replace(/\|/g, ' • ');
      
      displayContent = parts[0] + splitPoint + fuentesText;
    }
    // 👆 FIN DEL ESCUDO 👆

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
                  <p>Estoy para apoyarte y responder cualquier pregunta que me hagas, incluyendo investigaciones, análisis de casos, búsqueda de jurisprudencia y redacción legal de todo tipo de documentos, cartas, informes, elaboración de proyectos y seguimiento y monitoreo.</p>
                  <strong>¿Qué te gustaría pedirme ahora?</strong>
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
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} style={{ height: '1px' }} />
        </div>
      </div>

      {/* FAB de MUI para Scroll To Bottom */}
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
            backgroundColor: '#0056B3',
            '&:hover': { backgroundColor: '#004494', opacity: 1 }
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
              <Button sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }} onClick={() => Exporter.downloadTXT(getTimestampedName("Experto-PIDA"), "Reporte Experto Jurídico", messages)}>TXT</Button>
              <Button sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }} onClick={() => Exporter.downloadDOCX(getTimestampedName("Experto-PIDA"), "Reporte Experto Jurídico", messages)}>DOCX</Button>
              <Button sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }} onClick={() => Exporter.downloadPDF(getTimestampedName("Experto-PIDA"), "Reporte Experto Jurídico", messages)}>PDF</Button>
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
            sx={{ px: 4, py: 1.2, borderRadius: 2, fontWeight: 600, bgcolor: 'var(--pida-accent)', '&:hover': { bgcolor: '#004494' } }}
          >
            Enviar
          </Button>
        </Box>
      </form>
    </div>
  );
}