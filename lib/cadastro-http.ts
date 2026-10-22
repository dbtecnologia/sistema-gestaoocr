import { NextResponse } from 'next/server';
import { CadastroError } from './concorrentes';
export function verificarOrigem(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  const host = request.headers.get('host') || new URL(request.url).host;
  try {
    const source = new URL(origin);
    if (!['http:', 'https:'].includes(source.protocol) || source.host.toLowerCase() !== host.toLowerCase()) throw new Error('Invalid origin');
  } catch { throw new CadastroError('Origem da solicitação não permitida.', 403); }
}
export async function lerJson(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new CadastroError('Envie os dados em JSON.', 415);
  const text = await request.text();
  if (Buffer.byteLength(text) > 8192) throw new CadastroError('Dados do cadastro muito extensos.', 413);
  try { return JSON.parse(text); } catch { throw new CadastroError('Os dados enviados são inválidos.'); }
}
export function responderErro(error: unknown) {
  if (error instanceof CadastroError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error('Falha no cadastro:', error instanceof Error ? error.name : 'Erro');
  return NextResponse.json({ error: 'Não foi possível consultar ou salvar os dados. Verifique a conexão com o banco e tente novamente.' }, { status: 503 });
}
