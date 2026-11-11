# Fonte única: CSVs do football-data.co.uk

Os dados de todas as Partidas vêm exclusivamente dos CSVs públicos do football-data.co.uk (um arquivo por Liga e Temporada). Era a única fonte gratuita, acessível sem burlar proteções e com placar, chutes ao gol e cartões das cinco Ligas na Temporada atual. De quebra, a contagem de amarelos já segue a convenção que adotamos: na Premier League o segundo amarelo não conta, nas demais Ligas conta.

## Considered Options

- **API-Football (plano gratuito)**: só libera temporadas passadas. A atual custa a partir de US$ 19/mês.
- **football-data.org (plano gratuito)**: não inclui cartões nem chutes.
- **Scraping do Understat**: o site estava fora do ar para manutenção, sem previsão de volta. Também não tem API oficial e já mudou de estrutura antes.
- **Scraping do FBref**: bloqueia robôs com um desafio do Cloudflare (HTTP 403). Coletar exigiria burlar essa proteção, contra os termos da Sports Reference.

## Consequences

- O projeto não faz scraping. O aprendizado de ingestão vem de detectar mudanças nos arquivos, gravar de forma idempotente, mapear os nomes de Times e validar os dados.
- Uma Partida só aparece quando a fonte publica, o que pode levar de horas a alguns dias depois do jogo.
- O CSV não informa o status da Partida, então Partidas abandonadas ou decididas fora de campo são excluídas por uma lista mantida à mão.
- **Direitos sobre os dados**: fatos como placar e cartões não têm proteção autoral, mas no Reino Unido a coletânea pode ter o direito sui generis de base de dados (*Football DataCo v Sportradar*, 2013), e o site não publica termos de redistribuição. Decidimos publicar a API sem pedir permissão, citando a fonte. A lista de Partidas jogo a jogo fica atrás de uma configuração que liga e desliga essa parte: se o autor ou uma liga reclamar, ela sai do ar e ficam públicos só as médias e os rankings, que são números calculados por nós.
- Se a fonte parar de atualizar ou mudar de formato, o coletor falha. O e-mail de falha do GitHub e o `lastCollectedAt` da API tornam isso visível. Uma segunda fonte para comparar os números (por exemplo, o Understat, quando voltar) é a evolução natural.
