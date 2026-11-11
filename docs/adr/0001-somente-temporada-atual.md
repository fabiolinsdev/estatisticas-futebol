# Somente a Temporada atual, sem histórico

O sistema guarda apenas a Temporada atual de cada Liga. Não há carga retroativa de temporadas passadas, e a temporada anterior é apagada na virada. A partir de 1º de agosto o coletor passa a procurar a nova Temporada, e a virada acontece por Liga, no momento em que a primeira Partida da nova Temporada daquela Liga aparece na fonte. O objetivo é não manter dados sem uso. Abrimos mão de comparar temporadas e de ter backup: o banco pode ser reconstruído a qualquer momento recoletando a fonte.

## Consequences

- Logo depois de cada virada, as médias de uma Liga se baseiam em uma ou duas Partidas por Time. A API mostra o número de Partidas ao lado de cada média.
- A perda é irreversível: se um dia quisermos comparar temporadas, só vai existir histórico dali em diante.
