# Leitura da fonte: Temporada, cadastro de Ligas e placar

A Temporada é guardada como texto no formato dos anos que ela abrange (`"2026/27"`). O código de quatro dígitos do arquivo da fonte (`2627`) é só um detalhe do download. As Ligas vêm de um cadastro no código do coletor (slug, nome e código de divisão da fonte) e são criadas ou atualizadas no banco a cada coleta.

Um placar vazio (`FTHG` ou `FTAG` sem valor) significa que a fonte ainda não completou a Partida: o coletor ignora só aquela linha e grava as outras, antes mesmo de conferir o nome dos Times. Um placar que não é um inteiro não negativo significa um arquivo corrompido: a coleta da Liga falha com erro explícito e nada é gravado. Em nenhum caso um valor da fonte vira número por conversão silenciosa, porque o erro mais perigoso do sistema é um número errado sem erro aparente.

## Considered Options

- **Temporada como o código da fonte** (`"2627"`) e **Ligas criadas por um seed na migração**: descartados. O cadastro no código mantém Liga e código de divisão no mesmo lugar que o coletor usa.
- **Placar vazio fazendo a coleta falhar**: descartado, porque a fonte publica Partidas ainda incompletas, e a spec manda ignorá-las até ficarem completas.
- **Placar inválido sendo ignorado**: descartado, porque esconderia um arquivo corrompido.

## Consequences

- Um Time desconhecido numa linha sem placar não faz a coleta falhar. O tratamento de nomes desconhecidos é decidido no #5.
- Hoje a coleta grava a Temporada atual da Liga só quando a Liga é criada. A virada de Temporada é decidida no #9.
