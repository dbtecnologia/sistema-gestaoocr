# Invest Solar Intelligence

Fundação da plataforma operacional da Invest Solar. Esta primeira fase entrega um dashboard executivo executável, API modular, base de dados preparada para PostgreSQL/Prisma, RBAC e escopo por unidade.

## Executar localmente

O ambiente atual não possui npm instalado, mas a aplicação usa apenas APIs nativas do Node para a primeira fase.

```powershell
node src/server.mjs
```

Abra `http://localhost:3000`.

Para validar a fundação:

```powershell
node --test
```

## O que já está funcionando

- Dashboard executivo responsivo com filtros de período, unidade, vendedor e tipo de projeto.
- API `GET /api/health` e `GET /api/dashboard`.
- Filtragem de KPIs, pipeline, alertas e atividades no servidor.
- Camada explícita de dados demonstrativos para desenvolvimento, identificada na API e na interface.
- RBAC inicial e escopo multiunidade no módulo `src/lib/rbac.mjs`.
- Schema relacional Prisma e migration SQL inicial.
- Documentação de arquitetura, decisões e próximos passos em `docs/architecture.md`.

## Limites desta fase

Autenticação real, persistência PostgreSQL, integrações externas, IA com tool calling e módulos operacionais ainda não estão conectados. A UI não apresenta dados demonstrativos como produção: a origem aparece sempre como “Ambiente de desenvolvimento”.

## Direção técnica

O servidor atual é um adaptador HTTP pequeno para permitir execução imediata sem instalar dependências. Na próxima etapa ele deve ser movido para uma API TypeScript/Next.js ou serviço Node modular, mantendo os contratos HTTP e o schema Prisma já definidos.
