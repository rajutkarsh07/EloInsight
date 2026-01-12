-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('chess.com', 'lichess', 'manual');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('light', 'dark', 'auto');

-- CreateEnum
CREATE TYPE "PlayerColor" AS ENUM ('white', 'black');

-- CreateEnum
CREATE TYPE "GameResult" AS ENUM ('1-0', '0-1', '1/2-1/2', '*');

-- CreateEnum
CREATE TYPE "TimeClass" AS ENUM ('ultrabullet', 'bullet', 'blitz', 'rapid', 'classical', 'daily');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('pending', 'queued', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "MoveClassification" AS ENUM ('brilliant', 'great', 'best', 'excellent', 'good', 'book', 'normal', 'inaccuracy', 'mistake', 'blunder', 'missed_win');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('daily', 'weekly', 'monthly', 'yearly', 'all_time');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "user_id" UUID NOT NULL,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "avatar_url" TEXT,
    "bio" TEXT,
    "country" VARCHAR(2),
    "timezone" VARCHAR(50),
    "date_of_birth" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "linked_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "platform" "Platform" NOT NULL,
    "platform_username" VARCHAR(100) NOT NULL,
    "platform_user_id" VARCHAR(100),
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "linked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_sync_at" TIMESTAMPTZ,
    "sync_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "linked_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "user_id" UUID NOT NULL,
    "theme" "Theme" NOT NULL DEFAULT 'light',
    "board_style" VARCHAR(50) NOT NULL DEFAULT 'classic',
    "piece_set" VARCHAR(50) NOT NULL DEFAULT 'standard',
    "auto_sync" BOOLEAN NOT NULL DEFAULT true,
    "sync_frequency" VARCHAR(20) NOT NULL DEFAULT 'daily',
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "analysis_depth" INTEGER NOT NULL DEFAULT 20,
    "show_coordinates" BOOLEAN NOT NULL DEFAULT true,
    "highlight_last_move" BOOLEAN NOT NULL DEFAULT true,
    "auto_promote_queen" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "platform" "Platform" NOT NULL,
    "external_id" VARCHAR(100),
    "pgn" TEXT NOT NULL,
    "fen_final" TEXT,
    "white_player" VARCHAR(100) NOT NULL,
    "black_player" VARCHAR(100) NOT NULL,
    "white_rating" INTEGER,
    "black_rating" INTEGER,
    "user_color" "PlayerColor",
    "result" "GameResult" NOT NULL,
    "termination" VARCHAR(50),
    "time_control" VARCHAR(50),
    "time_class" "TimeClass",
    "opening_eco" VARCHAR(3),
    "opening_name" VARCHAR(200),
    "opening_variation" VARCHAR(200),
    "event_name" VARCHAR(200),
    "site" VARCHAR(200),
    "round" VARCHAR(20),
    "played_at" TIMESTAMPTZ NOT NULL,
    "analysis_status" "AnalysisStatus" NOT NULL DEFAULT 'pending',
    "analysis_requested_at" TIMESTAMPTZ,
    "synced_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moves" (
    "id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "move_number" INTEGER NOT NULL,
    "half_move" INTEGER NOT NULL,
    "color" "PlayerColor" NOT NULL,
    "san" VARCHAR(10) NOT NULL,
    "uci" VARCHAR(10) NOT NULL,
    "fen_before" TEXT NOT NULL,
    "fen_after" TEXT NOT NULL,
    "time_spent" INTEGER,
    "clock_after" VARCHAR(20),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis" (
    "id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "accuracy_white" DECIMAL(5,2),
    "accuracy_black" DECIMAL(5,2),
    "acpl_white" DECIMAL(8,2),
    "acpl_black" DECIMAL(8,2),
    "blunders_white" INTEGER NOT NULL DEFAULT 0,
    "blunders_black" INTEGER NOT NULL DEFAULT 0,
    "mistakes_white" INTEGER NOT NULL DEFAULT 0,
    "mistakes_black" INTEGER NOT NULL DEFAULT 0,
    "inaccuracies_white" INTEGER NOT NULL DEFAULT 0,
    "inaccuracies_black" INTEGER NOT NULL DEFAULT 0,
    "brilliant_moves_white" INTEGER NOT NULL DEFAULT 0,
    "brilliant_moves_black" INTEGER NOT NULL DEFAULT 0,
    "good_moves_white" INTEGER NOT NULL DEFAULT 0,
    "good_moves_black" INTEGER NOT NULL DEFAULT 0,
    "book_moves_white" INTEGER NOT NULL DEFAULT 0,
    "book_moves_black" INTEGER NOT NULL DEFAULT 0,
    "performance_rating_white" INTEGER,
    "performance_rating_black" INTEGER,
    "analysis_depth" INTEGER NOT NULL,
    "engine_version" VARCHAR(50),
    "total_positions" INTEGER,
    "analyzed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "position_analysis" (
    "id" UUID NOT NULL,
    "analysis_id" UUID NOT NULL,
    "move_number" INTEGER NOT NULL,
    "half_move" INTEGER NOT NULL,
    "fen" TEXT NOT NULL,
    "evaluation" INTEGER,
    "mate_in" INTEGER,
    "best_move" VARCHAR(10) NOT NULL,
    "played_move" VARCHAR(10) NOT NULL,
    "is_blunder" BOOLEAN NOT NULL DEFAULT false,
    "is_mistake" BOOLEAN NOT NULL DEFAULT false,
    "is_inaccuracy" BOOLEAN NOT NULL DEFAULT false,
    "is_brilliant" BOOLEAN NOT NULL DEFAULT false,
    "is_good" BOOLEAN NOT NULL DEFAULT false,
    "is_book" BOOLEAN NOT NULL DEFAULT false,
    "is_best" BOOLEAN NOT NULL DEFAULT false,
    "classification" "MoveClassification" NOT NULL,
    "centipawn_loss" INTEGER,
    "pv" JSONB,
    "depth" INTEGER,
    "nodes" BIGINT,
    "time_ms" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "position_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "move_evaluations" (
    "id" UUID NOT NULL,
    "move_id" UUID NOT NULL,
    "eval_before" INTEGER,
    "mate_in_before" INTEGER,
    "eval_after" INTEGER,
    "mate_in_after" INTEGER,
    "best_move" VARCHAR(10),
    "is_best_move" BOOLEAN NOT NULL DEFAULT false,
    "classification" "MoveClassification" NOT NULL DEFAULT 'normal',
    "centipawn_loss" INTEGER,
    "depth" INTEGER,
    "pv" JSONB,
    "nodes" BIGINT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "move_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_statistics" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "period_type" "PeriodType" NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "total_games" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "win_rate" DECIMAL(5,2),
    "win_rate_white" DECIMAL(5,2),
    "win_rate_black" DECIMAL(5,2),
    "average_accuracy" DECIMAL(5,2),
    "average_accuracy_white" DECIMAL(5,2),
    "average_accuracy_black" DECIMAL(5,2),
    "average_acpl" DECIMAL(8,2),
    "average_acpl_white" DECIMAL(8,2),
    "average_acpl_black" DECIMAL(8,2),
    "total_blunders" INTEGER NOT NULL DEFAULT 0,
    "total_mistakes" INTEGER NOT NULL DEFAULT 0,
    "total_inaccuracies" INTEGER NOT NULL DEFAULT 0,
    "games_by_time_control" JSONB,
    "favorite_opening" VARCHAR(200),
    "openings_distribution" JSONB,
    "peak_rating" INTEGER,
    "current_rating" INTEGER,
    "rating_change" INTEGER,
    "calculated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opening_statistics" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "opening_eco" VARCHAR(3) NOT NULL,
    "opening_name" VARCHAR(200) NOT NULL,
    "games_as_white" INTEGER NOT NULL DEFAULT 0,
    "wins_as_white" INTEGER NOT NULL DEFAULT 0,
    "losses_as_white" INTEGER NOT NULL DEFAULT 0,
    "draws_as_white" INTEGER NOT NULL DEFAULT 0,
    "win_rate_white" DECIMAL(5,2),
    "average_accuracy_white" DECIMAL(5,2),
    "games_as_black" INTEGER NOT NULL DEFAULT 0,
    "wins_as_black" INTEGER NOT NULL DEFAULT 0,
    "losses_as_black" INTEGER NOT NULL DEFAULT 0,
    "draws_as_black" INTEGER NOT NULL DEFAULT 0,
    "win_rate_black" DECIMAL(5,2),
    "average_accuracy_black" DECIMAL(5,2),
    "total_games" INTEGER NOT NULL DEFAULT 0,
    "overall_win_rate" DECIMAL(5,2),
    "average_accuracy" DECIMAL(5,2),
    "common_variations" JSONB,
    "last_played_at" TIMESTAMPTZ,
    "calculated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "opening_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_jobs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "linked_account_id" UUID NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'queued',
    "total_games" INTEGER,
    "processed_games" INTEGER NOT NULL DEFAULT 0,
    "new_games" INTEGER NOT NULL DEFAULT 0,
    "skipped_games" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_jobs" (
    "id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'queued',
    "depth" INTEGER NOT NULL DEFAULT 20,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "total_positions" INTEGER,
    "analyzed_positions" INTEGER NOT NULL DEFAULT 0,
    "current_move" INTEGER,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "analysis_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_username" ON "users"("username");

-- CreateIndex
CREATE INDEX "idx_users_created_at" ON "users"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_user_profiles_country" ON "user_profiles"("country");

-- CreateIndex
CREATE INDEX "idx_linked_accounts_user_id" ON "linked_accounts"("user_id");

-- CreateIndex
CREATE INDEX "idx_linked_accounts_platform" ON "linked_accounts"("platform", "platform_username");

-- CreateIndex
CREATE UNIQUE INDEX "linked_accounts_user_id_platform_key" ON "linked_accounts"("user_id", "platform");

-- CreateIndex
CREATE INDEX "idx_games_user_id" ON "games"("user_id");

-- CreateIndex
CREATE INDEX "idx_games_platform_external" ON "games"("platform", "external_id");

-- CreateIndex
CREATE INDEX "idx_games_played_at" ON "games"("played_at" DESC);

-- CreateIndex
CREATE INDEX "idx_games_user_played" ON "games"("user_id", "played_at" DESC);

-- CreateIndex
CREATE INDEX "idx_games_analysis_status" ON "games"("analysis_status");

-- CreateIndex
CREATE INDEX "idx_games_opening" ON "games"("opening_eco");

-- CreateIndex
CREATE INDEX "idx_games_time_class" ON "games"("time_class");

-- CreateIndex
CREATE UNIQUE INDEX "games_platform_external_id_key" ON "games"("platform", "external_id");

-- CreateIndex
CREATE INDEX "idx_moves_game_id" ON "moves"("game_id");

-- CreateIndex
CREATE INDEX "idx_moves_game_move" ON "moves"("game_id", "move_number");

-- CreateIndex
CREATE UNIQUE INDEX "moves_game_id_half_move_key" ON "moves"("game_id", "half_move");

-- CreateIndex
CREATE UNIQUE INDEX "analysis_game_id_key" ON "analysis"("game_id");

-- CreateIndex
CREATE INDEX "idx_analysis_game_id" ON "analysis"("game_id");

-- CreateIndex
CREATE INDEX "idx_analysis_analyzed_at" ON "analysis"("analyzed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_position_analysis_id" ON "position_analysis"("analysis_id");

-- CreateIndex
CREATE INDEX "idx_position_move" ON "position_analysis"("analysis_id", "move_number");

-- CreateIndex
CREATE INDEX "idx_position_classification" ON "position_analysis"("classification");

-- CreateIndex
CREATE UNIQUE INDEX "move_evaluations_move_id_key" ON "move_evaluations"("move_id");

-- CreateIndex
CREATE INDEX "idx_move_evaluation_move_id" ON "move_evaluations"("move_id");

-- CreateIndex
CREATE INDEX "idx_move_evaluation_classification" ON "move_evaluations"("classification");

-- CreateIndex
CREATE INDEX "idx_user_stats_user_period" ON "user_statistics"("user_id", "period_type", "period_start" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_statistics_user_id_period_type_period_start_key" ON "user_statistics"("user_id", "period_type", "period_start");

-- CreateIndex
CREATE INDEX "idx_opening_stats_user" ON "opening_statistics"("user_id");

-- CreateIndex
CREATE INDEX "idx_opening_stats_eco" ON "opening_statistics"("opening_eco");

-- CreateIndex
CREATE INDEX "idx_opening_stats_games" ON "opening_statistics"("user_id", "total_games" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "opening_statistics_user_id_opening_eco_key" ON "opening_statistics"("user_id", "opening_eco");

-- CreateIndex
CREATE INDEX "idx_sync_jobs_user" ON "sync_jobs"("user_id");

-- CreateIndex
CREATE INDEX "idx_sync_jobs_status" ON "sync_jobs"("status");

-- CreateIndex
CREATE INDEX "idx_sync_jobs_created" ON "sync_jobs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_analysis_jobs_game" ON "analysis_jobs"("game_id");

-- CreateIndex
CREATE INDEX "idx_analysis_jobs_user" ON "analysis_jobs"("user_id");

-- CreateIndex
CREATE INDEX "idx_analysis_jobs_status" ON "analysis_jobs"("status", "priority" DESC);

-- CreateIndex
CREATE INDEX "idx_analysis_jobs_created" ON "analysis_jobs"("created_at" DESC);

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
