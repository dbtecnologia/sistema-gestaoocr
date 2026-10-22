import { NextResponse } from 'next/server';
import { z } from 'zod';
import { identidade } from '@/lib/auth';
import { platform } from '@/lib/platform';
import { responderErro } from '@/lib/cadastro-http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=300;
async function handler(request:Request,{params}:{params:{path:string[]}}) {
  try { const user=await identidade(); return NextResponse.json(await platform(request,user,params.path),{headers:{'Cache-Control':'no-store'}}); }
  catch(error) {
    if(error instanceof z.ZodError)return NextResponse.json({error:error.issues[0]?.message||'Verifique os dados informados.'},{status:400});
    if((error as {code?:string}).code==='P2002')return NextResponse.json({error:'Já existe um cadastro com estes dados.'},{status:409});
    return responderErro(error);
  }
}
export {handler as GET,handler as POST,handler as PATCH};
