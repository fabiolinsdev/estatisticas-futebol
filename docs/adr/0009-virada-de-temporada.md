# Virada de Temporada por Liga

A Ingestão não recebe mais a Temporada. Para cada Liga, a Temporada atual é a `currentSeason` do banco. Na primeira coleta, sem a Liga no banco, ela vem do relógio: é a Temporada que termina no ano corrente, em UTC (em março de 2027, a 2026/27; em novembro de 2026, a 2025/26). O relógio é o mesmo `now` injetável do #8, lido uma vez no início da execução.

A partir de 1º de agosto, às 0h em UTC, do ano em que a Temporada atual termina, o coletor procura primeiro o arquivo da próxima Temporada daquela Liga (a 2027/28 a partir de 1º/08/2027). A Fonte devolve `null` quando o arquivo não existe. Para a próxima Temporada, isso significa que a fonte ainda não a publicou, e a coleta segue com a Temporada atual. Para a Temporada atual, é erro da Liga (`Arquivo da Temporada 2026/27 não encontrado na fonte`).

A virada acontece quando o arquivo da próxima Temporada tem pelo menos uma Partida completa, isto é, uma Partida que a Interpretação aceita: com placar e todas as estatísticas, e fora da lista de exclusões. Nesse caso, numa única transação, o coletor grava as Partidas, as Participações e a cópia do arquivo da nova Temporada, apaga as Partidas, as Participações e a cópia da Temporada anterior daquela Liga e promove a nova a Temporada atual. O arquivo da Temporada anterior nem é baixado. As outras Ligas continuam na sua Temporada até a própria virada. Como a anterior só some quando a nova já tem Partidas, nenhuma Liga fica vazia.

Um arquivo da próxima Temporada sem nenhuma Partida completa não grava nada, nem a cópia: `source_files` guarda só arquivos da Temporada atual, e o arquivo da próxima é interpretado de novo a cada execução. Se o arquivo da próxima Temporada falhar na interpretação (por exemplo, um Time promovido que falta no mapeamento), a coleta da Liga inteira falha sem gravar nada, e a API continua servindo a Temporada atual como estava até a correção.

Na primeira coleta depois de 1º de agosto, a regra é a mesma: a Liga começa na Temporada que termina no ano corrente, e a próxima já é procurada na mesma execução. Se ela tiver Partidas, a Liga começa direto nela, sem gravar a anterior.

## Considered Options

- **Parâmetro de Temporada inicial**, usado só quando a Liga não está no banco: descartado. O relógio dá a mesma resposta e o executável do coletor (#10) não precisa de configuração.
- **Fonte lançando um erro de tipo próprio para arquivo inexistente**: descartado em favor de `null`, que obriga quem chama a tratar o caso.
- **1º de agosto no horário de Brasília ou de Londres**: descartado em favor de UTC, o fuso do agendamento no GitHub Actions.
- **Atualizar a Temporada atual mesmo quando a próxima falha**: descartado, para manter a regra de que uma Liga com erro não grava nada (ADR-0007).
- **Guardar a cópia da próxima Temporada antes da virada**: descartado, porque `source_files` passaria a ter duas Temporadas por Liga, e um hash igual poderia pular a virada.

## Consequences

- No começo de agosto, cada execução baixa dois arquivos por Liga até a virada.
- Cada Time promovido precisa entrar no mapeamento antes da primeira Partida da nova Temporada. Até lá, a coleta daquela Liga falha e o erro lista os nomes (ADR-0007).
- Uma Partida da próxima Temporada com placar mas sem todas as estatísticas ainda não provoca a virada.
- Hoje a Ingestão apaga as Partidas e as Participações da Liga inteira, de qualquer Temporada, ao gravar. Isso depende de só existir a Temporada atual (ADR-0001).
