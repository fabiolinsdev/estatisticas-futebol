# Mapeamento de Times, Participação e falha por Liga

O mapeamento dos nomes da fonte para Times é um objeto TypeScript versionado em `apps/collector/src/teams.ts`, separado por Liga: um nome da fonte só vale na Liga onde foi cadastrado. Ele cobre os 96 Times da Temporada 2026/27, conferidos contra os arquivos reais da fonte. O nome de exibição é o nome curto usado no país do Time, com acentos (`Bayern München`, `Alavés`, `Atlético de Madrid`), e o slug é esse nome sem acentos, em minúsculas e com hífens (`bayern-munchen`). Nomes abreviados pela fonte viram o nome completo da cidade ou do clube (`Man City` vira `Manchester City`, `Paris SG` vira `Paris Saint-Germain`).

A Participação (`team_seasons`) é registrada na mesma transação das Partidas da Liga, para cada Time que aparece numa Partida com placar. Nesta etapa a coleta só acrescenta Participações. A remoção de quem sumiu do arquivo vem no #8, junto com a das Partidas.

A interpretação recebe o mapa de Times da Liga como parâmetro, junto com o texto do CSV e a Liga, como descreve a spec, e não importa o mapeamento por conta própria. Ela confere os nomes de todas as linhas com placar antes de gravar e, se houver nomes desconhecidos, a coleta da Liga falha listando todos eles de uma vez (`Times desconhecidos na fonte: "Man Utd", "Wrexham"`). Linhas sem placar continuam ignoradas antes da conferência dos nomes.

Qualquer erro de uma Liga (download, divisão errada, nome desconhecido, valor inválido) faz falhar só a coleta daquela Liga, sem gravar nada dela. As outras Ligas são coletadas normalmente. No fim, se alguma Liga falhou, a `ingest` lança um único erro que lista cada Liga e o motivo:

```text
A coleta falhou em 1 de 5 Ligas:
- premier-league: Times desconhecidos na fonte: "Man Utd", "Wrexham"
```

O executável do coletor (#10) transforma esse erro no código de saída de erro.

## Considered Options

- **Completar o mapeamento só no #10**: descartado. Os arquivos reais já existem, e mapear agora tira o risco do #10.
- **Nome de exibição em inglês** (`Bayern Munich`): descartado em favor do nome usado no país.
- **Mapeamento num arquivo de dados** (CSV ou JSON): descartado, porque o objeto TypeScript tem os tipos checados pelo compilador.
- **Um mapa único para todas as Ligas**: descartado, porque um Time no arquivo da Liga errada passaria sem erro.
- **Só o nome desconhecido isolar a Liga**: descartado. A spec manda que falha em uma Liga não impeça as outras, seja qual for o erro.
- **`ingest` devolver um resultado em vez de lançar erro**: descartado, porque um erro lançado não pode ser esquecido por quem chama.
- **Mostrar só o primeiro nome desconhecido**: descartado, porque obrigaria uma coleta por nome para completar o mapeamento.
- **Conferir o nome também em linhas sem placar**: descartado, para que uma Partida ainda incompleta não derrube a Liga.
- **Chaves de Liga do mapeamento tipadas pelos slugs do cadastro**: descartado por ora. Um slug errado no mapeamento não dá erro de compilação, mas faz a coleta daquela Liga falhar listando os nomes.
- **Rota de API para a Participação**: descartada. O teste e2e consulta a tabela `team_seasons` direto, como exceção à costura da API.

## Consequences

- A cada promoção ou rebaixamento, os Times novos precisam entrar no mapeamento. Até lá, a coleta daquela Liga falha e o erro diz quais nomes faltam.
- Um mesmo Time pode aparecer no mapeamento de mais de uma Liga, sempre com o mesmo slug.
