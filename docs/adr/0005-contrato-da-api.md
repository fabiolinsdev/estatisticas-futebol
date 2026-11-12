# Contrato da API: rotas, parâmetros e identificadores

O ranking de uma Liga fica em `GET /leagues/:leagueSlug/rankings`, com a métrica como parâmetro de consulta (`?metric=goalsFor`). Os valores da métrica são os termos do glossário em camelCase: `goalsFor`, `goalsAgainst`, `shotsOnTarget`, `yellowCards` e `redCards`. Ligas e Times aparecem sempre pelo slug e pelo nome de exibição (`{ slug, name }`), nunca pelo nome cru da fonte. O desempate do ranking é pelo total e depois pelo nome do Time, como define a spec (#1).

A resposta cresce por ticket. No #2, cada item traz só `{ team: { slug, name }, total }` dentro de `data`. O #4 acrescenta o número de Partidas, a média por Partida e o envelope com `source`. O #8 acrescenta o `lastCollectedAt`.

## Considered Options

- **Métrica no caminho** (`/rankings/goals-for`): descartada em favor do parâmetro de consulta, que combina com os outros filtros (mando e ordem).
- **Valores em kebab-case** (`goals-for`): descartados para manter o vocabulário idêntico ao do glossário.
- **Nome cru da fonte até o #5**: descartado. O #2 já usa slugs, com um mapeamento mínimo que só contém os Times das fixtures.

## Consequences

- Hoje, uma métrica ausente ou inválida já responde 400 pela validação de schema do Fastify, e uma Liga inexistente responde 200 com a lista vazia. O formato do erro e o 404 são decididos no #4.
