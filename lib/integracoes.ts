import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { withDb } from './db';
import { CadastroError } from './concorrentes';
export interface Integracoes { geminiApiKey?: string; apifyToken?: string; geminiModel: string }
function chave() { const key = process.env.APP_ENCRYPTION_KEY; if (!key || !/^[a-f0-9]{64}$/i.test(key)) throw new CadastroError('A chave de proteção das integrações não foi configurada.',503); return Buffer.from(key,'hex'); }
export async function lerIntegracoes(ownerId: string): Promise<Integracoes> {
  const row = await withDb(ownerId, db => db.configuracao.findUnique({ where: { ownerId } }));
  if (!row?.segredos) return { geminiApiKey: process.env.GEMINI_API_KEY, apifyToken: process.env.APIFY_API_TOKEN, geminiModel: row?.geminiModel || process.env.GEMINI_MODEL || 'gemini-3.8-flash' };
  const [iv,tag,encrypted] = row.segredos.split('.');
  const decipher = createDecipheriv('aes-256-gcm',chave(),Buffer.from(iv,'hex')); decipher.setAuthTag(Buffer.from(tag,'hex'));
  const data = JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted,'hex')),decipher.final()]).toString('utf8'));
  return { ...data, geminiModel: row.geminiModel };
}
export async function salvarIntegracoes(ownerId: string, input: { geminiApiKey?: string; apifyToken?: string; geminiModel?: string }) {
  const previous = await lerIntegracoes(ownerId);
  const data = { geminiApiKey: input.geminiApiKey?.trim() || previous.geminiApiKey, apifyToken: input.apifyToken?.trim() || previous.apifyToken, geminiModel: input.geminiModel?.trim() || previous.geminiModel };
  if (input.geminiApiKey?.trim()) {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', { headers: { 'x-goog-api-key': data.geminiApiKey! }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new CadastroError('A chave Gemini não foi aceita. Confira a chave e as permissões.');
  }
  if (input.apifyToken?.trim()) {
    const response = await fetch('https://api.apify.com/v2/users/me', { headers: { Authorization: 'Bearer ' + data.apifyToken }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new CadastroError('O token Apify não foi aceito. Confira o token e as permissões.');
  }
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm',chave(),iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data),'utf8'),cipher.final()]);
  const segredos = [iv.toString('hex'),cipher.getAuthTag().toString('hex'),encrypted.toString('hex')].join('.');
  await withDb(ownerId, db => db.configuracao.upsert({ where: { ownerId }, create: { ownerId, segredos, geminiModel: data.geminiModel }, update: { segredos, geminiModel: data.geminiModel } }));
}
