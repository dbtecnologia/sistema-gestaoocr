# Arquitetura proposta

## Princípios

1. **Domínio antes de integração**: CRM, projetos, usinas, pós-venda e financeiro são módulos de negócio independentes.
2. **Dados reais ou claramente demonstrativos**: nenhum conector é tratado como conectado sem credenciais e contrato verificados.
3. **Permissão no servidor**: a interface apenas reflete o escopo; toda consulta deve ser filtrada por papel, unidade e permissões no backend.
4. **IA como camada de ferramentas**: o modelo não acessa tabelas livremente. Cada pergunta utiliza uma ferramenta autorizada, com auditoria e confirmação para mutações.
5. **Adaptadores substituíveis**: WhatsApp, fabricantes de inversores, ERP e provedores de IA entram como adaptadores com estado `not_connected` até validação.

## Camadas

```text
apps/web          Interface responsiva e acessível
apps/api          API REST, autenticação, RBAC e casos de uso
packages/domain   Tipos, regras e contratos compartilhados
packages/integrations Adaptadores externos com health checks
prisma            Schema, índices e migrations PostgreSQL
```

Nesta entrega, o conteúdo foi mantido em `src/` para reduzir atrito no ambiente sem npm. A divisão de módulos já está refletida pelos arquivos de domínio e pode ser extraída para o monorepo acima quando a toolchain TypeScript/Next for instalada.

## Modelo de dados inicial

O schema em `prisma/schema.prisma` cobre: usuários, papéis, permissões, unidades, clientes, leads, oportunidades, propostas, contratos, projetos, instalações, usinas, inversores, geração, alertas, chamados, conversas, mensagens, tarefas, automações, transações financeiras, integrações, conversas de IA, ações de IA e auditoria.

Todas as entidades operacionais têm `branchId` quando o dado pertence a uma unidade. Consultas consolidadas devem ser explícitas e autorizadas.

## Fase 1 — Fundação

- Login e sessão: contrato preparado, implementação real pendente.
- RBAC/multiunidade: regra de escopo implementada no servidor e coberta por testes.
- Dashboard: endpoint com filtros e UI executável.
- Persistência: schema/migration preparados; o endpoint atual usa `DEMO_DATA_ENABLED=true`.

## Próximas fatias

1. Conectar PostgreSQL/Prisma e substituir `demo-data.mjs` pelo repositório de leitura.
2. Implementar autenticação com sessão segura, hash de senha, recuperação e auditoria.
3. Entregar CRM e clientes com comandos protegidos por permissão.
4. Adicionar SOLAR AI somente sobre ferramentas autorizadas e dados persistidos.
5. Evoluir para Next.js/React/TypeScript quando o gerenciador de dependências estiver disponível.
