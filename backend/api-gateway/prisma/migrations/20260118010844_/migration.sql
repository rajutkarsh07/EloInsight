/*
  Warnings:

  - A unique constraint covering the columns `[user_id,platform,external_id]` on the table `games` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[platform,platform_username]` on the table `linked_accounts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "Platform" ADD VALUE 'google';

-- DropIndex
DROP INDEX "games_platform_external_id_key";

-- AlterTable
ALTER TABLE "linked_accounts" ADD COLUMN     "avatar_url" TEXT;

-- AlterTable
ALTER TABLE "position_analysis" ADD COLUMN     "best_move_uci" VARCHAR(10),
ADD COLUMN     "played_move_uci" VARCHAR(10);

-- CreateIndex
CREATE UNIQUE INDEX "games_user_id_platform_external_id_key" ON "games"("user_id", "platform", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "linked_accounts_platform_platform_username_key" ON "linked_accounts"("platform", "platform_username");
