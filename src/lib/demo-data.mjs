export const demoDashboard = {
  source: 'demo-development',
  generatedAt: '2026-11-23T12:00:00.000Z',
  kpis: {
    leads: { label: 'Leads ativos', value: 248, change: 12.4, tone: 'positive' },
    negotiation: { label: 'Em negociação', value: 37, change: 8.1, tone: 'positive' },
    proposals: { label: 'Propostas enviadas', value: 64, change: 4.7, tone: 'positive' },
    revenue: { label: 'Faturamento previsto', value: 1284000, change: 16.2, tone: 'positive' },
    projects: { label: 'Projetos em andamento', value: 19, change: -2.5, tone: 'neutral' },
    plants: { label: 'Usinas monitoradas', value: 42, change: 5.0, tone: 'positive' }
  },
  pipeline: [
    { stage: 'Novo lead', count: 91, amount: 418000 },
    { stage: 'Qualificação', count: 56, amount: 309000 },
    { stage: 'Simulação', count: 38, amount: 276000 },
    { stage: 'Proposta enviada', count: 34, amount: 211000 },
    { stage: 'Negociação', count: 21, amount: 184000 },
    { stage: 'Contrato fechado', count: 8, amount: 96000 }
  ],
  alerts: [
    { id: 'alt-001', kind: 'critical', title: 'Queda de geração detectada', detail: 'Usina Vale Verde · 18% abaixo do esperado', time: 'há 18 min' },
    { id: 'alt-002', kind: 'warning', title: 'Propostas sem retorno', detail: '7 oportunidades aguardam contato há mais de 5 dias', time: 'há 2 h' },
    { id: 'alt-003', kind: 'info', title: 'Monitoramento próximo do fim', detail: '4 clientes entram em renovação este mês', time: 'há 4 h' }
  ],
  activities: [
    { initials: 'MC', name: 'Marina Costa', action: 'enviou uma proposta', target: 'Residencial Jardim Europa', time: '09:42' },
    { initials: 'RA', name: 'Rafael Alves', action: 'moveu para negociação', target: 'Comercial SulLog', time: '09:18' },
    { initials: 'BS', name: 'Bianca Souza', action: 'agendou instalação', target: 'Fazenda Horizonte', time: '08:56' },
    { initials: 'DL', name: 'Diego Lima', action: 'registrou atendimento', target: 'Usina Santa Clara', time: '08:31' }
  ],
  filters: {
    units: ['Todas as unidades', 'Campinas', 'Ribeirão Preto', 'Uberlândia'],
    sellers: ['Todos os vendedores', 'Marina Costa', 'Rafael Alves', 'Bianca Souza', 'Diego Lima'],
    projectTypes: ['Todos os projetos', 'Residencial', 'Comercial', 'Rural', 'Usina de investimento']
  }
};

export function filterDashboard({ unit, seller, projectType, period }) {
  const result = structuredClone(demoDashboard);
  result.filtersApplied = { unit, seller, projectType, period };
  result.scope = unit && unit !== 'Todas as unidades' ? `Unidade: ${unit}` : 'Todas as unidades';

  // Development-only deterministic variation makes filters observable without pretending to be production data.
  const activeFilters = [unit, seller, projectType].filter((value) => value && !value.startsWith('Todos') && value !== 'Todas as unidades').length;
  if (activeFilters > 0) {
    result.kpis.leads.value = Math.max(0, result.kpis.leads.value - activeFilters * 19);
    result.kpis.negotiation.value = Math.max(0, result.kpis.negotiation.value - activeFilters * 3);
    result.kpis.proposals.value = Math.max(0, result.kpis.proposals.value - activeFilters * 5);
    result.kpis.projects.value = Math.max(0, result.kpis.projects.value - activeFilters * 2);
    result.kpis.plants.value = Math.max(0, result.kpis.plants.value - activeFilters * 4);
    result.kpis.revenue.value = Math.max(0, result.kpis.revenue.value - activeFilters * 74000);
    result.pipeline = result.pipeline.map((item, index) => ({ ...item, count: Math.max(0, item.count - activeFilters * (index % 3 + 1)) }));
  }
  if (period === 'Hoje') {
    result.kpis.leads.value = Math.round(result.kpis.leads.value * 0.16);
    result.kpis.revenue.value = Math.round(result.kpis.revenue.value * 0.08);
    result.scope += ' · Hoje';
  }
  return result;
}
