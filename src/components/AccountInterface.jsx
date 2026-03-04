import React, { useState, useEffect } from 'react';
import { auth } from '../config/firebase';

const API_CHAT = "https://chat-v20-stripe-elements-465781488910.us-central1.run.app";

export default function AccountInterface({ user }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  // Cargar el nombre actual del usuario al abrir la vista
  useEffect(() => {
    if (user && user.displayName) {
      const parts = user.displayName.split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
    }
  }, [user]);

  // Utilidad para mostrar mensajes temporales
  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const handleUpdateName = async () => {
    if (!firstName && !lastName) return;
    try {
      await user.updateProfile({ displayName: `${firstName} ${lastName}`.trim() });
      showMessage('✅ Perfil actualizado correctamente. (Los cambios se verán al recargar)');
    } catch (error) {
      console.error(error);
      showMessage('❌ Error al actualizar el perfil.', 'error');
    }
  };

  const handleBillingPortal = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_CHAT}/create-portal-session`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ return_url: window.location.origin })
      });
      
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // Redirigir a Stripe
      } else {
        showMessage('❌ No se recibió URL del portal.', 'error');
      }
    } catch (error) {
      console.error(error);
      showMessage('❌ Error de conexión al abrir el portal de facturación.', 'error');
    }
  };

  const handlePasswordReset = async () => {
    try {
      await auth.sendPasswordResetEmail(user.email);
      showMessage('✅ Correo de restablecimiento enviado.');
    } catch (error) {
      console.error(error);
      showMessage('❌ Error al enviar el correo.', 'error');
    }
  };

  return (
    <div className="pida-view">
      <div className="pida-view-content">
        <div className="account-container" style={{ maxWidth: '600px', margin: '0 auto', background: 'white', borderRadius: '12px', border: '1px solid var(--pida-border)', padding: '40px' }}>
          
          {message.text && (
            <div style={{ padding: '10px', borderRadius: '6px', color: 'white', textAlign: 'center', marginBottom: '15px', fontSize: '0.9rem', background: message.type === 'error' ? '#EF4444' : '#10B981' }}>
              {message.text}
            </div>
          )}

          <div className="account-header" style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 style={{ color: 'var(--pida-primary)', marginBottom: '5px', marginTop: 0 }}>Mi Cuenta</h2>
            <p style={{ color: '#666', margin: 0 }}>Gestiona tu perfil y suscripción.</p>
          </div>
          
          <div className="account-section" style={{ marginBottom: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--pida-text-muted)', marginBottom: '15px', textTransform: 'uppercase' }}>Perfil Personal</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <input type="text" className="pida-textarea" style={{ padding: '10px', marginBottom: 0 }} placeholder="Nombre" value={firstName} onChange={e => setFirstName(e.target.value)} />
              <input type="text" className="pida-textarea" style={{ padding: '10px', marginBottom: 0 }} placeholder="Apellido" value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
            <button className="pida-button-primary" style={{ width: '100%' }} onClick={handleUpdateName}>Actualizar Nombre</button>
          </div>

          <div className="account-section" style={{ marginBottom: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--pida-text-muted)', marginBottom: '15px', textTransform: 'uppercase' }}>Suscripción</h3>
            <button className="pida-button-primary" style={{ width: '100%', backgroundColor: '#2A4B7C' }} onClick={handleBillingPortal}>Portal de Facturación</button>
          </div>

          <div className="account-section" style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--pida-text-muted)', marginBottom: '15px', textTransform: 'uppercase' }}>Seguridad</h3>
            <button className="pida-button-secondary" style={{ border: '1px solid #ccc', width: '100%', padding: '10px', borderRadius: '6px' }} onClick={handlePasswordReset}>Restablecer contraseña</button>
          </div>

        </div>
      </div>
    </div>
  );
}