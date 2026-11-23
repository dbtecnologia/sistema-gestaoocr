-- Migration inicial da fundação. Gerada para PostgreSQL; aplicar com Prisma Migrate.
-- O schema completo e os relacionamentos estão em prisma/schema.prisma.
-- Este arquivo é mantido no repositório para versionamento explícito da evolução do banco.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- A migration completa será gerada pelo Prisma na primeira conexão autorizada ao banco.
-- Não executar contra produção sem revisar o plano e os índices resultantes.
