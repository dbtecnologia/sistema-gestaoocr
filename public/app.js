const $ = (selector) => document.querySelector(selector);
const state = { data: null };
const formatNumber = (value) => new Intl.NumberFormat('pt-BR').format(value);
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);

function setOptions(selector, values) {
  $(selector).innerHTML = values.map((value) => `<option>${value}</option>`).join('');
}

function renderKpis(kpis) {
  const entries = [kpis.leads, kpis.negotiation, kpis.proposals, kpis.revenue, kpis.projects, kpis.plants];
  $('#kpi-grid').innerHTML = entries.map((item) => `<article class="kpi-card"><div class="kpi-label">${item.label}</div><div class="kpi-value ${item.label.includes('Faturamento') ? 'currency' : ''}">${item.label.includes('Faturamento') ? formatCurrency(item.value) : formatNumber(item.value)}</div><div class="kpi-footer"><span class="trend ${item.tone}">${item.change >= 0 ? '↗' : '↘'} ${Math.abs(item.change).toFixed(1).replace('.', ',')}%</span><span style="color:#9ba69e">vs. período anterior</span></div></article>`).join('');
}

function renderPipeline(pipeline) {
  const max = Math.max(...pipeline.map((item) => item.count), 1);
  $('#pipeline-total').textContent = formatNumber(pipeline.reduce((sum, item) => sum + item.count, 0));
  $('#pipeline-chart').innerHTML = pipeline.map((item) => `<div class="bar-wrap"><span class="bar-label">${item.count}</span><div class="bar" style="height:${Math.max(8, (item.count / max) * 96)}px" title="${item.stage}: ${item.count} oportunidades"></div><span class="bar-label">${item.stage.replace('Proposta enviada', 'Proposta').replace('Contrato fechado', 'Fechado')}</span></div>`).join('');
}

function renderAlerts(alerts) {
  const icons = { critical: '!', warning: '⌁', info: 'i' };
  $('#alert-list').innerHTML = alerts.map((item) => `<div class="alert-item"><div class="alert-symbol ${item.kind}">${icons[item.kind]}</div><div><strong>${item.title}</strong><p>${item.detail}</p></div><time>${item.time}</time></div>`).join('');
}

function renderActivities(activities) {
  $('#activity-list').innerHTML = activities.map((item) => `<div class="activity-item"><div class="avatar">${item.initials}</div><div><strong>${item.name}</strong><p>${item.action} <b>${item.target}</b></p></div><time>${item.time}</time></div>`).join('');
}

async function loadDashboard() {
  const params = new URLSearchParams({ period: $('#period-filter').value, unit: $('#unit-filter').value, seller: $('#seller-filter').value, projectType: $('#project-filter').value });
  try {
    const response = await fetch(`/api/dashboard?${params}`);
    if (!response.ok) throw new Error('Falha ao consultar dashboard');
    state.data = await response.json();
    renderKpis(state.data.kpis); renderPipeline(state.data.pipeline); renderAlerts(state.data.alerts); renderActivities(state.data.activities);
  } catch (error) { showToast(error.message); }
}

function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); window.setTimeout(() => toast.classList.remove('show'), 3000); }
function openAi(question = '') { $('#ai-drawer').classList.add('open'); $('#ai-drawer').setAttribute('aria-hidden', 'false'); if (question) { $('#ai-input').value = question; submitQuestion(question); } else $('#ai-input').focus(); }
function closeAi() { $('#ai-drawer').classList.remove('open'); $('#ai-drawer').setAttribute('aria-hidden', 'true'); }
function submitQuestion(question) { const user = $('#selected-question'); const answer = $('#assistant-answer'); user.hidden = false; answer.hidden = false; user.textContent = question; answer.textContent = question.toLowerCase().includes('usina') ? 'No ambiente atual, existe 1 alerta demonstrativo de geração: a Usina Vale Verde aparece 18% abaixo do esperado. A causa ainda não foi diagnosticada; é necessária validação técnica.' : 'No ambiente atual, existem 7 oportunidades demonstrativas sem retorno há mais de cinco dias. Posso detalhar por responsável quando o CRM estiver conectado ao PostgreSQL.'; $('#ai-input').value = ''; }

['#period-filter', '#unit-filter', '#seller-filter', '#project-filter'].forEach((selector) => $(selector).addEventListener('change', loadDashboard));
$('#clear-filters').addEventListener('click', () => { $('#period-filter').value = 'Este mês'; $('#unit-filter').selectedIndex = 0; $('#seller-filter').selectedIndex = 0; $('#project-filter').selectedIndex = 0; loadDashboard(); });
$('#dismiss-banner').addEventListener('click', (event) => event.currentTarget.closest('.dev-banner').remove());
$('#export-button').addEventListener('click', () => showToast('Exportação será habilitada com o módulo de relatórios.'));
$('#open-ai').addEventListener('click', () => openAi()); $('#close-ai').addEventListener('click', closeAi); $('#close-ai-button').addEventListener('click', closeAi);
document.querySelectorAll('.suggestion').forEach((button) => button.addEventListener('click', () => openAi(button.dataset.question)));
$('#ai-form').addEventListener('submit', (event) => { event.preventDefault(); const question = $('#ai-input').value.trim(); if (question) submitQuestion(question); });
$('.mobile-menu').addEventListener('click', () => $('.sidebar').classList.toggle('open'));

fetch('/api/dashboard').then((response) => response.json()).then((data) => { setOptions('#unit-filter', data.filters.units); setOptions('#seller-filter', data.filters.sellers); setOptions('#project-filter', data.filters.projectTypes); return loadDashboard(); }).catch(() => showToast('Não foi possível iniciar o dashboard.'));
