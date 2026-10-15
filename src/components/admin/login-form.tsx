'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Connexion impossible.');
        setLoading(false);
        return;
      }
      const suite = searchParams.get('suite');
      router.replace(suite && suite.startsWith('/admin') ? suite : '/admin');
      router.refresh();
    } catch {
      setError('Connexion impossible. Vérifiez votre réseau.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="email" className="label-wms">
          Adresse e-mail
        </label>
        <input
          id="email"
          type="email"
          className="input-wms"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          required
          placeholder="admin@wendmanegda.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="label-wms">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          className="input-wms"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          minLength={8}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  );
}
