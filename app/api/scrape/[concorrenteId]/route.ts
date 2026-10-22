import { NextResponse } from 'next/server';
import { identidade } from '@/lib/auth';
import { processarRaspagemInstagram } from '@/lib/scraper';
import { responderErro, verificarOrigem } from '@/lib/cadastro-http';
export const runtime='nodejs'; export const maxDuration=300;
export async function POST(request:Request,{params}:{params:{concorrenteId:string}}) {
  try { verificarOrigem(request);return NextResponse.json(await processarRaspagemInstagram(params.concorrenteId,await identidade())); }
  catch(error){return responderErro(error);}
}
