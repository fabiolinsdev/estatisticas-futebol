# API em produção na Vercel

A API é um projeto da Vercel ligado ao repositório pela integração Git, com o Root Directory em `apps/api`: produção a cada push na `main` e um preview a cada pull request. A Vercel detecta o Fastify pelo primeiro arquivo que encontra entre `src/app.ts`, `src/index.ts` e `src/server.ts`, e esse arquivo precisa chamar `listen()`. Por isso o `src/index.ts` é o servidor: lê o `DATABASE_URL`, monta a aplicação e escuta a porta do `PORT` (3000 sem ela). A montagem da aplicação (`buildApp`) mudou de `src/app.ts` para `src/api.ts`, que é o que o pacote `@estatisticas/api` exporta para os testes. A função roda em `gru1` (São Paulo), a mesma região do banco (ADR-0011), fixada no `apps/api/vercel.json`.

A API recebe duas variáveis de ambiente, iguais em produção e nos previews: o `DATABASE_URL` com o usuário `api_leitura` e o endereço com pooling do Neon (o host com `-pooler`), e o `TEAM_MATCHES_ENABLED` (ADR-0005). Os previews leem os dados reais de produção, sem como escrever neles.

O firewall da Vercel tem a única regra de limite do plano Hobby: 60 requisições por minuto por IP, em janela fixa, respondendo 429 (Too Many Requests). A Vercel conta o limite por região.

Para rodar a API localmente, `npm run api` sobe o servidor com o `.env`.

## Considered Options

- **Manter `src/app.ts` com a montagem e criar um `src/server.ts`**: descartado, porque a Vercel escolheria o `src/app.ts`, que não chama `listen()`.
- **Previews sem banco**: descartado. O preview serve para conferir a API antes do merge.
- **Banco separado para os previews**: descartado, porque exigiria a integração do Marketplace (ADR-0011).

## Consequences

- O limite de 60 requisições por minuto vale por região da Vercel, então um cliente distribuído entre regiões pode passar dele.
- A regra do firewall e as variáveis de ambiente ficam só no painel da Vercel, documentadas no README. Elas não são versionadas.
- Desligar a lista de Partidas exige trocar o `TEAM_MATCHES_ENABLED` e fazer um redeploy (ADR-0005).
