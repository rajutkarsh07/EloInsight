/*
  Warnings:

  - Made the column `blunders_white` on table `analysis` required. This step will fail if there are existing NULL values in that column.
  - Made the column `blunders_black` on table `analysis` required. This step will fail if there are existing NULL values in that column.
  - Made the column `mistakes_white` on table `analysis` required. This step will fail if there are existing NULL values in that column.
  - Made the column `mistakes_black` on table `analysis` required. This step will fail if there are existing NULL values in that column.
  - Made the column `inaccuracies_white` on table `analysis` required. This step will fail if there are existing NULL values in that column.
  - Made the column `inaccuracies_black` on table `analysis` required. This step will fail if there are existing NULL values in that column.
  - Made the column `brilliant_moves_white` on table `analysis` required. This step will fail if there are existing NULL values in that column.
  - Made the column `brilliant_moves_black` on table `analysis` required. This step will fail if there are existing NULL values in that column.
  - Made the column `good_moves_white` on table `analysis` required. This step will fail if there are existing NULL values in that column.
  - Made the column `good_moves_black` on table `analysis` required. This step will fail if there are existing NULL values in that column.
  - Made the column `book_moves_white` on table `analysis` required. This step will fail if there are existing NULL values in that column.
  - Made the column `book_moves_black` on table `analysis` required. This step will fail if there are existing NULL values in that column.
  - Made the column `analyzed_at` on table `analysis` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `analysis` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `analysis` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `analysis_jobs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `depth` on table `analysis_jobs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `priority` on table `analysis_jobs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `analyzed_positions` on table `analysis_jobs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `retry_count` on table `analysis_jobs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `analysis_jobs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `analysis_jobs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `analysis_status` on table `games` required. This step will fail if there are existing NULL values in that column.
  - Made the column `synced_at` on table `games` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `games` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `games` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_active` on table `linked_accounts` required. This step will fail if there are existing NULL values in that column.
  - Made the column `linked_at` on table `linked_accounts` required. This step will fail if there are existing NULL values in that column.
  - Made the column `sync_enabled` on table `linked_accounts` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_best_move` on table `move_evaluations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `classification` on table `move_evaluations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `move_evaluations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `move_evaluations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `moves` required. This step will fail if there are existing NULL values in that column.
  - Made the column `games_as_white` on table `opening_statistics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `wins_as_white` on table `opening_statistics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `losses_as_white` on table `opening_statistics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `draws_as_white` on table `opening_statistics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `games_as_black` on table `opening_statistics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `wins_as_black` on table `opening_statistics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `losses_as_black` on table `opening_statistics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `draws_as_black` on table `opening_statistics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_games` on table `opening_statistics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `calculated_at` on table `opening_statistics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `opening_statistics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `opening_statistics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_blunder` on table `position_analysis` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_mistake` on table `position_analysis` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_inaccuracy` on table `position_analysis` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_brilliant` on table `position_analysis` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_good` on table `position_analysis` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_book` on table `position_analysis` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_best` on table `position_analysis` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `position_analysis` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `sync_jobs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `processed_games` on table `sync_jobs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `new_games` on table `sync_jobs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `skipped_games` on table `sync_jobs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `retry_count` on table `sync_jobs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `sync_jobs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `sync_jobs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `user_profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `user_profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `theme` on table `user_settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `board_style` on table `user_settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `piece_set` on table `user_settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `auto_sync` on table `user_settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `sync_frequency` on table `user_settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email_notifications` on table `user_settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `analysis_depth` on table `user_settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `show_coordinates` on table `user_settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `highlight_last_move` on table `user_settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `auto_promote_queen` on table `user_settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `user_settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `user_settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_games` on table `user_statistics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `wins` on table `user_statistics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `losses` on table `user_statistics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `draws` on table `user_statistics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_blunders` on table `user_statistics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_mistakes` on table `user_statistics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_inaccuracies` on table `user_statistics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `calculated_at` on table `user_statistics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `user_statistics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email_verified` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_active` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "analysis" DROP CONSTRAINT "analysis_game_id_fkey";

-- DropForeignKey
ALTER TABLE "analysis_jobs" DROP CONSTRAINT "analysis_jobs_game_id_fkey";

-- DropForeignKey
ALTER TABLE "analysis_jobs" DROP CONSTRAINT "analysis_jobs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "games" DROP CONSTRAINT "games_user_id_fkey";

-- DropForeignKey
ALTER TABLE "linked_accounts" DROP CONSTRAINT "linked_accounts_user_id_fkey";

-- DropForeignKey
ALTER TABLE "move_evaluations" DROP CONSTRAINT "move_evaluations_move_id_fkey";

-- DropForeignKey
ALTER TABLE "moves" DROP CONSTRAINT "moves_game_id_fkey";

-- DropForeignKey
ALTER TABLE "opening_statistics" DROP CONSTRAINT "opening_statistics_user_id_fkey";

-- DropForeignKey
ALTER TABLE "position_analysis" DROP CONSTRAINT "position_analysis_analysis_id_fkey";

-- DropForeignKey
ALTER TABLE "sync_jobs" DROP CONSTRAINT "sync_jobs_linked_account_id_fkey";

-- DropForeignKey
ALTER TABLE "sync_jobs" DROP CONSTRAINT "sync_jobs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_profiles" DROP CONSTRAINT "user_profiles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_settings" DROP CONSTRAINT "user_settings_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_statistics" DROP CONSTRAINT "user_statistics_user_id_fkey";

-- AlterTable
ALTER TABLE "analysis" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "blunders_white" SET NOT NULL,
ALTER COLUMN "blunders_black" SET NOT NULL,
ALTER COLUMN "mistakes_white" SET NOT NULL,
ALTER COLUMN "mistakes_black" SET NOT NULL,
ALTER COLUMN "inaccuracies_white" SET NOT NULL,
ALTER COLUMN "inaccuracies_black" SET NOT NULL,
ALTER COLUMN "brilliant_moves_white" SET NOT NULL,
ALTER COLUMN "brilliant_moves_black" SET NOT NULL,
ALTER COLUMN "good_moves_white" SET NOT NULL,
ALTER COLUMN "good_moves_black" SET NOT NULL,
ALTER COLUMN "book_moves_white" SET NOT NULL,
ALTER COLUMN "book_moves_black" SET NOT NULL,
ALTER COLUMN "analyzed_at" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "analysis_jobs" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "depth" SET NOT NULL,
ALTER COLUMN "priority" SET NOT NULL,
ALTER COLUMN "analyzed_positions" SET NOT NULL,
ALTER COLUMN "retry_count" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "games" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "analysis_status" SET NOT NULL,
ALTER COLUMN "synced_at" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "linked_accounts" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "is_active" SET NOT NULL,
ALTER COLUMN "linked_at" SET NOT NULL,
ALTER COLUMN "sync_enabled" SET NOT NULL;

-- AlterTable
ALTER TABLE "move_evaluations" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "is_best_move" SET NOT NULL,
ALTER COLUMN "classification" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "moves" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "opening_statistics" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "games_as_white" SET NOT NULL,
ALTER COLUMN "wins_as_white" SET NOT NULL,
ALTER COLUMN "losses_as_white" SET NOT NULL,
ALTER COLUMN "draws_as_white" SET NOT NULL,
ALTER COLUMN "games_as_black" SET NOT NULL,
ALTER COLUMN "wins_as_black" SET NOT NULL,
ALTER COLUMN "losses_as_black" SET NOT NULL,
ALTER COLUMN "draws_as_black" SET NOT NULL,
ALTER COLUMN "total_games" SET NOT NULL,
ALTER COLUMN "calculated_at" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "position_analysis" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "is_blunder" SET NOT NULL,
ALTER COLUMN "is_mistake" SET NOT NULL,
ALTER COLUMN "is_inaccuracy" SET NOT NULL,
ALTER COLUMN "is_brilliant" SET NOT NULL,
ALTER COLUMN "is_good" SET NOT NULL,
ALTER COLUMN "is_book" SET NOT NULL,
ALTER COLUMN "is_best" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "sync_jobs" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "processed_games" SET NOT NULL,
ALTER COLUMN "new_games" SET NOT NULL,
ALTER COLUMN "skipped_games" SET NOT NULL,
ALTER COLUMN "retry_count" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_profiles" ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_settings" ALTER COLUMN "theme" SET NOT NULL,
ALTER COLUMN "board_style" SET NOT NULL,
ALTER COLUMN "piece_set" SET NOT NULL,
ALTER COLUMN "auto_sync" SET NOT NULL,
ALTER COLUMN "sync_frequency" SET NOT NULL,
ALTER COLUMN "email_notifications" SET NOT NULL,
ALTER COLUMN "analysis_depth" SET NOT NULL,
ALTER COLUMN "show_coordinates" SET NOT NULL,
ALTER COLUMN "highlight_last_move" SET NOT NULL,
ALTER COLUMN "auto_promote_queen" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_statistics" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "total_games" SET NOT NULL,
ALTER COLUMN "wins" SET NOT NULL,
ALTER COLUMN "losses" SET NOT NULL,
ALTER COLUMN "draws" SET NOT NULL,
ALTER COLUMN "total_blunders" SET NOT NULL,
ALTER COLUMN "total_mistakes" SET NOT NULL,
ALTER COLUMN "total_inaccuracies" SET NOT NULL,
ALTER COLUMN "calculated_at" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "email_verified" SET NOT NULL,
ALTER COLUMN "is_active" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linked_accounts" ADD CONSTRAINT "linked_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moves" ADD CONSTRAINT "moves_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis" ADD CONSTRAINT "analysis_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_analysis" ADD CONSTRAINT "position_analysis_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_evaluations" ADD CONSTRAINT "move_evaluations_move_id_fkey" FOREIGN KEY ("move_id") REFERENCES "moves"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_statistics" ADD CONSTRAINT "user_statistics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_statistics" ADD CONSTRAINT "opening_statistics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_linked_account_id_fkey" FOREIGN KEY ("linked_account_id") REFERENCES "linked_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_jobs" ADD CONSTRAINT "analysis_jobs_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_jobs" ADD CONSTRAINT "analysis_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
