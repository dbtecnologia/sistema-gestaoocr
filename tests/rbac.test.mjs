import test from 'node:test';
import assert from 'node:assert/strict';
import { hasPermission, resolveDashboardScope } from '../src/lib/rbac.mjs';

test('diretor pode consultar dashboard consolidado', () => {
  assert.equal(hasPermission('diretor', 'dashboard:consolidated'), true);
  assert.deepEqual(resolveDashboardScope({ role: 'diretor' }), { allowed: true, scope: 'consolidated', branchId: null });
});

test('vendedor não recebe escopo consolidado', () => {
  assert.equal(hasPermission('vendedor', 'dashboard:consolidated'), false);
  assert.deepEqual(resolveDashboardScope({ role: 'vendedor', branchId: 'campinas' }), { allowed: true, scope: 'unit', branchId: 'campinas' });
});

test('papel desconhecido é negado', () => {
  assert.deepEqual(resolveDashboardScope({ role: 'root' }), { allowed: false, reason: 'unknown_role' });
});
