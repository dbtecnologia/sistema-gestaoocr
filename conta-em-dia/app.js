const SUPABASE_URL = 'https://gozhlkodktqvgojlrbxt.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Oc4AnG5G3kPxdwXK4zrILw_1LbJG3bo';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const today = new Date();
today.setHours(0, 0, 0, 0);
const pad = value => String(value).padStart(2, '0');
const iso = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseDate = value => { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day); };
const formatDate = value => value ? parseDate(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '') : 'sem data';
const $ = id => document.getElementById(id);

let session = null;
let payments = [];
let viewDate = new Date(today.getFullYear(), today.getMonth(), 1);
let authMode = 'signin';

function effectiveStatus(item) { return item.status === 'paid' ? 'paid' : parseDate(item.dueDate) < today ? 'overdue' : 'pending'; }
function statusLabel(status) { return status === 'paid' ? 'Pago' : status === 'overdue' ? 'Vencendo' : 'Pendente'; }
function daysUntil(value) { return Math.round((parseDate(value) - today) / 86400000); }
function dueAlert(item) {
  if (effectiveStatus(item) === 'paid') return '';
  const days = daysUntil(item.dueDate);
  if (days < 0) return `Vencido há ${Math.abs(days)} dia${Math.abs(days) === 1 ? '' : 's'}`;
  if (days === 0) return 'Vence hoje';
  if (days === 1) return 'Vence amanhã';
  if (days <= Number(item.reminder || 0)) return `Aviso: vence em ${days} dias`;
  return `Vence em ${days} dias`;
}
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])); }
function fromRow(row) { return { id: row.id, name: row.name, dueDate: row.due_date, payDate: row.payment_date || '', reminder: row.reminder_days, status: row.status, amountPaid: Number(row.amount_paid || 0) }; }
function formatMoney(value) { return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function normalizeWhatsApp(value) { const digits = String(value || '').replace(/\D/g, ''); if (digits.length === 10 || digits.length === 11) return `55${digits}`; return digits; }
function formatWhatsApps(item) { return [item.whatsapp1, item.whatsapp2, item.whatsapp3].filter(Boolean).map(value => `+${value}`).join(', '); }
function showToast(message) { const element = $('toast'); element.textContent = message; element.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => element.classList.remove('show'), 2800); }
function setAuthMessage(message, success = false) { const element = $('authMessage'); element.textContent = message; element.style.color = success ? 'var(--green)' : 'var(--coral)'; }

function renderStats() {
  const paid = payments.filter(item => effectiveStatus(item) === 'paid').length;
  const open = payments.filter(item => effectiveStatus(item) !== 'paid').length;
  $('payableCount').textContent = open;
  $('paidCount').textContent = paid;
}

function renderMonthlyReport() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const paidItems = payments.filter(item => {
    const paidDate = item.payDate || item.dueDate;
    const date = parseDate(paidDate);
    return effectiveStatus(item) === 'paid' && date.getFullYear() === year && date.getMonth() === month;
  }).sort((a, b) => (a.payDate || a.dueDate).localeCompare(b.payDate || b.dueDate));
  const total = paidItems.reduce((sum, item) => sum + Number(item.amountPaid || 0), 0);
  $('monthlyReportLabel').textContent = viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  $('monthlyPaidTotal').textContent = formatMoney(total);
  $('monthlyPaidCount').textContent = paidItems.length;
  $('monthlyPaidList').innerHTML = paidItems.length ? paidItems.map(item => `<div class="report-item"><span>${escapeHtml(item.name)}</span><strong>${formatMoney(item.amountPaid)}</strong></div>`).join('') : '<div class="report-empty">Nenhum pagamento registrado neste mês.</div>';
}

function renderCalendar() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  $('monthLabel').textContent = viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, character => character.toUpperCase());
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dateISO = iso(date);
    const items = payments.filter(item => item.dueDate === dateISO);
    const classes = ['day'];
    if (date.getMonth() !== month) classes.push('muted');
    if (dateISO === iso(today)) classes.push('today');
    if (items.length) classes.push('has-items');
    const dots = items.slice(0, 4).map(item => `<i class="dot ${effectiveStatus(item)}"></i>`).join('');
    cells.push(`<div class="${classes.join(' ')}" data-date="${dateISO}"><div class="day-num">${date.getDate()}</div>${items.length ? `<div class="day-dots">${dots}</div><div class="day-count">${items.length} ${items.length === 1 ? 'conta' : 'contas'}</div>` : ''}</div>`);
  }
  $('calendarGrid').innerHTML = cells.join('');
  $('calendarGrid').querySelectorAll('.day.has-items').forEach(element => element.addEventListener('click', () => openDayModal(element.dataset.date)));
}

function renderMonthlyDue() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const filter = $('dueFilter').value;
  const monthItems = payments.filter(item => {
    const date = parseDate(item.dueDate);
    if (date.getFullYear() !== year || date.getMonth() !== month) return false;
    const status = effectiveStatus(item);
    const days = daysUntil(item.dueDate);
    if (filter === 'soon') return status !== 'paid' && days >= 0 && days <= 7;
    if (filter === 'overdue') return status === 'overdue';
    if (filter === 'paid') return status === 'paid';
    return true;
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  $('monthlyDueLabel').textContent = viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  $('monthlyDueList').innerHTML = monthItems.length ? monthItems.map(item => {
    const status = effectiveStatus(item);
    const alert = dueAlert(item);
    const warning = status !== 'paid' && daysUntil(item.dueDate) >= 0 && daysUntil(item.dueDate) <= Number(item.reminder || 0);
    const paidValue = item.amountPaid > 0 ? ` · ${formatMoney(item.amountPaid)}` : '';
    return `<button class="monthly-due-item ${warning ? 'warning' : ''} ${status === 'overdue' ? 'overdue' : ''}" type="button" data-due-date="${item.dueDate}"><span class="monthly-due-date">${parseDate(item.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}</span><span class="monthly-due-name">${escapeHtml(item.name)}</span><span class="monthly-due-status">${statusLabel(status)}${paidValue}<span class="monthly-due-alert">${alert}</span></span></button>`;
  }).join('') : '<div class="monthly-due-empty">Nenhum vencimento encontrado neste filtro.</div>';
  $('monthlyDueList').querySelectorAll('[data-due-date]').forEach(button => button.addEventListener('click', () => openDayModal(button.dataset.dueDate)));
}

function render() { renderStats(); renderCalendar(); renderMonthlyDue(); renderMonthlyReport(); }

async function loadPayments() {
  const { data, error } = await supabaseClient.from('payments').select('id,name,due_date,payment_date,reminder_days,status').order('due_date', { ascending: true });
  if (error) { showToast('Não foi possível carregar os pagamentos.'); console.error(error); return; }
  payments = (data || []).map(fromRow);
  render();
}

function openDayModal(dateISO) {
  const items = payments.filter(item => item.dueDate === dateISO);
  $('dayModalTitle').textContent = parseDate(dateISO).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  $('dayItems').innerHTML = items.length ? items.map(item => {
    const status = effectiveStatus(item);
    return `<div class="day-item"><div><div class="day-item-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div><div class="day-item-meta">${statusLabel(status)} · aviso ${item.reminder ? `${item.reminder}d antes` : 'no dia'}${item.payDate ? ` · pago em ${formatDate(item.payDate)}` : ''}${item.amountPaid > 0 ? ` · ${formatMoney(item.amountPaid)}` : ''}</div></div><div class="day-item-actions"><button class="day-action" data-action="toggle" data-id="${item.id}" type="button">${status === 'paid' ? 'Reabrir' : 'Marcar pago'}</button><button class="day-action delete" data-action="delete" data-id="${item.id}" type="button">Excluir</button></div></div>`;
  }).join('') : '<div class="day-empty">Nenhum pagamento neste dia.</div>';
  $('dayItems').querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => handleDayAction(button.dataset.action, button.dataset.id)));
  $('dayModalBackdrop').classList.add('open');
}

function closeDayModal() { $('dayModalBackdrop').classList.remove('open'); }

async function handleDayAction(action, id) {
  const item = payments.find(payment => payment.id === id);
  if (!item) return;
  if (action === 'delete') {
    if (!window.confirm(`Excluir "${item.name}"?`)) return;
    const { error } = await supabaseClient.from('payments').delete().eq('id', id);
    if (error) { showToast('Não foi possível excluir.'); return; }
    showToast('Pagamento excluído.');
  } else {
    const nextStatus = item.status === 'paid' ? 'pending' : 'paid';
    const { error } = await supabaseClient.from('payments').update({ status: nextStatus, payment_date: nextStatus === 'paid' ? iso(today) : null }).eq('id', id);
    if (error) { showToast('Não foi possível atualizar o status.'); return; }
    showToast(nextStatus === 'paid' ? 'Pagamento marcado como pago.' : 'Pagamento reaberto.');
  }
  closeDayModal();
  await loadPayments();
}

function openModal() { $('modalBackdrop').classList.add('open'); setTimeout(() => $('paymentName').focus(), 50); }
function closeModal() { $('modalBackdrop').classList.remove('open'); $('paymentForm').reset(); $('reminder').value = '3'; }

function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === 'signup';
  $('authTitle').textContent = signup ? 'Criar sua conta' : 'Entrar na sua conta';
  $('authCopy').textContent = signup ? 'Crie sua conta para guardar os pagamentos no banco com segurança.' : 'Acesse seu calendário e mantenha seus pagamentos sincronizados com segurança.';
  $('authSubmit').textContent = signup ? 'Criar conta' : 'Entrar';
  $('authSwitchText').textContent = signup ? 'Já tem uma conta?' : 'Ainda não tem uma conta?';
  $('authSwitch').textContent = signup ? 'Entrar' : 'Criar conta';
  $('authPassword').autocomplete = signup ? 'new-password' : 'current-password';
  setAuthMessage('');
}

async function handleAuth(event) {
  event.preventDefault();
  const email = $('authEmail').value.trim();
  const password = $('authPassword').value;
  $('authSubmit').disabled = true;
  setAuthMessage(authMode === 'signup' ? 'Criando sua conta...' : 'Entrando...');
  const result = authMode === 'signup' ? await supabaseClient.auth.signUp({ email, password }) : await supabaseClient.auth.signInWithPassword({ email, password });
  $('authSubmit').disabled = false;
  if (result.error) { setAuthMessage(result.error.message); return; }
  if (authMode === 'signup' && !result.data.session) { setAuthMessage('Conta criada. Confira seu e-mail para confirmar o acesso.', true); return; }
  setAuthMessage('Acesso confirmado.', true);
}

async function showApp(currentSession) {
  session = currentSession;
  if (!session) { $('authGate').classList.remove('hidden'); $('appShell').classList.add('app-hidden'); return; }
  $('authGate').classList.add('hidden');
  $('appShell').classList.remove('app-hidden');
  await loadPayments();
}

$('authForm').addEventListener('submit', handleAuth);
$('authSwitch').addEventListener('click', () => setAuthMode(authMode === 'signin' ? 'signup' : 'signin'));
$('signOut').addEventListener('click', async () => { await supabaseClient.auth.signOut(); showToast('Você saiu da conta.'); });
$('openModal').addEventListener('click', openModal);
$('closeModal').addEventListener('click', closeModal);
$('cancelModal').addEventListener('click', closeModal);
$('modalBackdrop').addEventListener('click', event => { if (event.target === $('modalBackdrop')) closeModal(); });
$('closeDayModal').addEventListener('click', closeDayModal);
$('dayModalBackdrop').addEventListener('click', event => { if (event.target === $('dayModalBackdrop')) closeDayModal(); });
$('prevMonth').addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth() - 1); renderCalendar(); renderMonthlyDue(); renderMonthlyReport(); });
$('nextMonth').addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth() + 1); renderCalendar(); renderMonthlyDue(); renderMonthlyReport(); });
$('navPayments').addEventListener('click', () => $('calendarTitle').scrollIntoView({ behavior: 'smooth' }));
$('navDue').addEventListener('click', () => {
  $('dueFilter').value = 'all';
  renderMonthlyDue();
  $('monthlyDueTitle').scrollIntoView({ behavior: 'smooth' });
});
$('dueFilter').addEventListener('change', renderMonthlyDue);
$('paymentForm').addEventListener('submit', async event => {
  event.preventDefault();
  const data = new FormData(event.target);
  const status = data.get('status');
  const { error } = await supabaseClient.from('payments').insert({ owner_id: session.user.id, name: data.get('name').trim(), due_date: data.get('dueDate'), payment_date: data.get('payDate') || null, reminder_days: Number(data.get('reminder')), status, amount_paid: Number(data.get('amountPaid') || 0) });
  if (error) { showToast('Não foi possível salvar o pagamento.'); console.error(error); return; }
  closeModal();
  await loadPayments();
  showToast('Pagamento salvo com sucesso.');
});

supabaseClient.auth.onAuthStateChange((_event, nextSession) => setTimeout(() => showApp(nextSession), 0));
supabaseClient.auth.getSession().then(({ data }) => showApp(data.session));
