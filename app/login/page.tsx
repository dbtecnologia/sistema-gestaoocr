'use client';
import { useState, type FormEvent } from 'react';
import { Radar, Loader2 } from 'lucide-react';
export default function Login() {
  const [signup,setSignup] = useState(false); const [busy,setBusy] = useState(false); const [message,setMessage] = useState(''); const [error,setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: signup ? 'signup' : 'login', email: form.get('email'), password: form.get('password') }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (data.authenticated) window.location.assign('/dashboard/concorrentes'); else setMessage(data.message);
    } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao conectar.'); } finally { setBusy(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-paper p-6"><section className="w-full max-w-md rounded-2xl border border-line bg-white p-8"><Radar size={32} className="mb-6 text-emerald-700"/><h1 className="text-2xl font-semibold">Mercado Radar</h1><p className="mb-8 mt-2 text-sm text-muted">{signup ? 'Crie sua conta para acompanhar seus concorrentes.' : 'Entre para acessar seus concorrentes e encartes.'}</p><form onSubmit={submit} className="space-y-5"><label className="block text-sm">E-mail<input type="email" name="email" autoComplete="email" required className="focus-ring mt-2 w-full rounded-xl border border-line p-3 outline-none"/></label><label className="block text-sm">Senha<input type="password" name="password" minLength={8} maxLength={128} autoComplete={signup ? 'new-password' : 'current-password'} required className="focus-ring mt-2 w-full rounded-xl border border-line p-3 outline-none"/><span className="mt-1 block text-xs text-muted">Pelo menos 8 caracteres.</span></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}{message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}<button disabled={busy} className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl bg-ink p-3 text-white disabled:opacity-50">{busy && <Loader2 size={16} className="animate-spin"/>}{signup ? 'Criar conta' : 'Entrar'}</button></form><button disabled={busy} onClick={() => { setSignup(!signup); setError(''); setMessage(''); }} className="focus-ring mt-6 text-sm text-emerald-800 underline">{signup ? 'Já tenho conta. Entrar' : 'Primeiro acesso? Criar conta'}</button></section></main>;
}
