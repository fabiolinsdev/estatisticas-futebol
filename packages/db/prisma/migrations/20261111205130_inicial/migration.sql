-- CreateTable
CREATE TABLE "leagues" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "division_code" TEXT NOT NULL,
    "current_season" TEXT NOT NULL,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "teams" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" SERIAL NOT NULL,
    "league_slug" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "home_team_slug" TEXT NOT NULL,
    "away_team_slug" TEXT NOT NULL,
    "home_goals" INTEGER NOT NULL,
    "away_goals" INTEGER NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leagues_division_code_key" ON "leagues"("division_code");

-- CreateIndex
CREATE UNIQUE INDEX "matches_league_slug_season_home_team_slug_away_team_slug_key" ON "matches"("league_slug", "season", "home_team_slug", "away_team_slug");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_league_slug_fkey" FOREIGN KEY ("league_slug") REFERENCES "leagues"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_slug_fkey" FOREIGN KEY ("home_team_slug") REFERENCES "teams"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_slug_fkey" FOREIGN KEY ("away_team_slug") REFERENCES "teams"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
