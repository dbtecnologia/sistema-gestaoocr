import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { identidade, salvarSessao, supabaseConfig } from '@/lib/auth';
import { CadastroError } from '@/lib/concorrentes';
import { lerJson, responderErro, verificarOrigem } from '@/lib/cadastro-http';
export const dynamic = 'force-dynamic';
export async function GET() { try { const user = await identidade(); return NextResponse.json({ user: { id: user.id, email: user.email } }); } catch (error) { return responderErro(error); } }
export async function POST(request: Request) {
  try {
    verificarOrigem(request);
    const body = z.object({ action: z.enum(['login','signup','logout']), email: z.string().email().optional(), password: z.string().min(8).max(128).optional() }).parse(await lerJson(request));
    const { url, key } = supabaseConfig();
    if (body.action === 'logout') {
      const token = cookies().get('mr_access')?.value;
      if (token) await fetch(url + '/auth/v1/logout?scope=local', { method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(10000) }).catch(() => undefined);
      cookies().delete('mr_access'); cookies().delete('mr_refresh');
      return NextResponse.json({ ok: true });
    }
    if (!body.email || !body.password) throw new CadastroError('Informe e-mail e senha com pelo menos 8 caracteres.');
    const response = await fetch(url + (body.action === 'signup' ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password'), { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: body.email, password: body.password }), signal: AbortSignal.timeout(20000) });
    const result = await response.json();
    if (!response.ok) throw new CadastroError(result.error_code === 'email_not_confirmed' ? 'Confirme seu e-mail antes de entrar.' : response.status === 429 ? 'Muitas tentativas. Aguarde alguns minutos.' : body.action === 'login' ? 'E-mail ou senha inválidos, ou e-mail ainda não confirmado.' : 'Não foi possível criar sua conta. Verifique o e-mail e tente novamente.', response.status === 429 ? 429 : 400);
    if (result.access_token) { salvarSessao(result); return NextResponse.json({ ok: true, authenticated: true }); }
    return NextResponse.json({ ok: true, authenticated: false, message: 'Confirme o cadastro no e-mail recebido e volte aqui para entrar. Se já possui conta, use Entrar.' });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Informe um e-mail válido e senha com pelo menos 8 caracteres.' }, { status: 400 });
    return responderErro(error);
  }
}
