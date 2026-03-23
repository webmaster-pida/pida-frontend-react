import React, { useState } from 'react';

export default function SupportModal({ isOpen, onClose, user, currentView, lastError }) {
  const [issueDescription, setIssueDescription] = useState('');

  if (!isOpen) return null;

  const handleSendReport = (e) => {
    e.preventDefault();
    
    // Construimos el cuerpo del correo
    const subject = encodeURIComponent(`Reporte de Fallo/Ayuda - PIDA (${user?.email})`);
    const body = encodeURIComponent(`Hola equipo de soporte,\n\nTengo el siguiente problema:\n${issueDescription}\n\n--- DATOS DE DIAGNÓSTICO (No borrar) ---\nUsuario: ${user?.email || 'Desconocido'}\nUID: ${user?.uid || 'Desconocido'}\nMódulo actual: ${currentView || 'Desconocido'}\nÚltimo error detectado: ${lastError || 'Ninguno visible'}\nNavegador: ${navigator.userAgent}\nFecha: ${new Date().toLocaleString()}`);

    // Abrimos el cliente de correo
    window.location.href = `mailto:contacto@pida-ai.com?subject=${subject}&body=${body}`;
    
    setIssueDescription('');
    onClose(); // Cerramos el modal
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <button className="modal-close-btn" onClick={onClose}>×</button>
        <h3 style={{ color: 'var(--navy)', marginBottom: '10px' }}>¿En qué podemos ayudarte?</h3>
        <p style={{ fontSize: '0.9rem', color: '#64748B', marginBottom: '20px' }}>
          Describe tu duda o problema. Adjuntaremos automáticamente tu usuario y el estado del sistema para ayudarte más rápido.
        </p>
        
        <form onSubmit={handleSendReport}>
          <textarea
            className="pida-textarea"
            rows="4"
            placeholder="Ej: Estaba precalificando un caso de robo y la pantalla se quedó cargando..."
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            required
            style={{ marginBottom: '15px' }}
          />
          
          {lastError && (
            <div style={{ fontSize: '0.75rem', color: '#EF4444', background: '#FEF2F2', padding: '8px', borderRadius: '6px', marginBottom: '15px' }}>
              <strong>Error detectado:</strong> {lastError}
            </div>
          )}

          <button type="submit" className="pida-button-primary" style={{ width: '100%' }}>
            Preparar Correo de Soporte
          </button>
        </form>
      </div>
    </div>
  );
}