import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';

export default function SystemBanner() {
  const [alert, setAlert] = useState({ active: false, message: '' });
  const [isHidden, setIsHidden] = useState(false);

  // Escuchar a Firestore en tiempo real
  useEffect(() => {
    const unsubscribe = db.collection('config').doc('alerts').onSnapshot((docSnap) => {
      if (docSnap.exists) {
        const alertData = docSnap.data();
        
        // Evitamos sobreescribir si Stripe está mostrando un mensaje de éxito en la URL
        const isStripeReturn = new URLSearchParams(window.location.search).get('payment_status');
        
        if (!isStripeReturn && alertData.active === true && alertData.message) {
          setAlert({ active: true, message: alertData.message });
          setIsHidden(false); // Lo volvemos a mostrar si el admin cambia el mensaje
        } else {
          setAlert({ active: false, message: '' });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Lógica para empujar la interfaz hacia abajo (Idéntico a tu Vanilla JS)
  useEffect(() => {
    const bannerHeight = 50; 
    const appLayout = document.getElementById('pida-app-layout');
    const navbar = document.getElementById('navbar');

    if (alert.active && !isHidden) {
      document.body.style.marginTop = bannerHeight + 'px';
      if (navbar) navbar.style.top = bannerHeight + 'px';
      if (appLayout) {
        appLayout.style.top = bannerHeight + 'px';
        appLayout.style.height = `calc(100vh - ${bannerHeight}px)`;
      }
    } else {
      document.body.style.marginTop = '0px';
      if (navbar) navbar.style.top = '0px';
      if (appLayout) {
        appLayout.style.top = '0px';
        appLayout.style.height = '100vh';
      }
    }

    // Limpieza al desmontar
    return () => {
      document.body.style.marginTop = '0px';
      if (navbar) navbar.style.top = '0px';
      if (appLayout) {
        appLayout.style.top = '0px';
        appLayout.style.height = '100vh';
      }
    };
  }, [alert.active, isHidden]);

  if (!alert.active || isHidden) return null;

  return (
    <div id="system-alert-banner" className="system-banner">
      <strong>Mensaje de PIDA:</strong>&nbsp;
      <span id="system-alert-text" dangerouslySetInnerHTML={{ __html: alert.message }}></span>
      <button onClick={() => setIsHidden(true)}>×</button>
    </div>
  );
}