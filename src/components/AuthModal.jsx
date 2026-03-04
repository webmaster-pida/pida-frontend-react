import React, { useState } from 'react';
import { auth, googleProvider } from '../config/firebase'; // Importamos tu configuración

export default function AuthModal({ isOpen, onClose }) {
  const [mode, setMode] = useState('login');
  
  // Estados para guardar lo que el usuario escribe
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  // Estados de la interfaz
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  // Función para Iniciar Sesión con Google
  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      await auth.signInWithPopup(googleProvider);
      onClose(); // Cerramos el modal si hay éxito
    } catch (err) {
      console.error(err);
      setError('No se pudo iniciar sesión con Google.');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para manejar el Formulario (Login, Registro o Recuperación)
  const handleSubmit = async (e) => {
    e.preventDefault(); // Evita que la página se recargue
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'reset') {
        await auth.sendPasswordResetEmail(email);
        setError('✅ Enlace enviado. Revisa tu correo.');
      } else if (mode === 'login') {
        await auth.signInWithEmailAndPassword(email, password);
        onClose();
      } else if (mode === 'register') {
        // Crea el usuario
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        // Actualiza el nombre
        await userCredential.user.updateProfile({
          displayName: `${firstName} ${lastName}`.trim()
        });
        onClose(); // Ocultaremos esto luego cuando integremos Stripe
      }
    } catch (err) {
      let friendlyMessage = "Ocurrió un error. Intenta de nuevo.";
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
          friendlyMessage = "Los datos son incorrectos.";
      } else if (err.code === 'auth/email-already-in-use') {
          friendlyMessage = "Esta cuenta ya está registrada. Inicia sesión.";
      } else if (err.code === 'auth/wrong-password') {
          friendlyMessage = "La contraseña es incorrecta.";
      }
      setError(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="pida-login-screen" style={{ display: 'flex' }}>
      <div className="login-card">
        <button className="close-login-btn" onClick={onClose}>×</button>
        <img src="/img/PIDA_logo-576.png" alt="PIDA Logo" className="login-logo" />

        {mode !== 'reset' && (
          <div className="login-tabs">
            <button className={`login-tab-btn ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError(''); }}>Ingresar</button>
            <button className={`login-tab-btn ${mode === 'register' ? 'active' : ''}`} onClick={() => { setMode('register'); setError(''); }}>Crear Cuenta</button>
          </div>
        )}

        <h2 id="auth-title" style={{ color: 'var(--pida-primary)', marginTop: 0, fontSize: '1.2rem' }}>
          {mode === 'login' && 'Bienvenido de nuevo'}
          {mode === 'register' && 'Crear una cuenta'}
          {mode === 'reset' && 'Recuperar Contraseña'}
        </h2>
        
        {mode === 'login' && (
          <>
            <button id="google-login-btn" className="login-btn google-btn" onClick={handleGoogleLogin} disabled={isLoading}>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
              </svg> 
              <span>Entrar con Google</span>
            </button>
            <div className="login-divider"><span>O usa tu correo</span></div>
          </>
        )}
        
        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <input type="text" className="login-input" style={{ marginBottom: 0 }} placeholder="Nombre" required value={firstName} onChange={e => setFirstName(e.target.value)} />
              <input type="text" className="login-input" style={{ marginBottom: 0 }} placeholder="Apellido" required value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          )}

          <input type="email" className="login-input" placeholder="Correo electrónico" required value={email} onChange={e => setEmail(e.target.value)} />
          
          {mode !== 'reset' && (
            <div id="password-field-container">
              <input type="password" className="login-input" placeholder="Contraseña" required value={password} onChange={e => setPassword(e.target.value)} />
              {mode === 'login' && (
                <div style={{ textAlign: 'right', marginTop: '-10px', marginBottom: '15px' }}>
                  <span onClick={() => { setMode('reset'); setError(''); }} style={{ fontSize: '0.8rem', color: '#666', textDecoration: 'none', cursor: 'pointer' }}>¿Olvidaste tu contraseña?</span>
                </div>
              )}
            </div>
          )}

          {/* Muestra los errores aquí */}
          {error && <div className="login-error" style={{ display: 'block', marginBottom: '15px' }}>{error}</div>}

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? 'Procesando...' : (mode === 'login' ? 'Ingresar' : mode === 'register' ? 'Continuar' : 'Enviar enlace')}
          </button>
        </form>

        <div style={{ marginTop: '20px', fontSize: '0.85rem', color: '#666' }}>
          {mode === 'login' && <>¿No tienes cuenta? <span onClick={() => { setMode('register'); setError(''); }} style={{ color: 'var(--pida-accent)', textDecoration: 'underline', cursor: 'pointer' }}>Regístrate aquí</span></>}
          {mode === 'register' && <>¿Ya tienes cuenta? <span onClick={() => { setMode('login'); setError(''); }} style={{ color: 'var(--pida-accent)', textDecoration: 'underline', cursor: 'pointer' }}>Inicia sesión aquí</span></>}
          {mode === 'reset' && <><span onClick={() => { setMode('login'); setError(''); }} style={{ color: 'var(--pida-accent)', textDecoration: 'underline', cursor: 'pointer' }}>← Volver al login</span></>}
        </div>
      </div>
    </div>
  );
}