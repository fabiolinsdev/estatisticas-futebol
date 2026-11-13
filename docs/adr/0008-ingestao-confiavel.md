# Ingestão confiável: cópia do arquivo, hashes, exclusões e `lastCollectedAt`

A tabela `source_files` guarda, por Liga e Temporada, só a última cópia do arquivo baixado: o conteúdo, o hash SHA-256 do conteúdo (`content_hash`), o hash das regras usadas para interpretá-lo (`rules_hash`) e a data de download. O hash das regras cobre o mapeamento de Times da Liga e as Partidas excluídas daquela Liga e Temporada. A coleta de uma Liga só é refeita quando o arquivo ou as regras mudam. Com os dois hashes iguais, a coleta daquela Liga não escreve nada no banco, e por isso a data de download guardada é a do dia em que aquele conteúdo foi baixado pela primeira vez.

Uma Partida com placar mas com alguma estatística vazia (`HST`, `AST`, `HY`, `AY`, `HR` ou `AR`) é ignorada até ficar completa, como a de placar vazio (ADR-0006): ela sai antes da conferência dos nomes, então um Time desconhecido numa linha incompleta não faz a coleta falhar. Uma estatística preenchida com um valor que não é inteiro não negativo, ou uma coluna ausente, continua fazendo a coleta da Liga falhar.

A lista de Partidas excluídas é um objeto TypeScript versionado em `apps/collector/src/excluded-matches.ts`. Cada entrada traz a Liga, a Temporada, o Mandante e o Visitante pelo slug, e o motivo. A Ingestão passa para a Interpretação só as entradas da Liga e da Temporada coletadas. Uma entrada com um slug que não está no mapeamento daquela Liga faz a coleta da Liga falhar (`Partida excluída com Time fora do mapeamento da Liga: "brigthon"`). Uma entrada que não bate com nenhuma linha do arquivo é aceita, porque a Partida pode ainda não ter aparecido na fonte.

Quando o arquivo é reprocessado, a mesma transação apaga todas as Partidas e Participações daquela Liga e Temporada, insere em lote o conjunto novo e grava a cópia com os hashes. Assim, um arquivo corrigido substitui os números, e uma Partida ou um Time que sumiu do arquivo some do banco. Se a coleta falhar, a cópia guardada continua a anterior, e a próxima execução tenta de novo.

A tabela `collection_state` tem uma única linha com o `lastCollectedAt`. Ele registra o início da execução, e só é gravado quando as cinco Ligas terminam sem erro, inclusive quando nenhuma mudou. Assim, todos os arquivos daquela execução foram baixados depois desse instante. Toda resposta de sucesso da API traz o campo no envelope como texto ISO 8601 em UTC (`"2026-11-13T14:56:00.000Z"`), ou `null` antes da primeira coleta bem-sucedida.

## Considered Options

- **Comparar só o hash do arquivo**, com ou sem uma opção manual de forçar o reprocessamento: descartado, porque uma Partida nova na lista de exclusões ou um Time novo no mapeamento só teria efeito quando a fonte mudasse o arquivo.
- **Atualizar a data de download mesmo com o hash igual**: descartado, para que um arquivo sem mudança não escreva nada no banco.
- **Conferir o nome dos Times também nas linhas com estatística vazia**: descartado, para seguir a regra do placar vazio.
- **Times da lista de exclusões pelo nome cru da fonte** e **lista num arquivo JSON ou CSV**: descartados. O slug é a identidade estável do Time, e o objeto TypeScript segue o padrão de `teams.ts` (ADR-0007).
- **Ignorar sempre uma exclusão sem linha correspondente** ou **falhar sempre**: descartados. O primeiro esconde um slug digitado errado, e o segundo impede excluir uma Partida antes de ela aparecer no arquivo.
- **Upsert de cada Partida e remoção só das que sumiram**: descartado em favor de apagar e inserir em lote, com menos idas ao banco. O id interno das Partidas muda a cada reprocessamento, mas não aparece na API.
- **`lastCollectedAt` no fim da execução**: descartado, porque daria a entender que o primeiro arquivo baixado é mais recente do que é.
- **Omitir o campo antes da primeira coleta**: descartado, para que o envelope tenha sempre o mesmo formato.
- **Cadastro da Liga no hash das regras**: descartado. Mudar o nome ou a posição de uma Liga é raro.

## Consequences

- Corrigir o mapeamento ou a lista de exclusões só vale na próxima execução do coletor, mas não espera a fonte mudar o arquivo.
- O cadastro da Liga (nome, código de divisão e posição) fica fora do hash das regras. Uma mudança nele só chega ao banco quando o arquivo da fonte ou as regras daquela Liga mudarem.
- A cópia de um arquivo que falhou na interpretação não é guardada. Para investigar, é preciso baixá-lo de novo.
- Toda resposta de sucesso da API faz uma consulta a mais, para ler o `lastCollectedAt`. O cache da CDN absorve a maior parte delas.
- O `lastCollectedAt` aparece na API até 10 minutos depois da coleta, pelo mesmo cache das outras respostas (ADR-0005).
