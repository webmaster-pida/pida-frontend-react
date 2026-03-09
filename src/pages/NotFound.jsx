import React from 'react';

export default function NotFound() {
  return (
    <div className="not-found-wrapper">
      <div className="not-found-card">
        <img src="/img/PIDA_logo-576.png" alt="Logo PIDA" className="not-found-logo" />
        <div className="not-found-divider"></div>
        <h1 className="not-found-title">Error 404</h1>
        <h2 className="not-found-subtitle">Página no encontrada</h2>
        <p className="not-found-text">
          El recurso, documento o enlace que intenta consultar no existe, ha sido reubicado o no tiene los permisos necesarios para acceder a él.
        </p>
        <div className="not-found-actions">
          <a href="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Volver a la plataforma
          </a>
        </div>
      </div>
    </div>
  );
}