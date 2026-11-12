# Stack, ambiente local e ferramentas de qualidade

O projeto é um monorepo com npm workspaces: `apps/collector`, `apps/api` e `packages/db`. O npm já vem instalado, e a Vercel e o GitHub Actions o suportam sem configuração. O código é TypeScript em ESM, compatível com Node 24 LTS (`engines: >=24`), com Fastify 5 na API e Vitest nos testes. O acesso ao banco e as migrações usam Prisma 7.10.1, a última versão estável (a 8 ainda é release candidate), e o schema, as migrações e o client gerado ficam no workspace compartilhado `packages/db`. O CSV da fonte é lido com `csv-parse`, que trata campos entre aspas e o BOM presente no arquivo real.

O Postgres local é a versão 17, que o Neon suporta, e roda no Docker Compose na porta 5433, porque a 5432 já está em uso na máquina do mantenedor. O mesmo container tem dois bancos: `estatisticas` (desenvolvimento) e `estatisticas_test` (testes). No CI, o Postgres roda como serviço do workflow.

Os testes ficam na pasta `e2e/` da raiz, na costura de ponta a ponta: fonte falsa, Ingestão, Postgres de teste e `inject` do Fastify.

Para o ticket de CI (#3): lint com ESLint e typescript-eslint, hook de pre-commit instalado pelo Lefthook via npm, e gitleaks instalado pelo mantenedor no sistema, com o passo documentado no README.

## Considered Options

- **pnpm** em vez de npm workspaces: exigiria instalar mais uma ferramenta.
- **Kysely, Drizzle ou SQL puro** em vez de Prisma: Kysely deixaria o SQL das agregações mais explícito, mas o mantenedor já conhece o Prisma. As agregações usam `$queryRaw`.
- **Testcontainers** em vez do Postgres do Docker Compose: mais lento, e diferente do que o CI faz.
- **Biome** em vez de ESLint, **Husky** em vez de Lefthook, e **knip** para dependências sem uso: descartados pelo mantenedor.

## Consequences

- O banco `estatisticas_test` é criado por um script de inicialização que só roda quando o volume do Docker é novo. Um volume antigo precisa ser recriado (`docker compose down -v`).
- Os workspaces exportam o código-fonte TypeScript direto (`./src/index.ts`), sem passo de build. O deploy na Vercel (#12) vai precisar de um build.
