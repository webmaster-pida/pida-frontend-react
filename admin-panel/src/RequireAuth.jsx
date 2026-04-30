import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function RequireAuth({ children }) {
  const { user } = useAuth();

  // Si no hay usuario autorizado en el contexto, lo patea al login instantáneamente
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}