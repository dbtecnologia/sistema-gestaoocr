Attempting to perform the InitializeDefaultDrives operation on the 'FileSystem' provider failed.
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
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])); }
function fromRow(row) { return { id: row.id, name: row.name, dueDate: row.due_date, payDate: row.payment_date || '', reminder: row.reminder_days, status: row.status }; }
function showToast(message) { const element = $('toast'); element.textContent = message; element.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => element.classList.remove('show'), 2800); }
function setAuthMessage(message, success = false) { const element = $('authMessage'); element.textContent = message; element.style.color = success ? 'var(--green)' : 'var(--coral)'; }

function renderStats() {
  const paid = payments.filter(item => effectiveStatus(item) === 'paid').length;
  const open = payments.filter(item => effectiveStatus(item) !== 'paid').length;
  $('payableCount').textContent = open;
  $('paidCount').textContent = paid;
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

function render() { renderStats(); renderCalendar(); }

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
    return `<div class="day-item"><div><div class="day-item-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div><div class="day-item-meta">${statusLabel(status)} · aviso ${item.reminder ? `${item.reminder}d antes` : 'no dia'}${item.payDate ? ` · pago em ${formatDate(item.payDate)}` : ''}</div></div><div class="day-item-actions"><button class="day-action" data-action="toggle" data-id="${item.id}" type="button">${status === 'paid' ? 'Reabrir' : 'Marcar pago'}</button><button class="day-action delete" data-action="delete" data-id="${item.id}" type="button">Excluir</button></div></div>`;
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
$('prevMonth').addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth() - 1); renderCalendar(); });
$('nextMonth').addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth() + 1); renderCalendar(); });
$('navPayments').addEventListener('click', () => $('calendarTitle').scrollIntoView({ behavior: 'smooth' }));
$('paymentForm').addEventListener('submit', async event => {
  event.preventDefault();
  const data = new FormData(event.target);
  const status = data.get('status');
  const { error } = await supabaseClient.from('payments').insert({ owner_id: session.user.id, name: data.get('name').trim(), due_date: data.get('dueDate'), payment_date: data.get('payDate') || null, reminder_days: Number(data.get('reminder')), status });
  if (error) { showToast('Não foi possível salvar o pagamento.'); console.error(error); return; }
  closeModal();
  await loadPayments();
  showToast('Pagamento salvo com sucesso.');
});

supabaseClient.auth.onAuthStateChange((_event, nextSession) => setTimeout(() => showApp(nextSession), 0));
supabaseClient.auth.getSession().then(({ data }) => showApp(data.session));

