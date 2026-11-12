# Stack, ambiente local e ferramentas de qualidade

O projeto é um monorepo com npm workspaces: `apps/collector`, `apps/api` e `packages/db`. O npm já vem instalado, e a Vercel e o GitHub Actions o suportam sem configuração. O código é TypeScript 6.0 em ESM, compatível com Node 24 LTS (`engines: >=24`), com Fastify 5 na API e Vitest nos testes. O acesso ao banco e as migrações usam Prisma 7.10.1, a última versão estável (a 8 ainda é release candidate), e o schema, as migrações e o client gerado ficam no workspace compartilhado `packages/db`. O CSV da fonte é lido com `csv-parse`, que trata campos entre aspas e o BOM presente no arquivo real.

O Postgres local é a versão 17, que o Neon suporta, e roda no Docker Compose na porta 5433, porque a 5432 já está em uso na máquina do mantenedor. O mesmo container tem dois bancos: `estatisticas` (desenvolvimento) e `estatisticas_test` (testes). No CI, o Postgres roda como serviço do workflow.

Os testes ficam na pasta `e2e/` da raiz, na costura de ponta a ponta: fonte falsa, Ingestão, Postgres de teste e `inject` do Fastify.

As variáveis de ambiente ficam num `.env` opcional na raiz, modelado pelo `.env.example`. O `prisma.config.ts` e os testes carregam esse arquivo se ele existir, sem sobrescrever variáveis já definidas.

O lint usa ESLint com as regras recomendadas do typescript-eslint que usam os tipos (`recommendedTypeChecked`), para pegar erros como uma Promise sem `await`. O hook de pre-commit, instalado pelo Lefthook via npm, roda só o gitleaks e barra o commit quando ele não está instalado. O gitleaks é instalado pelo mantenedor no sistema, como explica o README. O CI roda em cada pull request e em cada push na `main`: lint, checagem de tipos, testes (com Postgres como serviço) e o gitleaks pela action oficial, na versão padrão dela e sem comentários em PR. As permissões são só de leitura: `contents: read` no workflow, e `pull-requests: read` apenas no job do gitleaks, que lê os commits do PR. Os `checkout` não guardam o token do GitHub (`persist-credentials: false`), e as actions são fixadas pela tag de versão. O Dependabot abre PRs semanais de npm e de GitHub Actions, agrupando minor e patch por ecossistema e deixando as major em PRs separados. Ele espera 7 dias antes de propor uma versão minor ou patch recém-publicada, e 14 dias para uma major.

## Considered Options

- **pnpm** em vez de npm workspaces: exigiria instalar mais uma ferramenta.
- **Kysely, Drizzle ou SQL puro** em vez de Prisma: Kysely deixaria o SQL das agregações mais explícito, mas o mantenedor já conhece o Prisma. As agregações usam `$queryRaw`.
- **Testcontainers** em vez do Postgres do Docker Compose: mais lento, e diferente do que o CI faz.
- **Biome** em vez de ESLint, **Husky** em vez de Lefthook, e **knip** para dependências sem uso: descartados pelo mantenedor.
- **TypeScript 7**, com compilador nativo: o typescript-eslint só aceita TypeScript abaixo da 6.1. Manter a 7 só na checagem de tipos exigiria duas versões convivendo.
- **Lint e checagem de tipos também no pre-commit**: deixaria o commit lento, e o CI já cobre.
- **Actions fixadas pelo SHA do commit**: protege contra uma tag trocada por quem controla a action, mas o mantenedor preferiu a legibilidade da tag.

## Consequences

- O banco `estatisticas_test` é criado por um script de inicialização que só roda quando o volume do Docker é novo. Um volume antigo precisa ser recriado (`docker compose down -v`).
- O TypeScript fica preso abaixo da 6.1 (`~6.0.3`), e o Dependabot ignora as versões a partir dela, até o typescript-eslint aceitar versões mais novas.
- Os workspaces exportam o código-fonte TypeScript direto (`./src/index.ts`), sem passo de build. O deploy na Vercel (#12) vai precisar de um build.
