# Mercado Radar

Plataforma SaaS de inteligência competitiva de preços para supermercados.

## Começar

```bash
cp .env.example .env
pnpm install
pnpm prisma generate
pnpm dev
```

Configure `DATABASE_URL` com um PostgreSQL local ou um projeto Supabase. Para OCR configure `GEMINI_API_KEY`. O adaptador de coleta em `lib/scraper.ts` está isolado para receber um Actor do Apify ou um crawler Playwright.

## Rotas

- `/` visão geral operacional
- `/dashboard/concorrentes` gestão de perfis e frequência
- `/dashboard/encartes/demo/validate` validação split-screen
- `/dashboard/benchmarking` matriz de preços
- `/dashboard/reports` analytics e exportações
- `POST /api/scrape/:concorrenteId` dispara varredura
- `PATCH /api/encartes/:id/validate` publica um encarte validado

## Deploy

O projeto está pronto para GitHub + Vercel. No Vercel, defina `DATABASE_URL`, `GEMINI_API_KEY` e `APIFY_API_TOKEN`; use Supabase como PostgreSQL e execute `prisma migrate deploy` no pipeline de produção.
