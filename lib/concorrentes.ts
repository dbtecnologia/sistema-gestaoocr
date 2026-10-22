import 'server-only';
import { z } from 'zod';
import { ESTADOS, type ConcorrenteInput, type ConcorrenteRegistro } from './concorrente-model';
import { withDb } from './db';
export class CadastroError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function normalizarInstagram(value: string): string {
  let handle = value.trim();
  if (/^(https?:\/\/|www\.|instagram\.com\/)/i.test(handle)) {
    let url: URL;
    try { url = new URL(/^https?:\/\//i.test(handle) ? handle : `https://${handle}`); }
    catch { throw new CadastroError('Informe um link válido do perfil do Instagram.'); }
    if (!['instagram.com','www.instagram.com'].includes(url.hostname.toLowerCase()) || url.username || url.password) throw new CadastroError('Use o link de um perfil em instagram.com.');
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length !== 1) throw new CadastroError('Informe o perfil do supermercado, não uma publicação.');
    handle = parts[0];
  }
  handle = handle.replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9_](?:[a-z0-9_.]{0,28}[a-z0-9_])?$/.test(handle) || handle.includes('..') || ['p','reel','reels','stories','explore','accounts'].includes(handle)) throw new CadastroError('Instagram inválido. Use até 30 letras, números, pontos ou sublinhados, como @supermercado.centro.');
  return handle;
}
const schema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome do supermercado.').max(120),
  rede: z.string().trim().max(120).nullable().default(null),
  cidade: z.string().trim().min(2, 'Informe a cidade.').max(100),
  estado: z.enum(ESTADOS),
  instagramHandle: z.string().trim().min(1, 'Informe o Instagram do concorrente.').max(300),
  autoScrapeEnabled: z.boolean().default(true),
  frequenciaScrape: z.enum(['DIARIO','A_CADA_6H','SEMANAL']).default('DIARIO'),
}).strict();
export function validarCadastro(value: unknown): ConcorrenteInput {
  const result = schema.safeParse(value);
  if (!result.success) throw new CadastroError(result.error.issues[0]?.message || 'Dados inválidos.');
  return { ...result.data, rede: result.data.rede || null, instagramHandle: normalizarInstagram(result.data.instagramHandle) };
}

function serializar(row: { id: string; nome: string; rede: string | null; cidade: string; estado: string; instagramHandle: string | null; autoScrapeEnabled: boolean; frequenciaScrape: string; ultimoScrapeAt: Date | null; createdAt: Date; updatedAt: Date; _count?: { encartes: number } }): ConcorrenteRegistro {
  return { id: row.id, nome: row.nome, rede: row.rede, cidade: row.cidade, estado: row.estado, instagramHandle: row.instagramHandle || '', autoScrapeEnabled: row.autoScrapeEnabled, frequenciaScrape: row.frequenciaScrape as ConcorrenteInput['frequenciaScrape'], ultimoScrapeAt: row.ultimoScrapeAt?.toISOString() || null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), encartesCount: row._count?.encartes || 0 };
}
export async function statusIntegracoes(ownerId: string) {
  const { lerIntegracoes } = await import('./integracoes');
  const keys = await lerIntegracoes(ownerId);
  return { persistencia: 'supabase', banco: Boolean(process.env.DATABASE_URL), instagram: Boolean(keys.apifyToken), ocr: Boolean(keys.geminiApiKey), agendamento: false, adaptador: true };
}
export function listarConcorrentes(ownerId: string): Promise<ConcorrenteRegistro[]> {
  return withDb(ownerId, async db => (await db.concorrente.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { encartes: true } } } })).map(serializar));
}
export async function obterConcorrente(id: string, ownerId: string) { return withDb(ownerId, db => db.concorrente.findFirst({ where: { id, ownerId } })); }
export async function salvarConcorrente(input: ConcorrenteInput, ownerId: string, id?: string): Promise<ConcorrenteRegistro> {
  return withDb(ownerId, async db => {
    try {
      if (await db.concorrente.findFirst({ where: { ownerId, instagramHandle: { equals: input.instagramHandle, mode: 'insensitive' }, ...(id ? { id: { not: id } } : {}) } })) throw new CadastroError('Este perfil do Instagram já está cadastrado.', 409);
      const include = { _count: { select: { encartes: true } } };
      return serializar(id ? await db.concorrente.update({ where: { id_ownerId: { id, ownerId } }, data: input, include }) : await db.concorrente.create({ data: { ...input, ownerId }, include }));
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new CadastroError('Este perfil do Instagram já está cadastrado.', 409);
      if ((error as { code?: string }).code === 'P2025') throw new CadastroError('Concorrente não encontrado.', 404);
      throw error;
    }
  });
}
