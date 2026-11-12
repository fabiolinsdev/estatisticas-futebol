-- CreateTable
CREATE TABLE "team_seasons" (
    "league_slug" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "team_slug" TEXT NOT NULL,

    CONSTRAINT "team_seasons_pkey" PRIMARY KEY ("league_slug","season","team_slug")
);

-- AddForeignKey
ALTER TABLE "team_seasons" ADD CONSTRAINT "team_seasons_league_slug_fkey" FOREIGN KEY ("league_slug") REFERENCES "leagues"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_seasons" ADD CONSTRAINT "team_seasons_team_slug_fkey" FOREIGN KEY ("team_slug") REFERENCES "teams"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
