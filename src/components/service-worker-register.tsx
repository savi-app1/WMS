'use client';

import { useEffect } from 'react';

/** Enregistre le service worker (installation sur l'écran d'accueil). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      const register = () => {
        navigator.serviceWorker.register('/sw.js').catch(() => undefined);
      };
      window.addEventListener('load', register);
      return () => window.removeEventListener('load', register);
    }
    return undefined;
  }, []);

  return null;
}
