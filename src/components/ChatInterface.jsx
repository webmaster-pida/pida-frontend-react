import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Exporter, getTimestampedName } from '../utils/exporter';

const API_CHAT = "https://chat-v20-stripe-elements-465781488910.us-central1.run.app";

export default function ChatInterface({ user, resetSignal, loadChatId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatId, setChatId] = useState(null);
  const messagesEndRef = useRef(null);

  // Escuchar la señal desde la barra superior (Dashboard) para iniciar un Nuevo Chat
  useEffect(() => {
    if (resetSignal > 0) {
      setMessages([]);
      setChatId(null);
      setInput('');
    }
  }, [resetSignal]);

  // Efecto para hacer auto-scroll hacia abajo cuando hay un mensaje nuevo
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Escuchar cuando el usuario hace clic en el historial del Dashboard
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

  // Función para crear una nueva conversación en el backend
  const startConversation = async () => {
    const token = await user.getIdToken();
    const res = await fetch(`${API_CHAT}/conversations`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: "Nuevo Chat" })
    });
    const data = await res.json();
    setChatId(data.id);
    return data.id;
  };

  // Función principal para enviar el mensaje y recibir la respuesta (Streaming)
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const textToSend = input.trim();
    setInput('');
    // Agregamos el mensaje del usuario
    setMessages(prev => [...prev, { role: 'user', content: textToSend }]);
    setIsTyping(true);

    try {
      let currentChatId = chatId;
      if (!currentChatId) {
        currentChatId = await startConversation();
      }

      const token = await user.getIdToken();
      const res = await fetch(`${API_CHAT}/chat-stream/${currentChatId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToSend })
      });

      if (!res.ok) throw new Error('Error en el servidor');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      // Agregamos un mensaje vacío de PIDA que iremos "rellenando" letra por letra
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
                fullText += data.text;
                // Actualizamos el último mensaje (el de PIDA) con el texto nuevo
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1].content = fullText;
                  return newMsgs;
                });
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: '❌ Ocurrió un error de conexión.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="pida-view">
      <div className="pida-view-content">
        <div id="pida-chat-box">
          
          {/* Mensaje de bienvenida (se oculta si ya hay mensajes) */}
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

          {/* Renderizado de mensajes */}
          {messages.map((msg, idx) => (
            <div key={idx} className={`pida-bubble ${msg.role === 'user' ? 'user-message-bubble' : 'pida-message-bubble'}`}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          ))}

          {/* Animación de "PIDA está escribiendo..." */}
          {isTyping && (
            <div className="pida-bubble pida-message-bubble">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
          
          {/* Elemento invisible para el auto-scroll */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Formulario de envío y Descargas */}
      <form className="pida-view-form" onSubmit={handleSend}>
        
        {/* BOTONES DE DESCARGA (Solo se muestran si hay mensajes) */}
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