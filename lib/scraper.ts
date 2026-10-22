import { CadastroError, obterConcorrente } from './concorrentes';
import type { Identity } from './auth';
import { lerIntegracoes } from './integracoes';
import { criarEncarte } from './platform';
import { withDb } from './db';
export async function processarRaspagemInstagram(concorrenteId:string,user:Identity) {
  const competitor=await obterConcorrente(concorrenteId,user.id);
  if(!competitor?.instagramHandle)throw new CadastroError('Cadastre o perfil do Instagram primeiro.');
  const keys=await lerIntegracoes(user.id);
  if(!keys.apifyToken || !keys.geminiApiKey)throw new CadastroError('Abra Integrações e salve as chaves do Apify e Gemini para coletar e ler encartes.',503);
  const response=await fetch('https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?timeout=120&memory=512',{method:'POST',headers:{Authorization:'Bearer '+keys.apifyToken,'Content-Type':'application/json'},body:JSON.stringify({directUrls:['https://www.instagram.com/'+competitor.instagramHandle+'/'],resultsType:'posts',resultsLimit:3}),signal:AbortSignal.timeout(130000)});
  if(!response.ok)throw new CadastroError('A coleta não foi concluída pelo Apify. Confira o token, os créditos e o acesso ao perfil.',502);
  const posts:unknown=await response.json();
  if(!Array.isArray(posts) || posts.some(p=>p?.error))throw new CadastroError('O Instagram não retornou publicações acessíveis para este perfil.',502);
  const candidates:{url:string;postId:string}[]=[];
  for(const post of posts) {
    const images=Array.isArray(post.images)&&post.images.length?post.images:[...(Array.isArray(post.childPosts)?post.childPosts.map((child:{displayUrl?:string})=>child.displayUrl):[]),post.displayUrl];
    for(const image of images)if(typeof image==='string' && !candidates.some(c=>c.url===image))candidates.push({url:image,postId:String(post.id||post.shortCode||'')});
  }
  let novos=0,duplicados=0,erros=0;
  for(const candidate of candidates.slice(0,6)) {
    try {
      const url=new URL(candidate.url);
      if(url.protocol!=='https:' || !(url.hostname.endsWith('.cdninstagram.com')||url.hostname.endsWith('.fbcdn.net')))throw new Error('Host inválido');
      const media=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000)});
      if(!media.ok || !media.body)throw new Error('Download falhou');
      const reader=media.body.getReader();const chunks:Uint8Array[]=[];let size=0;
      for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8*1024*1024){await reader.cancel();throw new Error('Imagem extensa')}chunks.push(value)}
      const result=await criarEncarte(user,concorrenteId,Buffer.concat(chunks),candidate.postId);
      if(result.duplicado)duplicados++;else if(result.status==='ERRO')erros++;else novos++;
    }catch{erros++;}
  }
  await withDb(user.id,db=>db.concorrente.update({where:{id_ownerId:{id:concorrenteId,ownerId:user.id}},data:{ultimoScrapeAt:new Date()}}));
  return {novos,duplicados,erros,message:novos+' encartes adicionados, '+duplicados+' repetidos e '+erros+' falhas. '+(candidates.length?'Confira os encartes para validar.':'Nenhuma imagem encontrada nas publicações recentes.')};
}
