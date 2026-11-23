import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { filterDashboard } from './lib/demo-data.mjs';
import { resolveDashboardScope } from './lib/rbac.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicDir = join(root, 'public');
const port = Number(process.env.PORT || 3000);
const nodeEnv = process.env.NODE_ENV || 'development';
const demoEnabled = process.env.DEMO_DATA_ENABLED !== 'false';

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8' };

function json(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}

function safePublicPath(urlPath) {
  const requested = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const candidate = normalize(join(publicDir, requested));
  return candidate.startsWith(publicDir) ? candidate : null;
}

async function handle(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/api/health') {
    return json(res, 200, { status: 'ok', environment: nodeEnv, demoData: demoEnabled, service: 'invest-solar-intelligence' });
  }
  if (url.pathname === '/api/dashboard') {
    if (!demoEnabled) return json(res, 503, { error: 'demo_data_disabled', message: 'O repositório PostgreSQL ainda não foi conectado.' });
    const role = String(req.headers['x-demo-role'] || 'diretor');
    const branchId = req.headers['x-branch-id'] ? String(req.headers['x-branch-id']) : null;
    const scope = resolveDashboardScope({ role, branchId });
    if (!scope.allowed) return json(res, 403, { error: 'forbidden', reason: scope.reason });
    const data = filterDashboard({
      period: url.searchParams.get('period') || 'Este mês',
      unit: url.searchParams.get('unit') || 'Todas as unidades',
      seller: url.searchParams.get('seller') || 'Todos os vendedores',
      projectType: url.searchParams.get('projectType') || 'Todos os projetos'
    });
    return json(res, 200, { ...data, authorization: scope, warning: 'Dados demonstrativos de desenvolvimento; não representam operação real.' }, { 'x-data-source': 'demo-development' });
  }
  const filePath = safePublicPath(url.pathname);
  if (!filePath) return json(res, 403, { error: 'forbidden' });
  try {
    const content = await readFile(filePath);
    res.writeHead(200, { 'content-type': mime[extname(filePath)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    return res.end(content);
  } catch {
    return json(res, 404, { error: 'not_found' });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  createServer((req, res) => handle(req, res).catch(() => json(res, 500, { error: 'internal_error' }))).listen(port, () => {
    console.log(`Invest Solar Intelligence disponível em http://localhost:${port}`);
  });
}

export { handle };
