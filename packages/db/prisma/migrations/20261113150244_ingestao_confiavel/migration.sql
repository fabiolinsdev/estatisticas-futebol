-- CreateTable
CREATE TABLE "source_files" (
    "league_slug" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "rules_hash" TEXT NOT NULL,
    "downloaded_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_files_pkey" PRIMARY KEY ("league_slug","season")
);

-- CreateTable
CREATE TABLE "collection_state" (
    "id" INTEGER NOT NULL,
    "last_collected_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_state_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "collection_state_single_row" CHECK ("id" = 1)
);

-- AddForeignKey
ALTER TABLE "source_files" ADD CONSTRAINT "source_files_league_slug_fkey" FOREIGN KEY ("league_slug") REFERENCES "leagues"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
