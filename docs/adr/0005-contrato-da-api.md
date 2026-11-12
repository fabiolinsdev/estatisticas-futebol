# Contrato da API: rotas, parâmetros, respostas e cache

As Ligas são `premier-league` (Premier League), `la-liga` (La Liga), `serie-a` (Serie A), `bundesliga` (Bundesliga) e `ligue-1` (Ligue 1). `GET /leagues` lista as cinco nessa ordem fixa, cada uma como `{ slug, name, currentSeason }`.

O ranking de uma Liga fica em `GET /leagues/:leagueSlug/rankings`, com dois parâmetros de consulta:
- `metric`, obrigatório: os termos do glossário em camelCase (`goalsFor`, `goalsAgainst`, `shotsOnTarget`, `yellowCards`, `redCards`).
- `order`, opcional: `desc` (padrão) ou `asc`.

Cada item é `{ team: { slug, name }, matches, total, average }`, com a média por Partida arredondada em 2 casas. A ordem é pela média exata, no sentido de `order`. O desempate é igual nas duas ordens: maior total primeiro, porque significa mais Partidas e uma média mais confiável, e depois o nome do Time em ordem alfabética pela collation `"C"` (ordem dos bytes), que dá o mesmo resultado em qualquer servidor Postgres. Ligas e Times aparecem sempre pelo slug e pelo nome de exibição, nunca pelo nome cru da fonte.

Toda resposta de sucesso vem no envelope `{ data, source }`, com `source: { name: "football-data.co.uk", url: "https://www.football-data.co.uk" }`. O #8 acrescenta o `lastCollectedAt`. As respostas de sucesso mandam `Cache-Control: public, s-maxage=600, stale-while-revalidate=86400`: a CDN guarda a resposta por 10 minutos e, por até 1 dia depois disso, entrega a cópia velha enquanto busca a nova em segundo plano. Isso mantém a API rápida mesmo com o banco do Neon dormindo.

Os erros usam o formato padrão do Fastify, `{ statusCode, error, message }`, com a `message` em português e listando os valores aceitos: 400 para `metric` ausente ou inválida e para `order` inválida, e 404 para Liga inexistente, listando as Ligas do banco na ordem de `GET /leagues` (por exemplo, `Liga inexistente: "mls". Use premier-league, la-liga, serie-a, bundesliga ou ligue-1.`). Antes da primeira coleta, sem nenhuma Liga no banco, a mensagem não traz a lista. Respostas de erro não levam o cabeçalho de cache.

## Considered Options

- **Métrica no caminho** (`/rankings/goals-for`): descartada em favor do parâmetro de consulta, que combina com o filtro de ordem e com o de mando (#6).
- **Valores em kebab-case** (`goals-for`) e **campos em português** (`partidas`, `media`): descartados para manter o vocabulário idêntico ao do glossário.
- **Nome cru da fonte até o #5**: descartado. O #2 já usa slugs, com um mapeamento mínimo que só contém os Times das fixtures.
- **`goalsFor` como métrica padrão**: descartado. Sem `metric`, a resposta é 400.
- **Desempate invertido na ordem crescente**: descartado, porque colocaria primeiro a média menos confiável.
- **Desempate por nome na collation padrão do banco**: descartado, porque a ordem dos acentos muda conforme o locale do servidor (local, CI e Neon).
- **404 sem listar as Ligas**: descartado, para seguir o mesmo padrão dos erros 400.
- **`stale-while-revalidate` de 10 minutos ou 1 hora**: descartados em favor de 1 dia, que cobre os longos períodos sem tráfego.

## Consequences

- Nenhum teste prova que a ordem usa a média exata e não a arredondada. Duas médias diferentes só ficam iguais em 2 casas com Times de mais de 10 Partidas, o que pediria uma fixture grande demais.
- Com pouco tráfego, a primeira requisição depois de um longo intervalo pode receber uma cópia de pouco mais de um dia atrás. A requisição seguinte já recebe o dado novo.
