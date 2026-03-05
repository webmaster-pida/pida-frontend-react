import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Exporter, getTimestampedName } from '../utils/exporter';

const API_CHAT = "https://chat-v20-stripe-elements-465781488910.us-central1.run.app";

export default function ChatInterface({ user, resetSignal, loadChatId, refreshHistory }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatId, setChatId] = useState(null);
  const messagesEndRef = useRef(null);

  // Limpiar chat nuevo
  useEffect(() => {
    if (resetSignal > 0) {
      setMessages([]);
      setChatId(null);
      setInput('');
    }
  }, [resetSignal]);

  // Cargar chat previo
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
        } catch (err) {
          console.error("Error cargando chat", err);
        }
      };
      loadPastChat();
    }
  }, [loadChatId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

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

  // Función principal unificada para enviar mensajes (escritos o por botón)
  const handleSend = async (e, textOverride = null) => {
    if (e) e.preventDefault();
    
    const textToSend = textOverride || input.trim();
    if (!textToSend || isTyping) return;

    if (!textOverride) setInput('');
    
    setMessages(prev => [...prev, { role: 'user', content: textToSend }]);
    setIsTyping(true);

    try {
      let currentChatId = chatId;
      let isNewConversation = false;
      
      if (!currentChatId) {
        currentChatId = await startConversation();
        isNewConversation = true; 
      }

      const token = await user.getIdToken();
      
      if (isNewConversation) {
        fetch(`${API_CHAT}/conversations/${currentChatId}/title`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: textToSend.substring(0, 40) })
        }).then(() => {
          if (refreshHistory) refreshHistory();
        }).catch(err => console.error("Error actualizando título:", err));
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

      setMessages(prev => [...prev, { role: 'model', content: '' }]);

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
                // STREAMING LETRA POR LETRA: Añadimos un micro-retraso por cada caracter
                for (let i = 0; i < data.text.length; i++) {
                  fullText += data.text[i];
                  setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1].content = fullText;
                    return newMsgs;
                  });
                  // 10 milisegundos de espera por cada letra
                  await new Promise(resolve => setTimeout(resolve, 10)); 
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

  // Función para procesar y separar las preguntas de seguimiento del resto del texto
  const renderMessageContent = (msg, index) => {
    // Si es un mensaje del usuario, solo lo renderizamos normal
    if (msg.role === 'user') {
      return <ReactMarkdown>{msg.content}</ReactMarkdown>;
    }

    // Expresión regular para encontrar donde empiezan las preguntas de seguimiento
    const regex = /(?:Preguntas de seguimiento|Preguntas sugeridas|Preguntas relacionadas):/is;
    const match = msg.content.match(regex);

    // Si encontramos preguntas de seguimiento Y la IA ya terminó de escribir (para que no salten los botones mientras escribe)
    if (match && !isTyping && index === messages.length - 1) {
      const mainContent = msg.content.substring(0, match.index);
      const questionsRaw = msg.content.substring(match.index + match[0].length);
      
      // Limpiamos y extraemos las preguntas (quitamos asteriscos, guiones o números)
      const questions = questionsRaw
        .split('\n')
        .map(q => q.replace(/^[-*0-9.]\s*/, '').replace(/\*/g, '').trim())
        .filter(q => q.length > 5);

      return (
        <>
          {/* El contenido principal formateado bonito */}
          <div className="markdown-content">
            <ReactMarkdown>{mainContent}</ReactMarkdown>
          </div>
          
          {/* Los botones generados dinámicamente */}
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
    }

    // Render normal si no hay preguntas detectadas o si todavía está escribiendo
    return (
      <div className="markdown-content">
        <ReactMarkdown>{msg.content}</ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="pida-view">
      <div className="pida-view-content">
        <div id="pida-chat-box">
          
          {messages.length === 0 && (
            <div className="pida-bubble pida-message-bubble">
              <div className="pida-welcome-content">
                <img src="/img/PIDA-Productos_Stripe.png" alt="PIDA Robot" className="pida-welcome-robot" />
                <div className="pida-welcome-text">
                  <h3>¡Hola! Soy PIDA, tu asistente experto en Derechos Humanos.</h3>
                  <p>Estoy para apoyarte y responder cualquier pregunta que me hagas, incluyendo investigaciones, análisis de casos, búsqueda de jurisprudencia y redacción legal.</p>
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

          {isTyping && (
            <div className="pida-bubble pida-message-bubble">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form className="pida-view-form" onSubmit={(e) => handleSend(e)}>
        {messages.length > 0 && (
          <div className="pida-download-controls" style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px', marginBottom: '8px' }}>
            <button type="button" className="pida-header-btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => Exporter.downloadTXT(getTimestampedName("Experto-PIDA"), "Reporte Experto Jurídico", messages)}>TXT</button>
            <button type="button" className="pida-header-btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => Exporter.downloadDOCX(getTimestampedName("Experto-PIDA"), "Reporte Experto Jurídico", messages)}>DOCX</button>
            <button type="button" className="pida-header-btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => Exporter.downloadPDF(getTimestampedName("Experto-PIDA"), "Reporte Experto Jurídico", messages)}>PDF</button>
          </div>
        )}

        <textarea 
          className="pida-textarea" 
          rows="2" 
          placeholder="Consulta a PIDA..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }}
        />
        <div className="pida-form-actions">
          <button type="button" className="pida-button-secondary" onClick={() => { setMessages([]); setChatId(null); }}>Limpiar</button>
          <button type="submit" className="pida-button-primary" disabled={isTyping}>Enviar</button>
        </div>
      </form>
    </div>
  );
}