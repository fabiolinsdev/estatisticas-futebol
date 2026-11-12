-- O coletor regrava a posição de cada Liga a cada coleta; o 0 só cobre as Ligas já existentes.
ALTER TABLE "leagues" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "leagues" ALTER COLUMN "position" DROP DEFAULT;

-- Partidas antigas não têm Chutes ao gol nem Cartões; a próxima coleta regrava todas a partir da fonte.
DELETE FROM "matches";

ALTER TABLE "matches" ADD COLUMN "home_shots_on_target" INTEGER NOT NULL,
ADD COLUMN "away_shots_on_target" INTEGER NOT NULL,
ADD COLUMN "home_yellow_cards" INTEGER NOT NULL,
ADD COLUMN "away_yellow_cards" INTEGER NOT NULL,
ADD COLUMN "home_red_cards" INTEGER NOT NULL,
ADD COLUMN "away_red_cards" INTEGER NOT NULL;
