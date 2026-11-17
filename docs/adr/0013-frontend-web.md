# Frontend web em React, num projeto próprio da Vercel

O frontend é um app React com Vite e TypeScript em `apps/web`, publicado como um segundo projeto da Vercel, separado do projeto da API, com o Root Directory em `apps/web`. É uma página única (SPA) servida como arquivos estáticos: não há servidor próprio nem acesso ao banco, e todos os números vêm da API pública.

O navegador nunca chama o domínio da API. O `apps/web/vercel.json` repassa `/api/*` do próprio domínio do frontend para a API de produção, e o frontend só faz requisições para `/api/...`. Assim a API não precisa liberar CORS e continua igual. Em desenvolvimento, o servidor do Vite faz o mesmo repasse: para a API de produção por padrão, fixada no `apps/web/vite.config.ts`, ou para a do `API_URL` (por exemplo, a API local). O mesmo arquivo manda qualquer outro caminho para o `index.html`, para que um link compartilhado abra direto na página certa.

A primeira versão tem duas telas:
- **Ranking de uma Liga**: abas das cinco Ligas, abas das cinco métricas, filtro de Mando (todas, Mandante, Visitante) e de ordem (maior ou menor média primeiro). A tabela mostra posição, Time, Partidas, total e média, e um painel mostra o líder e a média da Liga. A média da Liga é a soma dos totais dividida pela soma das Partidas dos Times do ranking, no recorte de Mando escolhido, para que um Time com menos Partidas não pese tanto quanto os outros. Um ranking sem nenhum Time (antes da primeira coleta ou num Mando ainda sem Partidas) mostra um aviso no lugar da tabela.
- **Página do Time**: aberta ao clicar no nome do Time. Mostra o resumo (todas as Partidas, como Mandante e como Visitante) e a lista de Partidas. Se a rota de Partidas estiver desligada na API (ADR-0005), essa seção não aparece e o resto da página funciona.

Os filtros ficam no endereço, com o React Router, para que o link possa ser compartilhado: `/serie-a?metrica=yellowCards&mando=home&ordem=asc` e `/serie-a/times/fiorentina`. Os valores dos parâmetros são os da API, e um valor ausente ou desconhecido vale o padrão (`goalsFor`, `all`, `desc`). A raiz `/` abre a Premier League. Toda tela mostra quando foi a última coleta (o `lastCollectedAt` da API). A fonte não aparece na tela, por decisão do mantenedor. A API continua citando a fonte em toda resposta (ADR-0003 e ADR-0005).

Quando a API responde um erro, a tela mostra a `message` dela, que já vem em português (ADR-0005), com as abas das Ligas por cima. Sem `message` (por exemplo, um 502 da Vercel), a tela diz qual status a API respondeu e pede para tentar de novo. Se a API nem responde, a tela diz que não conseguiu falar com ela. Um endereço que não corresponde a nenhuma tela mostra "Página não encontrada", sem chamar a API. O erro de um Time inexistente traz o link de volta para o ranking da Liga.

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
- **Citar a fonte no rodapé do site**: descartado por decisão do mantenedor. A citação fica na API.
- **Média da Liga como média simples das médias dos Times**: descartada, porque daria o mesmo peso a um Time com menos Partidas. **Sem média da Liga no painel**: descartado.

## Consequences

- O projeto do frontend é criado na Vercel pela CLI. Ele não tem variáveis de ambiente, porque o endereço da API fica no `vercel.json`. Se o domínio da API mudar, ele muda no `vercel.json` e no `vite.config.ts`.
- As requisições passam pelo repasse da Vercel antes de chegar na API. Se o firewall da API passar a ver o IP do repasse em vez do IP do visitante, todos os visitantes do frontend dividiriam o limite de 60 requisições por minuto (ADR-0012). Isso precisa ser conferido depois do deploy.
- O frontend depende do contrato da ADR-0005. Uma mudança no contrato pede uma mudança no frontend.
