# Frontend web em React, num projeto próprio da Vercel

O frontend é um app React com Vite e TypeScript em `apps/web`, publicado como um segundo projeto da Vercel, separado do projeto da API, com o Root Directory em `apps/web`. É uma página única (SPA) servida como arquivos estáticos: não há servidor próprio nem acesso ao banco, e todos os números vêm da API pública.

O navegador nunca chama o domínio da API. O `apps/web/vercel.json` repassa `/api/*` do próprio domínio do frontend para a API de produção, e o frontend só faz requisições para `/api/...`. Assim a API não precisa liberar CORS e continua igual. Em desenvolvimento, o servidor do Vite faz o mesmo repasse, para a API local ou para a de produção (`API_URL`). O mesmo arquivo manda qualquer outro caminho para o `index.html`, para que um link compartilhado abra direto na página certa.

A primeira versão tem duas telas:
- **Ranking de uma Liga**: abas das cinco Ligas, abas das cinco métricas, filtro de Mando (todas, Mandante, Visitante) e de ordem (maior ou menor média primeiro). A tabela mostra posição, Time, Partidas, total e média, e um painel mostra o líder e a média da Liga.
- **Página do Time**: aberta ao clicar no nome do Time. Mostra o resumo (todas as Partidas, como Mandante e como Visitante) e a lista de Partidas. Se a rota de Partidas estiver desligada na API (ADR-0005), essa seção não aparece e o resto da página funciona.

Os filtros ficam no endereço, com o React Router, para que o link possa ser compartilhado: `/serie-a?metrica=yellowCards&mando=home&ordem=asc` e `/serie-a/times/fiorentina`. Os valores dos parâmetros são os da API, e um valor ausente ou desconhecido vale o padrão (`goalsFor`, `all`, `desc`). A raiz `/` abre a Premier League. Toda tela mostra a fonte e o `lastCollectedAt` que a API devolve.

A interface é em português e usa os termos do `GLOSSARY.md` (Chutes ao gol, Mandante, Visitante). O visual segue o protótipo aprovado: tema escuro, abas de Liga em verde e de métrica em azul, barras proporcionais à média.

Os testes usam Vitest com Testing Library e jsdom, e simulam a API com o MSW. Eles rodam como um projeto separado do Vitest, sem o Postgres dos testes de ponta a ponta. Como na API, testam o que o usuário vê e faz, não detalhes internos.

## Considered Options

- **HTML e TypeScript sem framework** e **Next.js**: descartados em favor do React com Vite, que é o padrão de mercado e não precisa de servidor.
- **Chamar a API direto, liberando CORS na API**: descartado, porque mudaria a API e espalharia o domínio dela pelo frontend.
- **Servir o frontend pelo mesmo projeto da API**: descartado, porque misturaria o build estático com a função do Fastify.
- **Estado só na tela, sem os filtros no endereço**: descartado, porque o link não poderia ser compartilhado.
- **Parâmetros do endereço em inglês** (`metric`, `venue`, `order`): descartados em favor de `metrica`, `mando` e `ordem`.
- **Esconder a lista de Partidas na primeira versão**: descartado. Ela aparece quando a API a oferece.
- **Testes num navegador real com Playwright**: descartados nesta versão.

## Consequences

- O projeto do frontend é criado na Vercel pela CLI. Ele não tem variáveis de ambiente, porque o endereço da API fica no `vercel.json`.
- As requisições passam pelo repasse da Vercel antes de chegar na API. Se o firewall da API passar a ver o IP do repasse em vez do IP do visitante, todos os visitantes do frontend dividiriam o limite de 60 requisições por minuto (ADR-0012). Isso precisa ser conferido depois do deploy.
- O frontend depende do contrato da ADR-0005. Uma mudança no contrato pede uma mudança no frontend.
