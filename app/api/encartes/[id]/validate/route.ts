import { NextResponse } from 'next/server';
import { identidade } from '@/lib/auth';
import { platform } from '@/lib/platform';
import { responderErro } from '@/lib/cadastro-http';
export async function PATCH(request:Request,{params}:{params:{id:string}}) {
  try {return NextResponse.json(await platform(request,await identidade(),['encartes',params.id]));}catch(error){return responderErro(error);}
}
