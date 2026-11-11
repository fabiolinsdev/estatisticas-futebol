# Estatísticas de Futebol

Coleta e expõe estatísticas de partidas (gols, chutes ao gol e cartões) das cinco principais ligas europeias, por partida e por time.

## Competição

**Liga** (`League`):
Campeonato nacional de pontos corridos. Escopo atual: Premier League, La Liga, Serie A, Bundesliga e Ligue 1.
_Avoid_: Campeonato, competição, torneio (copas estão fora do escopo)

**Temporada** (`Season`):
Uma edição de uma Liga, identificada pelos anos que abrange (ex.: 2025/26).
_Avoid_: Ano, edição

**Temporada atual** (`currentSeason`):
A única Temporada de cada Liga que o sistema conhece. A partir de 1º de agosto o sistema passa a esperar a próxima. A virada acontece por Liga, quando a primeira Partida da nova Temporada daquela Liga aparece, e nesse momento a anterior deixa de existir.
_Avoid_: Temporada corrente, temporada vigente

**Partida** (`Match`):
Um jogo entre dois Times, dentro de uma Temporada de uma Liga, disputado até o apito final. Partidas adiadas só contam depois de disputadas. Partidas abandonadas ou decididas fora de campo (W.O., decisão de tribunal) não contam.
_Avoid_: Jogo, fixture, confronto

**Time** (`Team`):
O clube, com identidade estável de uma Temporada para outra, independentemente do nome usado pela fonte. Em cada Partida é o **Mandante** (`home`) ou o **Visitante** (`away`).
_Avoid_: Equipe, clube, squad

**Participação** (`TeamSeason`):
O fato de um Time disputar uma Temporada de uma Liga.
_Avoid_: Inscrição, elenco

## Métricas

**Gols marcados** (`goalsFor`):
Gols a favor de um Time no placar final de uma Partida, incluindo gols contra do adversário.
_Avoid_: Gols feitos

**Gols sofridos** (`goalsAgainst`):
Gols a favor do adversário no placar final de uma Partida.
_Avoid_: Gols tomados, gols contra (que é outro conceito)

**Chute ao gol** (`shotOnTarget`):
Finalização que entraria se não fosse defendida pelo goleiro, ou seja, gols mais defesas. Chutes na trave e chutes bloqueados ficam de fora.
_Avoid_: Finalização, chute, shot

**Cartão amarelo** (`yellowCard`):
Advertência recebida por um jogador do Time, contada conforme a convenção da Liga. Na Premier League, o segundo amarelo que gera uma expulsão não conta como amarelo. Nas demais Ligas, conta (resultado: 2 amarelos e 1 vermelho).
_Avoid_: Advertência, booking

**Cartão vermelho** (`redCard`):
Uma expulsão de um jogador do Time, seja por vermelho direto ou por segundo amarelo.
_Avoid_: Expulsão, sending off
