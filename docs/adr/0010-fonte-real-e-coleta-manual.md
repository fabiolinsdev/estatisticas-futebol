# Fonte real e coleta manual

A Fonte real (`footballDataSource`) baixa `https://www.football-data.co.uk/mmz4281/<código>/<divisão>.csv`, com o código de quatro dígitos da Temporada (`2026/27` vira `2627`). Ela segue os redirecionamentos (hoje o `www` redireciona para o domínio sem `www`) e se identifica com o User-Agent `estatisticas-futebol/1.0 (+https://github.com/fabiolinsdev/estatisticas-futebol)`, só com o link do repositório e sem e-mail pessoal no código.

Só o HTTP 404 significa que o arquivo ainda não existe, e a Fonte devolve `null` (ADR-0009). Os 5 arquivos da Temporada atual são UTF-8 com BOM e respondem 200 com `text/csv`. Um 200 que não seja CSV cai na Interpretação, que falha por não achar a coluna `Div`.

As falhas transitórias (conexão que cai, tempo esgotado, 5xx e 429) ganham até 3 tentativas no total, com espera de 5 segundos antes da segunda e de 15 antes da terceira. O cabeçalho `Retry-After` é ignorado. Os outros 4xx falham na hora. Cada requisição tem um tempo limite de 30 segundos. Quando as tentativas acabam, a Liga falha com a URL, o número de tentativas e o último status (`Falha ao baixar https://www.football-data.co.uk/mmz4281/2627/E0.csv depois de 3 tentativas: HTTP 503`), e a próxima execução tenta de novo.

`npm run collect` roda o coletor na máquina de desenvolvimento, com o Node direto no TypeScript, contra o banco do `DATABASE_URL` (do `.env`, se existir). Ele não aplica migrações: elas continuam no `npm run db:migrate`, e o workflow do #11 roda as duas etapas. O comando imprime uma linha por Liga, com a Temporada e o número de Partidas gravadas (e a Temporada anterior, numa virada), `sem mudança` ou `falhou`. No fim, imprime `Coleta concluída sem erros.` ou o erro da `ingest` com o motivo de cada Liga, e termina com código 1. Para isso, a `ingest` aceita um `onLeague` que recebe o resultado de cada Liga.

A Fonte real é testada contra um servidor HTTP local, criado no próprio teste, que responde 200, 404, redirecionamento, 403, 429, 500 e 503, ou não responde. A URL base, o tempo limite e a espera entre tentativas são parâmetros da Fonte, para que o teste não dependa da internet nem espere 20 segundos.

## Considered Options

- **E-mail de contato no User-Agent**: descartado, para não pôr um dado pessoal no código.
- **Sem novas tentativas**: descartado pelo mantenedor em favor de 3 tentativas, para uma instabilidade curta da fonte não custar 3 horas de atraso.
- **Nova tentativa em qualquer falha**: descartada. Um 403 ou 410 não muda em 20 segundos.
- **Esperas de 1 e 2 segundos** ou **de 30 e 60 segundos**: descartadas em favor de 5 e 15. No pior caso, cerca de 2 minutos por Liga.
- **Respeitar o `Retry-After`**: descartado. A fonte já mandou 360 segundos, e a próxima execução tenta de novo em 3 horas.
- **Tratar como inexistente também um 200 com HTML**: descartado. A Interpretação já falha com um erro explícito.
- **Imprimir só o resultado final**: descartado em favor de uma linha por Liga.
- **Aplicar as migrações no comando de coleta**: descartado, para manter separadas a mudança de schema e a coleta.
- **Testar a Fonte real só pela coleta manual**: descartado, porque o redirecionamento, o 404 e as novas tentativas ficariam sem teste automatizado.

## Consequences

- Na primeira coleta real, em 16/11/2026, o banco vazio começou direto na 2026/27 e gravou 500 Partidas das 5 Ligas em cerca de 5 segundos. A segunda execução não gravou nada.
- Sem `.env`, o Node avisa `.env not found. Continuing without it.` e usa as variáveis do ambiente.
- Uma mudança no endereço ou no formato da fonte só aparece numa execução real, já que os testes usam fixtures e um servidor local.
