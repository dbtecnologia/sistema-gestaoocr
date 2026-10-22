import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Identity } from './auth';
import { supabaseConfig } from './auth';
import { withDb } from './db';
import { CadastroError } from './concorrentes';
import { lerIntegracoes, salvarIntegracoes } from './integracoes';
import { extrairDadosEncarte } from './gemini';
import { lerJson, verificarOrigem } from './cadastro-http';

const preco = z.coerce.number().positive().max(99999999).transform(n => Math.round(n * 100) / 100);
const produtoSchema = z.object({ nomePadrao:z.string().trim().min(2).max(160),marca:z.string().trim().max(100).nullable().optional(),categoria:z.string().trim().min(2).max(80),embalagemUnidade:z.string().trim().min(1).max(40),codigoBarras:z.string().trim().max(30).nullable().optional(),precoAtualProprio:preco.nullable() }).strict();
const itemSchema = z.object({ nomeExtraido:z.string().trim().min(2).max(200),marcaExtraida:z.string().trim().max(100).nullable().optional(),embalagemUnidade:z.string().trim().min(1).max(40),categoria:z.string().trim().min(2).max(80),precoRegular:preco.nullable().optional(),precoPromocional:preco,tipoPromocao:z.enum(['NORMAL','APP_CLUBE','ATACADO_QUANTIDADE','CARTAO_LOJA']),condicaoEspecial:z.string().trim().max(300).nullable().optional(),confiancaLeitura:z.enum(['ALTA','MEDIA','BAIXA']).default('ALTA'),produtoCatalogoId:z.string().uuid().nullable().optional() }).strict();
function dateOnly(value:string,end=false) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new CadastroError('Informe uma data válida.');
  const date=new Date(value+(end?'T23:59:59.999Z':'T00:00:00.000Z'));
  if(!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==value) throw new CadastroError('Data inválida.');
  return date;
}
function unidade(value:string) { return value.toLowerCase().replace(/\s/g,''); }
export function detectarImagem(buffer:Buffer) {
  if(buffer.length<12) throw new CadastroError('Imagem inválida.');
  if(buffer[0]===255 && buffer[1]===216 && buffer[2]===255) return {mime:'image/jpeg',ext:'jpg'};
  if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return {mime:'image/png',ext:'png'};
  if(buffer.toString('ascii',0,4)==='RIFF' && buffer.toString('ascii',8,12)==='WEBP') return {mime:'image/webp',ext:'webp'};
  throw new CadastroError('Envie uma imagem JPG, PNG ou WebP.');
}
async function storage(user:Identity,route:string,init?:RequestInit) {
  const {url,key}=supabaseConfig();
  const response=await fetch(url+'/storage/v1/'+route,{...init,headers:{apikey:key,Authorization:'Bearer '+user.accessToken,...init?.headers},cache:'no-store',signal:AbortSignal.timeout(25000)});
  if(!response.ok) throw new CadastroError('Não foi possível acessar a imagem no armazenamento. Tente novamente.',502);
  return response;
}
async function imagemAssinada(user:Identity,value:string) {
  if(!value.startsWith('storage://')) return value;
  const object=value.slice('storage://'.length);
  if(!object.startsWith(user.id+'/')) throw new CadastroError('Imagem não encontrada.',404);
  const response=await storage(user,'object/sign/encartes/'+object,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600})});
  const result=await response.json();
  return supabaseConfig().url+'/storage/v1'+result.signedURL;
}
export async function criarEncarte(user:Identity,concorrenteId:string,buffer:Buffer,postId?:string) {
  if(buffer.length>8*1024*1024) throw new CadastroError('A imagem ultrapassa 8 MB.');
  const image=detectarImagem(buffer); const hash=createHash('sha256').update(buffer).digest('hex');
  const existing=await withDb(user.id,db=>db.encarte.findFirst({where:{ownerId:user.id,imageHash:hash}}));
  if(existing) return {id:existing.id,duplicado:true,status:existing.status};
  const competitor=await withDb(user.id,db=>db.concorrente.findFirst({where:{id:concorrenteId,ownerId:user.id}}));
  if(!competitor) throw new CadastroError('Selecione um concorrente cadastrado.',404);
  const id=randomUUID(); const object=user.id+'/'+id+'.'+image.ext;
  try { await withDb(user.id,db=>db.encarte.create({data:{id,ownerId:user.id,concorrenteId,imagemUrl:'storage://'+object,imageHash:hash,origem:postId?'INSTAGRAM_AUTO':'UPLOAD_MANUAL',postIdInstagram:postId,status:'PROCESSANDO'}})); }
  catch(error) {
    if((error as {code?:string}).code==='P2002') { const duplicate=await withDb(user.id,db=>db.encarte.findFirst({where:{ownerId:user.id,imageHash:hash}})); if(duplicate)return {id:duplicate.id,duplicado:true,status:duplicate.status}; }
    throw error;
  }
  try { await storage(user,'object/encartes/'+object,{method:'POST',headers:{'Content-Type':image.mime,'x-upsert':'false'},body:new Uint8Array(buffer)}); }
  catch(error) { await withDb(user.id,db=>db.encarte.delete({where:{id_ownerId:{id,ownerId:user.id}}})); throw error; }
  let status:'AGUARDANDO_VALIDACAO'|'ERRO'='AGUARDANDO_VALIDACAO';
  const keys=await lerIntegracoes(user.id);
  if(keys.geminiApiKey) {
    try {
      const result=await extrairDadosEncarte(buffer,image.mime,{apiKey:keys.geminiApiKey,model:keys.geminiModel});
      await withDb(user.id,async db=>{
        for(const p of result.produtos) await db.itemEncarte.create({data:{ownerId:user.id,encarteId:id,nomeExtraido:p.nome_produto,marcaExtraida:p.marca,categoria:p.categoria,embalagemUnidade:p.embalagem_unidade,precoRegular:p.preco_regular,precoPromocional:p.preco_promocional,tipoPromocao:p.tipo_promocao,condicaoEspecial:p.condicao_especial,confiancaLeitura:p.confianca_leitura}});
      });
    } catch { status='ERRO'; }
  }
  await withDb(user.id,db=>db.encarte.update({where:{id_ownerId:{id,ownerId:user.id}},data:{status,erro:status==='ERRO'?'Leitura automática falhou. Você pode preencher e validar os itens manualmente.':null}}));
  return {id,duplicado:false,status};
}

export async function benchmarking(ownerId:string,date=new Date().toISOString().slice(0,10),conditions=false) {
  const at=dateOnly(date); const until=dateOnly(date,true);
  return withDb(ownerId,async db=>{
    const [catalogo,concorrentes,offers]=await Promise.all([
      db.produtoCatalogo.findMany({orderBy:{nomePadrao:'asc'}}),
      db.concorrente.findMany({orderBy:{nome:'asc'}}),
      db.itemEncarte.findMany({where:{ownerId,produtoCatalogoId:{not:null},...(conditions?{}:{tipoPromocao:'NORMAL'}),encarte:{status:'PUBLICADO',dataInicio:{lte:until},dataFim:{gte:at}}},include:{encarte:true},orderBy:[{encarte:{dataInicio:'desc'}},{createdAt:'desc'}]}),
    ]);
    const rows=catalogo.map(p=>{
      const precos:Record<string,{valor:number;tipo:string;condicao:string|null;unidade:string}>={};
      for(const item of offers) if(item.produtoCatalogoId===p.id && unidade(item.embalagemUnidade)===unidade(p.embalagemUnidade) && !precos[item.encarte.concorrenteId]) precos[item.encarte.concorrenteId]={valor:Number(item.precoPromocional),tipo:item.tipoPromocao,condicao:item.condicaoEspecial,unidade:item.embalagemUnidade};
      const values=Object.values(precos).map(i=>i.valor); const proprio=p.precoAtualProprio===null?null:Number(p.precoAtualProprio);
      return {id:p.id,nome:p.nomePadrao,categoria:p.categoria,unidade:p.embalagemUnidade,proprio,precos,menorConcorrente:values.length?Math.min(...values):null};
    });
    const comparable=rows.filter(r=>r.proprio!==null && r.menorConcorrente!==null);
    const indice=comparable.length?100*comparable.filter(r=>r.proprio!<=r.menorConcorrente!+0.001).length/comparable.length:null;
    const categorias=[...new Set(rows.map(r=>r.categoria))].map(categoria=>{const products=comparable.filter(r=>r.categoria===categoria);return {categoria,indice:products.length?100*products.filter(r=>r.proprio!<=r.menorConcorrente!+0.001).length/products.length:null,produtos:products.length}});
    return {data:date,concorrentes:concorrentes.map(c=>({id:c.id,nome:c.nome})),rows,indice,categorias,comparaveis:comparable.length};
  });
}

export async function platform(request:Request,user:Identity,parts:string[]) {
  const [resource,id,action]=parts; const url=new URL(request.url);
  if(request.method!=='GET') verificarOrigem(request);
  if(resource==='catalogo') {
    if(request.method==='GET') return withDb(user.id,db=>db.produtoCatalogo.findMany({orderBy:{nomePadrao:'asc'}}));
    if(request.method==='POST' || request.method==='PATCH') {
      const data=produtoSchema.parse(await lerJson(request)); data.codigoBarras=data.codigoBarras||null; data.marca=data.marca||null;
      return withDb(user.id,db=>id?db.produtoCatalogo.update({where:{id_ownerId:{id,ownerId:user.id}},data}):db.produtoCatalogo.create({data:{...data,ownerId:user.id}}));
    }
  }
  if(resource==='encartes') {
    if(request.method==='GET' && !id) return withDb(user.id,db=>db.encarte.findMany({include:{concorrente:true,_count:{select:{itens:true}}},orderBy:{createdAt:'desc'},take:100}));
    if(request.method==='GET' && id) {
      const row=await withDb(user.id,db=>db.encarte.findFirst({where:{id,ownerId:user.id},include:{concorrente:true,itens:{orderBy:{createdAt:'asc'}}}}));
      if(!row) throw new CadastroError('Encarte não encontrado.',404);
      return {...row,imagemUrl:await imagemAssinada(user,row.imagemUrl)};
    }
    if(request.method==='POST' && !id) {
      const data=await request.formData(); const file=data.get('imagem'); const concorrenteId=z.string().uuid().parse(data.get('concorrenteId'));
      if(!(file instanceof File) || !file.size) throw new CadastroError('Selecione uma imagem do encarte.');
      if(file.size>3*1024*1024) throw new CadastroError('Para envio pelo navegador, use uma imagem de até 3 MB.');
      return criarEncarte(user,concorrenteId,Buffer.from(await file.arrayBuffer()));
    }
    if(request.method==='PATCH' && id) {
      const body=z.object({dataInicio:z.string(),dataFim:z.string(),itens:z.array(itemSchema).min(1,'Adicione pelo menos um produto.').max(300)}).strict().parse(await lerJson(request));
      const dataInicio=dateOnly(body.dataInicio); const dataFim=dateOnly(body.dataFim,true);
      if(dataFim<dataInicio) throw new CadastroError('O fim da validade deve ser igual ou posterior ao início.');
      return withDb(user.id,async db=>{
        const row=await db.encarte.findFirst({where:{id,ownerId:user.id}});
        if(!row) throw new CadastroError('Encarte não encontrado.',404);
        const normalized=[];
        for(const item of body.itens) {
          if(item.tipoPromocao!=='NORMAL' && !item.condicaoEspecial?.trim()) throw new CadastroError('Descreva a condição das promoções de app, clube, cartão ou quantidade.');
          let product=item.produtoCatalogoId?await db.produtoCatalogo.findFirst({where:{id:item.produtoCatalogoId,ownerId:user.id}}):null;
          if(item.produtoCatalogoId && !product) throw new CadastroError('Produto do catálogo não encontrado.',404);
          if(product && unidade(product.embalagemUnidade)!==unidade(item.embalagemUnidade)) throw new CadastroError('A embalagem do item deve corresponder à embalagem do catálogo.');
          if(!product) {
            product=await db.produtoCatalogo.findFirst({where:{ownerId:user.id,nomePadrao:item.nomeExtraido,marca:item.marcaExtraida||null,embalagemUnidade:item.embalagemUnidade}});
            if(!product)product=await db.produtoCatalogo.create({data:{ownerId:user.id,nomePadrao:item.nomeExtraido,marca:item.marcaExtraida||null,categoria:item.categoria,embalagemUnidade:item.embalagemUnidade}});
          }
          normalized.push({...item,produtoCatalogoId:product.id,ownerId:user.id,encarteId:id,validadoManualmente:true});
        }
        await db.itemEncarte.deleteMany({where:{encarteId:id,ownerId:user.id}});
        await db.itemEncarte.createMany({data:normalized});
        return db.encarte.update({where:{id_ownerId:{id,ownerId:user.id}},data:{dataInicio,dataFim,status:'PUBLICADO',erro:null}});
      });
    }
  }
  if(resource==='benchmarking' && request.method==='GET') return benchmarking(user.id,url.searchParams.get('data')||undefined,url.searchParams.get('condicoes')==='1');
  if(resource==='settings') {
    if(request.method==='GET') {const keys=await lerIntegracoes(user.id);return {geminiConfigurado:Boolean(keys.geminiApiKey),apifyConfigurado:Boolean(keys.apifyToken),geminiModel:keys.geminiModel,supabase:true,agendamento:false};}
    if(request.method==='POST') {const data=z.object({geminiApiKey:z.string().max(300).optional(),apifyToken:z.string().max(300).optional(),geminiModel:z.string().regex(/^[a-z0-9.-]+$/).max(100).optional()}).strict().parse(await lerJson(request));await salvarIntegracoes(user.id,data);return {message:'Integrações verificadas e salvas com criptografia.'};}
  }
  if(resource==='summary' && request.method==='GET') return withDb(user.id,async db=>{
    const [produtos,concorrentes,aguardando,publicados,recentes]=await Promise.all([db.produtoCatalogo.count(),db.concorrente.count(),db.encarte.count({where:{status:{in:['PENDENTE','AGUARDANDO_VALIDACAO','ERRO']}}}),db.encarte.count({where:{status:'PUBLICADO'}}),db.encarte.findMany({take:8,orderBy:{createdAt:'desc'},include:{concorrente:true,_count:{select:{itens:true}}}})]);
    return {produtos,concorrentes,aguardando,publicados,recentes};
  });
  throw new CadastroError('Operação não encontrada.',404);
}
