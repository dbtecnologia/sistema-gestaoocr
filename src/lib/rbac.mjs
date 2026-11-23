const rolePermissions = {
  admin: ['dashboard:read', 'dashboard:consolidated', 'admin:manage'],
  diretor: ['dashboard:read', 'dashboard:consolidated'],
  gerente: ['dashboard:read', 'dashboard:unit'],
  supervisor: ['dashboard:read', 'dashboard:unit'],
  vendedor: ['dashboard:read', 'dashboard:own'],
  engenharia: ['dashboard:read', 'dashboard:unit'],
  instalacao: ['dashboard:read', 'dashboard:unit'],
  financeiro: ['dashboard:read', 'dashboard:unit'],
  pos_venda: ['dashboard:read', 'dashboard:unit']
};

export function hasPermission(role, permission) {
  return Boolean(rolePermissions[role]?.includes(permission));
}

export function resolveDashboardScope({ role = 'diretor', branchId = null } = {}) {
  if (!rolePermissions[role]) return { allowed: false, reason: 'unknown_role' };
  if (!hasPermission(role, 'dashboard:read')) return { allowed: false, reason: 'missing_permission' };
  if (role === 'admin' || role === 'diretor') return { allowed: true, scope: 'consolidated', branchId: null };
  return { allowed: true, scope: 'unit', branchId };
}

export function getRolePermissions() {
  return structuredClone(rolePermissions);
}
