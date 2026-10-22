import 'server-only';
import { cookies } from 'next/headers';
import { CadastroError } from './concorrentes';
export interface Identity { id: string; email: string; accessToken: string }
export function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new CadastroError('A conexão com o Supabase não está configurada.', 503);
  return { url, key };
}
export function salvarSessao(session: { access_token: string; refresh_token: string; expires_in?: number }) {
  const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
  cookies().set('mr_access', session.access_token, { ...options, maxAge: session.expires_in || 3600 });
  cookies().set('mr_refresh', session.refresh_token, { ...options, maxAge: 2592000 });
}
export async function identidade(): Promise<Identity> {
  const { url, key } = supabaseConfig();
  let token = cookies().get('mr_access')?.value;
  let response = token ? await fetch(url + '/auth/v1/user', { headers: { apikey: key, Authorization: 'Bearer ' + token }, cache: 'no-store', signal: AbortSignal.timeout(15000) }) : null;
  if (!response?.ok) {
    const refresh = cookies().get('mr_refresh')?.value;
    if (refresh) {
      const renewed = await fetch(url + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: refresh }), signal: AbortSignal.timeout(15000) });
      if (renewed.ok) {
        const session = await renewed.json(); salvarSessao(session); token = session.access_token;
        response = await fetch(url + '/auth/v1/user', { headers: { apikey: key, Authorization: 'Bearer ' + token }, cache: 'no-store', signal: AbortSignal.timeout(15000) });
      }
    }
  }
  if (!token || !response?.ok) throw new CadastroError('Entre na sua conta para continuar.', 401);
  const user = await response.json();
  if (!user.id || !user.email) throw new CadastroError('Sessão inválida. Entre novamente.', 401);
  return { id: user.id, email: user.email, accessToken: token };
}
