'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Camera, CheckCircle2, ExternalLink, Loader2, Pencil, Plus, RefreshCw, Search, Store, X } from 'lucide-react';
import { ESTADOS, FREQUENCIAS, type ConcorrenteInput, type ConcorrenteRegistro } from '@/lib/concorrente-model';

type Integracoes = { persistencia: string; banco: boolean; instagram: boolean; ocr: boolean; agendamento: boolean; adaptador: boolean };
const empty: ConcorrenteInput = { nome: '', rede: '', cidade: '', estado: 'SP', instagramHandle: '', frequenciaScrape: 'DIARIO', autoScrapeEnabled: true };
const inputClass = 'focus-ring mt-2 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none disabled:opacity-60';
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || 'Não foi possível conectar ao servidor. Tente novamente.');
  return body as T;
}
export default function ConcorrentesPage() {
  const [rows, setRows] = useState<ConcorrenteRegistro[]>([]);
  const [integracoes, setIntegracoes] = useState<Integracoes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<ConcorrenteInput>({ ...empty });
  const [editing, setEditing] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    api<{ concorrentes: ConcorrenteRegistro[]; integracoes: Integracoes }>('/api/concorrentes', { signal: controller.signal })
      .then(data => { setRows(data.concorrentes); setIntegracoes(data.integracoes); if (!data.concorrentes.length) setFormOpen(true); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => { if (formOpen) nameRef.current?.focus(); }, [formOpen, editing]);
  function openForm(row?: ConcorrenteRegistro) {
    setForm(row ? { nome: row.nome, rede: row.rede || '', cidade: row.cidade, estado: row.estado, instagramHandle: `@${row.instagramHandle}`, frequenciaScrape: row.frequenciaScrape, autoScrapeEnabled: row.autoScrapeEnabled } : { ...empty });
    setEditing(row?.id || null); setFormError(''); setFormOpen(true);
    sectionRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }
  function replaceRow(row: ConcorrenteRegistro) { setRows(previous => previous.some(item => item.id === row.id) ? previous.map(item => item.id === row.id ? row : item) : [row, ...previous]); }
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setFormError(''); setNotice('');
    try {
      const data = await api<{ concorrente: ConcorrenteRegistro }>(editing ? `/api/concorrentes/${editing}` : '/api/concorrentes', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(form) });
      replaceRow(data.concorrente); setNotice(editing ? 'Cadastro atualizado e salvo.' : `${data.concorrente.nome} cadastrado. O perfil já aparece na lista abaixo.`);
      setFormOpen(false); setEditing(null); setForm({ ...empty });
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Não foi possível salvar o cadastro.'); }
    finally { setSaving(false); }
  }
  async function update(row: ConcorrenteRegistro, values: Partial<ConcorrenteInput>) {
    setBusy(row.id); setError(''); setNotice('');
    try { const data = await api<{ concorrente: ConcorrenteRegistro }>(`/api/concorrentes/${row.id}`, { method: 'PATCH', body: JSON.stringify(values) }); replaceRow(data.concorrente); setNotice('Preferência salva.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível atualizar.'); }
    finally { setBusy(null); }
  }
  async function scrape(row: ConcorrenteRegistro) {
    setBusy(row.id); setError(''); setNotice('');
    try {
      const result = await api<{ message: string }>(`/api/scrape/${row.id}`, { method: 'POST' }); setNotice(result.message);
      const data = await api<{ concorrentes: ConcorrenteRegistro[] }>('/api/concorrentes'); setRows(data.concorrentes);
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível fazer a varredura.'); }
    finally { setBusy(null); }
  }
  const visible = rows.filter(row => `${row.nome} ${row.rede || ''} ${row.instagramHandle} ${row.cidade} ${row.estado}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  const ready = Boolean(integracoes?.banco && integracoes.instagram && integracoes.ocr && integracoes.adaptador);
  return <div className="min-h-screen grid-noise">
    <header className="border-b border-line bg-paper/90 px-6 py-6 md:px-10"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight">Concorrentes</h1><p className="mt-1 text-sm text-muted">Cadastre os supermercados e os perfis que você quer acompanhar.</p></div><button onClick={() => openForm()} className="focus-ring flex items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm text-white"><Plus size={17} className="text-lime"/>Adicionar concorrente</button></div></header>
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      {error && <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>{error}</span><button aria-label="Fechar aviso" onClick={() => setError('')}><X size={18}/></button></div>}
      {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={18}/>{notice}</div>}
      <section className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-line bg-white p-5"><div className="flex items-center gap-3"><div className="rounded-xl bg-lime p-3"><Store size={22}/></div><div><p className="font-semibold">{loading ? 'Carregando cadastros…' : `${rows.length} ${rows.length === 1 ? 'supermercado cadastrado' : 'supermercados cadastrados'}`}</p><p className="mt-1 text-sm text-muted">{rows.filter(row => row.autoScrapeEnabled).length} perfis selecionados para acompanhamento</p></div></div><div className="text-sm"><span className={`inline-block h-2 w-2 rounded-full ${ready ? 'bg-emerald-500' : 'bg-amber-500'}`}/> <span className="ml-1">{ready ? 'Coleta manual disponível' : 'Coleta pendente de configuração'}</span><p className="mt-1 text-xs text-muted">{integracoes?.persistencia === 'local' ? 'Cadastros salvos neste computador.' : integracoes ? 'Cadastros salvos no banco compartilhado.' : 'Verificando conexão…'}</p></div></section>
      {formOpen && <section ref={sectionRef} aria-labelledby="cadastro-title" className="scroll-mt-6 rounded-2xl border border-line bg-white p-6">
        <div className="mb-6 flex items-start justify-between gap-4"><div><h2 id="cadastro-title" className="text-lg font-semibold">{editing ? 'Editar supermercado' : 'Novo supermercado concorrente'}</h2><p className="mt-1 text-sm text-muted">Cole o link do Instagram ou informe o @ do perfil.</p></div><button type="button" disabled={saving} onClick={() => setFormOpen(false)} aria-label="Fechar formulário" className="focus-ring rounded-lg p-2 hover:bg-paper"><X size={20}/></button></div>
        <form onSubmit={save}><fieldset disabled={saving} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-medium">Nome do supermercado *<input ref={nameRef} required minLength={2} maxLength={120} name="nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Supermercado Central" className={inputClass}/></label>
          <label className="text-sm font-medium">Instagram do concorrente *<input required maxLength={300} name="instagramHandle" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={form.instagramHandle} onChange={e => setForm({ ...form, instagramHandle: e.target.value })} placeholder="@supermercadocentral ou link do perfil" className={inputClass} aria-describedby="instagram-help"/><span id="instagram-help" className="mt-1.5 block text-xs font-normal text-muted">Ex.: https://www.instagram.com/supermercadocentral/</span></label>
          <label className="text-sm font-medium">Rede / grupo (opcional)<input maxLength={120} name="rede" value={form.rede || ''} onChange={e => setForm({ ...form, rede: e.target.value })} placeholder="Ex.: Rede Central" className={inputClass}/></label>
          <label className="text-sm font-medium">Cidade *<input required minLength={2} maxLength={100} name="cidade" value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} placeholder="Ex.: Campinas" className={inputClass}/></label>
          <label className="text-sm font-medium">Estado *<select name="estado" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} className={inputClass}>{ESTADOS.map(uf => <option key={uf}>{uf}</option>)}</select></label>
          <label className="text-sm font-medium">Frequência desejada<select name="frequenciaScrape" value={form.frequenciaScrape} onChange={e => setForm({ ...form, frequenciaScrape: e.target.value as ConcorrenteInput['frequenciaScrape'] })} className={inputClass}>{Object.entries(FREQUENCIAS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="flex items-center gap-3 text-sm sm:col-span-2 lg:col-span-3"><input type="checkbox" checked={form.autoScrapeEnabled} onChange={e => setForm({ ...form, autoScrapeEnabled: e.target.checked })} className="h-4 w-4 accent-emerald-700"/>Incluir este perfil no acompanhamento</label>
        </fieldset><p className="mt-4 text-xs leading-5 text-muted">A frequência fica salva no cadastro. As buscas automáticas começam após a configuração da integração e do agendador.</p>
        {formError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{formError}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-line pt-5"><button type="button" disabled={saving} onClick={() => setFormOpen(false)} className="focus-ring rounded-xl border border-line px-4 py-2.5 text-sm">Cancelar</button><button disabled={saving} className="focus-ring flex items-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-sm text-white disabled:opacity-60">{saving && <Loader2 size={16} className="animate-spin"/>}{saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Cadastrar supermercado'}</button></div></form>
      </section>}
      <section className="overflow-hidden rounded-2xl border border-line bg-white" aria-labelledby="perfis-title"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5"><div><h2 id="perfis-title" className="font-semibold">Perfis cadastrados</h2><p className="mt-1 text-sm text-muted">Edite os dados, pause o acompanhamento ou abra o Instagram.</p></div><label className="relative"><span className="sr-only">Buscar supermercado, perfil ou cidade</span><Search className="absolute left-3 top-3 text-muted" size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar concorrente" className="focus-ring w-full rounded-xl border border-line bg-paper py-2.5 pl-9 pr-3 text-sm outline-none sm:w-64"/></label></div>
      {loading ? <div role="status" className="flex items-center justify-center gap-2 p-12 text-muted"><Loader2 size={20} className="animate-spin"/>Carregando…</div> : !visible.length ? <div className="px-6 py-12 text-center"><Camera size={28} className="mx-auto mb-4 text-muted"/><h3 className="font-semibold">{query ? 'Nenhum concorrente encontrado' : 'Cadastre seu primeiro concorrente'}</h3><p className="mt-2 text-sm text-muted">{query ? 'Tente outro nome, perfil ou cidade.' : 'Adicione o Instagram de um supermercado para começar.'}</p>{!query && <button onClick={() => openForm()} className="focus-ring mt-5 rounded-xl bg-ink px-4 py-2.5 text-sm text-white">Adicionar supermercado</button>}</div> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-paper text-xs text-muted"><tr>{['Supermercado / Instagram','Frequência','Última coleta','Acompanhamento','Ações'].map(title => <th key={title} scope="col" className="px-5 py-3 font-medium">{title}</th>)}</tr></thead><tbody>{visible.map(row => <tr key={row.id} className="border-t border-line">
        <td className="px-5 py-5"><p className="font-medium">{row.nome}</p><a className="mt-1 inline-flex items-center gap-1 text-emerald-800 hover:underline" href={`https://www.instagram.com/${encodeURIComponent(row.instagramHandle)}/`} target="_blank" rel="noopener noreferrer">@{row.instagramHandle}<ExternalLink size={12}/></a><p className="mt-1 text-xs text-muted">{row.cidade}, {row.estado}{row.rede ? ` · ${row.rede}` : ''}</p></td>
        <td className="px-5 py-5"><select aria-label={`Frequência de ${row.nome}`} disabled={busy !== null || saving} value={row.frequenciaScrape} onChange={e => update(row, { frequenciaScrape: e.target.value as ConcorrenteInput['frequenciaScrape'] })} className="focus-ring rounded-lg border border-line bg-white px-2 py-2 outline-none disabled:opacity-50">{Object.entries(FREQUENCIAS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td>
        <td className="px-5 py-5 text-xs text-muted">{row.ultimoScrapeAt ? new Date(row.ultimoScrapeAt).toLocaleString('pt-BR') : 'Ainda não realizada'}<p className="mt-1">{row.encartesCount} encartes</p></td>
        <td className="px-5 py-5"><button disabled={busy !== null || saving} onClick={() => update(row, { autoScrapeEnabled: !row.autoScrapeEnabled })} aria-label={`${row.autoScrapeEnabled ? 'Pausar' : 'Ativar'} acompanhamento de ${row.nome}`} aria-pressed={row.autoScrapeEnabled} className={`focus-ring rounded-full px-3 py-1.5 text-xs disabled:opacity-50 ${row.autoScrapeEnabled ? 'bg-lime text-ink' : 'bg-paper text-muted'}`}>{row.autoScrapeEnabled ? 'Selecionado' : 'Pausado'}</button></td>
        <td className="px-5 py-5"><div className="flex gap-2"><button onClick={() => openForm(row)} disabled={saving || busy !== null} className="focus-ring flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 disabled:opacity-50"><Pencil size={14}/>Editar</button><button onClick={() => scrape(row)} disabled={saving || busy !== null} aria-label={`Buscar encartes de ${row.nome}`} title={ready ? 'Buscar publicações agora' : 'Ver o que falta configurar para a coleta'} className="focus-ring rounded-lg border border-line p-2 disabled:opacity-50"><RefreshCw size={16} className={busy === row.id ? 'animate-spin' : ''}/></button></div></td>
      </tr>)}</tbody></table></div>}</section>
      {integracoes && !ready && <aside className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"><h2 className="font-semibold">Para coletar encartes do Instagram</h2><p className="mt-2 leading-6">O cadastro já funciona. A coleta precisa das integrações abaixo. Nenhuma busca ou leitura de imagem é simulada.</p><ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs"><li>{integracoes.banco ? '✓' : '○'} Banco compartilhado</li><li>{integracoes.instagram && integracoes.adaptador ? '✓' : '○'} Conector do Instagram</li><li>{integracoes.ocr ? '✓' : '○'} Leitura de encartes por IA</li><li>○ Agendamento automático</li></ul></aside>}
    </div>
  </div>;
}
