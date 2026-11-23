import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../src/server.mjs';

async function request(url, headers = {}) {
  const result = {};
  const response = { writeHead(status, responseHeaders) { result.status = status; result.headers = responseHeaders; }, end(body) { result.body = body; } };
  await handle({ url, headers: { host: 'localhost', ...headers } }, response);
  return { ...result, json: result.body ? JSON.parse(result.body) : null };
}

test('health endpoint reports development mode', async () => {
  const response = await request('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.json.status, 'ok');
  assert.equal(response.json.demoData, true);
});

test('dashboard exposes source warning and applies filters', async () => {
  const response = await request('/api/dashboard?period=Hoje&unit=Campinas');
  assert.equal(response.status, 200);
  assert.equal(response.headers['x-data-source'], 'demo-development');
  assert.equal(response.json.warning.includes('demonstrativos'), true);
  assert.equal(response.json.filtersApplied.unit, 'Campinas');
  assert.equal(response.json.filtersApplied.period, 'Hoje');
});

test('dashboard denies unknown roles before returning data', async () => {
  const response = await request('/api/dashboard', { 'x-demo-role': 'unknown' });
  assert.equal(response.status, 403);
  assert.equal(response.json.error, 'forbidden');
});
