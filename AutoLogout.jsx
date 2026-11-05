import React, { useEffect } from 'react';

export default function AutoLogout({ children }) {
  const TIMEOUT_IN_MS = 15 * 60 * 1000; // 15 minutos

  useEffect(() => {
    let timeoutId;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logoutUser();
      }, TIMEOUT_IN_MS);
    };

    const logoutUser = () => {
      // Limpa os dados de autenticação
      localStorage.removeItem('@Sistema:token');
      localStorage.removeItem('@Sistema:user');
      alert('Sua sessão expirou por inatividade. Faça login novamente.');
      window.location.href = '/login';
    };

    // Eventos que indicam atividade do usuário
    const events = ['mousemove', 'mousedown', 'click', 'scroll', 'keypress'];
    
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer(); // Inicia o timer inicial

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, []);

  return <>{children}</>;
}
