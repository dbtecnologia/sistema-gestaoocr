import { NextResponse } from 'next/server';
import { identidade } from '@/lib/auth';
import { CadastroError, obterConcorrente, salvarConcorrente, validarCadastro } from '@/lib/concorrentes';
import { lerJson, responderErro, verificarOrigem } from '@/lib/cadastro-http';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    verificarOrigem(request); const user = await identidade();
    const existing = await obterConcorrente(params.id,user.id);
    if (!existing) throw new CadastroError('Concorrente não encontrado.',404);
    const body = await lerJson(request);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new CadastroError('Dados inválidos.');
    const { nome,rede,cidade,estado,instagramHandle,autoScrapeEnabled,frequenciaScrape } = existing;
    return NextResponse.json({ concorrente: await salvarConcorrente(validarCadastro({ nome,rede,cidade,estado,instagramHandle,autoScrapeEnabled,frequenciaScrape,...body }),user.id,params.id) });
  } catch (error) { return responderErro(error); }
}
