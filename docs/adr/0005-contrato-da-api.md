# Contrato da API: rotas, parâmetros, respostas e cache

As Ligas são `premier-league` (Premier League), `la-liga` (La Liga), `serie-a` (Serie A), `bundesliga` (Bundesliga) e `ligue-1` (Ligue 1). `GET /leagues` lista as cinco nessa ordem fixa, cada uma como `{ slug, name, currentSeason }`.

O ranking de uma Liga fica em `GET /leagues/:leagueSlug/rankings`, com três parâmetros de consulta:
- `metric`, obrigatório: os termos do glossário em camelCase (`goalsFor`, `goalsAgainst`, `shotsOnTarget`, `yellowCards`, `redCards`).
- `order`, opcional: `desc` (padrão) ou `asc`.
- `venue`, opcional: `all` (padrão), `home` (só as Partidas como Mandante) ou `away` (só como Visitante). Um Time sem nenhuma Partida no mando pedido não aparece no ranking.

Cada item é `{ team: { slug, name }, matches, total, average }`, com a média por Partida arredondada em 2 casas. A ordem é pela média exata, no sentido de `order`. O desempate é igual nas duas ordens: maior total primeiro, porque significa mais Partidas e uma média mais confiável, e depois o nome do Time em ordem alfabética pela collation `"C"` (ordem dos bytes), que dá o mesmo resultado em qualquer servidor Postgres. Ligas e Times aparecem sempre pelo slug e pelo nome de exibição, nunca pelo nome cru da fonte.

O resumo de um Time fica em `GET /leagues/:leagueSlug/teams/:teamSlug` e vem como `{ team: { slug, name }, league: { slug, name }, season, all, home, away }`. Cada recorte é `{ matches, goalsFor, goalsAgainst, shotsOnTarget, yellowCards, redCards }`, e cada métrica é `{ total, average }`, com a média arredondada em 2 casas. Um recorte sem Partidas tem `matches: 0`, `total: 0` e `average: null`, porque não existe média sem Partida. O Time existe para a rota quando tem Participação na Temporada atual daquela Liga.

As Partidas de um Time ficam em `GET /leagues/:leagueSlug/teams/:teamSlug/matches`, com os mesmos 404 de Liga e de Time do resumo. `data` é a lista de todas as Partidas da Temporada atual, sem paginação (no máximo 38), em ordem cronológica crescente. Cada Partida vem na perspectiva do Time pedido: `{ date, venue, team, opponent }`, com `date` só o dia (`"2026-11-08"`), `venue` igual a `home` ou `away`, e `team` e `opponent` como `{ slug, name, goals, shotsOnTarget, yellowCards, redCards }`.

A variável de ambiente `TEAM_MATCHES_ENABLED` liga essa rota só com o valor exato `true`. Ausente ou com qualquer outro valor, a rota nem é registrada e responde o mesmo 404 de uma rota inexistente do Fastify, antes de qualquer validação, sem revelar que existe.

Toda resposta de sucesso vem no envelope `{ data, source, lastCollectedAt }`, com `source: { name: "football-data.co.uk", url: "https://www.football-data.co.uk" }` e `lastCollectedAt` como descreve a ADR-0008. As respostas de sucesso mandam `Cache-Control: public, s-maxage=600, stale-while-revalidate=86400`: a CDN guarda a resposta por 10 minutos e, por até 1 dia depois disso, entrega a cópia velha enquanto busca a nova em segundo plano. Isso mantém a API rápida mesmo com o banco do Neon dormindo.

Os erros usam o formato padrão do Fastify, `{ statusCode, error, message }`, com a `message` em português e listando os valores aceitos: 400 para `metric` ausente ou inválida e para `order` ou `venue` inválidos (`Mando inválido: "casa". Use all, home ou away.`), 404 para Time sem Participação na Temporada atual da Liga, sem listar os Times (`Time inexistente na Premier League: "wrexham".`), e 404 para Liga inexistente, listando as Ligas do banco na ordem de `GET /leagues` (por exemplo, `Liga inexistente: "mls". Use premier-league, la-liga, serie-a, bundesliga ou ligue-1.`). Antes da primeira coleta, sem nenhuma Liga no banco, a mensagem não traz a lista. Respostas de erro não levam o cabeçalho de cache.

## Considered Options

- **Métrica no caminho** (`/rankings/goals-for`): descartada em favor do parâmetro de consulta, que combina com o filtro de ordem e com o de mando (#6).
- **Valores em kebab-case** (`goals-for`) e **campos em português** (`partidas`, `media`): descartados para manter o vocabulário idêntico ao do glossário.
- **Nome cru da fonte até o #5**: descartado. O #2 já usa slugs, com um mapeamento mínimo que só contém os Times das fixtures.
- **Resumo em `GET /teams/:teamSlug`**: descartado em favor da rota dentro da Liga, que deixa explícitas a Liga e a Temporada e segue o padrão do ranking. As Partidas de um Time (#7) seguem o mesmo caminho.
- **Resumo agrupado por métrica** (`goalsFor: { all, home, away }`): descartado em favor do agrupamento por recorte.
- **Média 0 num recorte sem Partidas** e **Times sem Partidas no mando aparecendo no ranking**: descartados, porque uma média 0 seria um número falso.
- **Time de outra Liga respondendo o resumo**: descartado. O 404 vale para qualquer Time sem Participação na Temporada atual daquela Liga.
- **404 de Time listando os Times da Liga**: descartado, porque a lista seria longa e já está no ranking.
- **Lista de Partidas ligada por padrão** ou **variável obrigatória que impede a API de subir**: descartadas. Se a configuração for esquecida, a parte sensível (ADR-0003) fica fora do ar, e o resto da API continua no ar.
- **404 próprio para a rota desligada**: descartado, para não revelar que a rota existe.
- **Partida como a fonte** (`homeTeam`, `awayTeam`): descartada em favor da perspectiva do Time, que deixa o adversário e o placar diretos.
- **Lista dentro de um objeto** (`{ team, league, season, matches }`) e **paginação**: descartados. O formato segue o do ranking, e uma Temporada tem no máximo 38 Partidas por Time.
- **Data com hora** (`2026-11-08T00:00:00.000Z`): descartada, porque a fonte não informa um fuso confiável e o banco guarda só o dia.
- **`goalsFor` como métrica padrão**: descartado. Sem `metric`, a resposta é 400.
- **Desempate invertido na ordem crescente**: descartado, porque colocaria primeiro a média menos confiável.
- **Desempate por nome na collation padrão do banco**: descartado, porque a ordem dos acentos muda conforme o locale do servidor (local, CI e Neon).
- **404 sem listar as Ligas**: descartado, para seguir o mesmo padrão dos erros 400.
- **`stale-while-revalidate` de 10 minutos ou 1 hora**: descartados em favor de 1 dia, que cobre os longos períodos sem tráfego.

## Consequences

- Desligar a lista de Partidas é trocar `TEAM_MATCHES_ENABLED` na Vercel e fazer um redeploy, sem mudança de código: a variável só vale num deploy novo, e um deploy novo também limpa o cache da CDN, para que listas antigas não continuem sendo servidas pelo `stale-while-revalidate`. Isso precisa ser conferido no #12 e documentado no README. A rota usa o mesmo cache do resto da API.
- O `.env.example` traz `TEAM_MATCHES_ENABLED=true`, para a rota funcionar no ambiente local. Em produção, a variável é configurada na Vercel.

- Nenhum teste prova que a ordem usa a média exata e não a arredondada. Duas médias diferentes só ficam iguais em 2 casas com Times de mais de 10 Partidas, o que pediria uma fixture grande demais.
- Com pouco tráfego, a primeira requisição depois de um longo intervalo pode receber uma cópia de pouco mais de um dia atrás. A requisição seguinte já recebe o dado novo.
