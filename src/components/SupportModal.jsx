import React, { useState } from 'react';
import { db } from '../config/firebase'; // Importamos tu instancia de Firestore

export default function SupportModal({ isOpen, onClose, user, currentView, lastError }) {
  const [issueDescription, setIssueDescription] = useState('');
  const [contactStatus, setContactStatus] = useState({ text: '', type: '', isSubmitting: false });

  if (!isOpen) return null;

  const handleSendReport = async (e) => {
    e.preventDefault();
    setContactStatus({ text: 'Enviando reporte...', type: 'info', isSubmitting: true });
    
    // Construimos el objeto exacto como lo haces en tu LandingPage
    const reportData = {
        email: user?.email || 'Desconocido',
        uid: user?.uid || 'Desconocido',
        modulo: currentView || 'Desconocido',
        descripcion: issueDescription,
        error_detectado: lastError || 'Ninguno visible',
        navegador: navigator.userAgent,
        createdAt: new Date(),
        status: 'nuevo' // Estado inicial del ticket
    };

    try {
        // Guardamos en la colección de soporte (puedes cambiar el nombre si ya tienes otra)
        await db.collection('soporte_tecnico').add(reportData);
        
        setContactStatus({ text: '✅ Reporte enviado. Lo revisaremos pronto.', type: 'success', isSubmitting: false });
        
        // Limpiamos y cerramos tras 2.5 segundos de éxito
        setTimeout(() => {
            setIssueDescription('');
            setContactStatus({ text: '', type: '', isSubmitting: false });
            onClose(); 
        }, 2500);
        
    } catch (error) {
        console.error("Error al enviar reporte:", error);
        setContactStatus({ text: '❌ Error de conexión. Intenta de nuevo.', type: 'error', isSubmitting: false });
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%', padding: '25px', backgroundColor: 'white', borderRadius: '12px', position: 'relative' }}>
        <button className="modal-close-btn" onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>×</button>
        
        <h3 style={{ color: 'var(--navy)', marginBottom: '10px', fontSize: '1.2rem', fontWeight: 'bold' }}>¿En qué podemos ayudarte?</h3>
        <p style={{ fontSize: '0.9rem', color: '#64748B', marginBottom: '20px', lineHeight: '1.5' }}>
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
            disabled={contactStatus.isSubmitting}
            style={{ marginBottom: '15px', width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontFamily: 'inherit' }}
          />
          
          {lastError && (
            <div style={{ fontSize: '0.75rem', color: '#EF4444', background: '#FEF2F2', padding: '10px', borderRadius: '6px', marginBottom: '15px', border: '1px solid #fecaca' }}>
              <strong>Error detectado:</strong> {lastError}
            </div>
          )}

          {/* Mensaje de estado (Éxito/Error/Cargando) */}
          {contactStatus.text && (
            <div style={{ 
                fontSize: '0.85rem', 
                fontWeight: 'bold',
                color: contactStatus.type === 'error' ? '#EF4444' : (contactStatus.type === 'success' ? '#10B981' : '#0284C7'), 
                marginBottom: '15px',
                textAlign: 'center'
            }}>
                {contactStatus.text}
            </div>
          )}

          <button 
            type="submit" 
            className="pida-button-primary" 
            disabled={contactStatus.isSubmitting}
            style={{ 
                width: '100%', 
                padding: '12px', 
                backgroundColor: contactStatus.isSubmitting ? '#94A3B8' : 'var(--pida-primary)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                fontWeight: 'bold', 
                cursor: contactStatus.isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
            }}
          >
            {contactStatus.isSubmitting ? 'Enviando...' : 'Enviar Reporte'}
          </button>
        </form>
      </div>
    </div>
  );
}