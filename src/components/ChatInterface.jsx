import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Exporter, getTimestampedName } from '../utils/exporter';

// Importaciones de Material-UI añadidas
import { Box, TextField, Button, ButtonGroup, Fab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

const API_CHAT = "https://chat-v20-strong-465781488910.us-central1.run.app";

export default function ChatInterface({ user, resetSignal, loadChatId, refreshHistory }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatId, setChatId] = useState(null);
  
  // =========================================================================
  // REFS Y ESTADOS PARA EL SMART SCROLLING
  // =========================================================================
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
    a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />,
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

  const renderMessageContent = (msg, index) => {
    if (msg.role === 'user') {
      return <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{msg.content}</ReactMarkdown>;
    }

    const regex = /(?:#{2,3}\s*|\*\*\s*)?Preguntas de Seguimiento\s*(?:\*\*|:)?/i;
    const match = msg.content.match(regex);
    const isCurrentlyTypingThis = isTyping && index === messages.length - 1;

    if (match && !isCurrentlyTypingThis) {
      const mainContent = msg.content.substring(0, match.index);
      const afterHeading = msg.content.substring(match.index + match[0].length);
      
      const lines = afterHeading.split('\n');
      const questions = [];
      const leftoverLines = [];

      for (const line of lines) {
        const trimmed = line.trim();
        const isQuestion = /^([-*•]|\d+[.)])\s*/.test(trimmed) || trimmed.startsWith('¿') || trimmed.endsWith('?');
        const isLinkOrSource = /\[.*\]\(http|\bhttps?:\/\//i.test(trimmed) || trimmed.toLowerCase().includes('fuente:') || trimmed.startsWith('-');

        if (isQuestion && questions.length < 3 && !isLinkOrSource && trimmed.length > 5) {
          questions.push(trimmed.replace(/^[-*•0-9.)]+\s*/, '').replace(/["*]/g, '').trim());
        } else {
          leftoverLines.push(line);
        }
      }

      let textAfterQuestions = leftoverLines.join('\n').trim();
      textAfterQuestions = textAfterQuestions.replace(/Fuentes Consultadas/gi, "Otras Fuentes Consultadas");
      textAfterQuestions = textAfterQuestions.replace(/Fuentes y Jurisprudencia/gi, "Otras Fuentes Consultadas");

      return (
        <>
          <div className="markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{mainContent}</ReactMarkdown>
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

          {textAfterQuestions && (
            <div className="markdown-content" style={{ marginTop: '20px' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{textAfterQuestions}</ReactMarkdown>
            </div>
          )}
        </>
      );
    }

    return (
      <div className="markdown-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{msg.content}</ReactMarkdown>
      </div>
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

      {/* Mantenemos tu clase original <form className="pida-view-form"> para conservar los márgenes exactos */}
      <form className="pida-view-form" onSubmit={(e) => handleSend(e)}>
        
        {/* Controles de Descarga agrupados con ButtonGroup de MUI */}
        {messages.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
            <ButtonGroup size="small" variant="outlined" color="inherit" sx={{ borderColor: '#e2e8f0', bgcolor: 'white' }}>
              <Button sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }} onClick={() => Exporter.downloadTXT(getTimestampedName("Experto-PIDA"), "Reporte Experto Jurídico", messages)}>TXT</Button>
              <Button sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }} onClick={() => Exporter.downloadDOCX(getTimestampedName("Experto-PIDA"), "Reporte Experto Jurídico", messages)}>DOCX</Button>
              <Button sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }} onClick={() => Exporter.downloadPDF(getTimestampedName("Experto-PIDA"), "Reporte Experto Jurídico", messages)}>PDF</Button>
            </ButtonGroup>
          </Box>
        )}

        {/* Input con TextField de MUI, auto-crecimiento hasta 5 líneas */}
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
        
        {/* Botones de Limpiar y Enviar de MUI */}
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