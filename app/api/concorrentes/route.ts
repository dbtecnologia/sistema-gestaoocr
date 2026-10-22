import { NextResponse } from 'next/server';
import { listarConcorrentes, salvarConcorrente, statusIntegracoes, validarCadastro } from '@/lib/concorrentes';
import { identidade } from '@/lib/auth';
import { lerJson, responderErro, verificarOrigem } from '@/lib/cadastro-http';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET() { try { const user = await identidade(); const [concorrentes,integracoes] = await Promise.all([listarConcorrentes(user.id),statusIntegracoes(user.id)]); return NextResponse.json({ concorrentes, integracoes }, { headers: { 'Cache-Control': 'no-store' } }); } catch (error) { return responderErro(error); } }
export async function POST(request: Request) { try { verificarOrigem(request); const user = await identidade(); return NextResponse.json({ concorrente: await salvarConcorrente(validarCadastro(await lerJson(request)),user.id) }, { status: 201 }); } catch (error) { return responderErro(error); } }
