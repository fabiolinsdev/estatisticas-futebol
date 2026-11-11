# Coletor no GitHub Actions, API somente leitura na Vercel

A API (Fastify) é publicada na Vercel, que só executa funções serverless. No plano Hobby, o cron da Vercel roda no máximo uma vez por dia, mas o coletor precisa rodar a cada 3 horas. Por isso o coletor roda como um workflow agendado do GitHub Actions e grava direto no Postgres (Neon). A Vercel hospeda apenas a API de leitura. Assim não existe nenhum endpoint de escrita exposto na internet: a credencial de escrita no banco fica só nos Secrets do GitHub, e a Vercel recebe apenas uma credencial somente leitura.

## Considered Options

- **Cron da Vercel no plano Hobby**: só permite rodar 1 vez por dia.
- **Plano Pro da Vercel** (US$ 20/mês): permitiria cron a cada 3 horas, mas tem custo e manteria um endpoint de escrita público.
- **VPS com Docker Compose**: descartada em favor da Vercel.

## Consequences

- O GitHub desativa workflows agendados de repositórios públicos depois de 60 dias sem atividade. Os merges dos PRs do Dependabot mantêm o repositório ativo, e a API expõe `lastCollectedAt` para deixar visível quando a coleta para.
- O limite de requisições fica no WAF da Vercel (o plano Hobby permite 1 regra), e não na aplicação, porque um contador em memória não funciona com várias instâncias serverless.
