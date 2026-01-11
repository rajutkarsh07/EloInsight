-- EloInsight Database Schema
-- Initial Migration: Create all tables
-- PostgreSQL 15+

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE "Platform" AS ENUM ('chess.com', 'lichess', 'manual');
CREATE TYPE "Theme" AS ENUM ('light', 'dark', 'auto');
CREATE TYPE "PlayerColor" AS ENUM ('white', 'black');
CREATE TYPE "GameResult" AS ENUM ('1-0', '0-1', '1/2-1/2', '*');
CREATE TYPE "TimeClass" AS ENUM ('ultrabullet', 'bullet', 'blitz', 'rapid', 'classical', 'daily');
CREATE TYPE "AnalysisStatus" AS ENUM ('pending', 'queued', 'processing', 'completed', 'failed');
CREATE TYPE "MoveClassification" AS ENUM ('brilliant', 'great', 'best', 'excellent', 'good', 'book', 'normal', 'inaccuracy', 'mistake', 'blunder', 'missed_win');
CREATE TYPE "PeriodType" AS ENUM ('daily', 'weekly', 'monthly', 'yearly', 'all_time');
CREATE TYPE "JobStatus" AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');

-- ============================================
-- USERS DOMAIN
-- ============================================

-- Users table
CREATE TABLE "users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "username" VARCHAR(50) UNIQUE NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "email_verified" BOOLEAN DEFAULT FALSE,
    "is_active" BOOLEAN DEFAULT TRUE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW(),
    "deleted_at" TIMESTAMPTZ
);

CREATE INDEX "idx_users_email" ON "users"("email");
CREATE INDEX "idx_users_username" ON "users"("username");
CREATE INDEX "idx_users_created_at" ON "users"("created_at" DESC);

-- User profiles
CREATE TABLE "user_profiles" (
    "user_id" UUID PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "avatar_url" TEXT,
    "bio" TEXT,
    "country" VARCHAR(2),
    "timezone" VARCHAR(50),
    "date_of_birth" DATE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX "idx_user_profiles_country" ON "user_profiles"("country");

-- User settings
CREATE TABLE "user_settings" (
    "user_id" UUID PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
    "theme" "Theme" DEFAULT 'light',
    "board_style" VARCHAR(50) DEFAULT 'classic',
    "piece_set" VARCHAR(50) DEFAULT 'standard',
    "auto_sync" BOOLEAN DEFAULT TRUE,
    "sync_frequency" VARCHAR(20) DEFAULT 'daily',
    "email_notifications" BOOLEAN DEFAULT TRUE,
    "analysis_depth" INTEGER DEFAULT 20,
    "show_coordinates" BOOLEAN DEFAULT TRUE,
    "highlight_last_move" BOOLEAN DEFAULT TRUE,
    "auto_promote_queen" BOOLEAN DEFAULT TRUE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Linked accounts
CREATE TABLE "linked_accounts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "platform" "Platform" NOT NULL,
    "platform_username" VARCHAR(100) NOT NULL,
    "platform_user_id" VARCHAR(100),
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMPTZ,
    "is_active" BOOLEAN DEFAULT TRUE,
    "linked_at" TIMESTAMPTZ DEFAULT NOW(),
    "last_sync_at" TIMESTAMPTZ,
    "sync_enabled" BOOLEAN DEFAULT TRUE,
    UNIQUE("user_id", "platform")
);

CREATE INDEX "idx_linked_accounts_user_id" ON "linked_accounts"("user_id");
CREATE INDEX "idx_linked_accounts_platform" ON "linked_accounts"("platform", "platform_username");

-- ============================================
-- GAMES DOMAIN
-- ============================================

-- Games
CREATE TABLE "games" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
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
    "analysis_status" "AnalysisStatus" DEFAULT 'pending',
    "analysis_requested_at" TIMESTAMPTZ,
    "synced_at" TIMESTAMPTZ DEFAULT NOW(),
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("platform", "external_id")
);

CREATE INDEX "idx_games_user_id" ON "games"("user_id");
CREATE INDEX "idx_games_platform_external" ON "games"("platform", "external_id");
CREATE INDEX "idx_games_played_at" ON "games"("played_at" DESC);
CREATE INDEX "idx_games_user_played" ON "games"("user_id", "played_at" DESC);
CREATE INDEX "idx_games_analysis_status" ON "games"("analysis_status");
CREATE INDEX "idx_games_opening" ON "games"("opening_eco");
CREATE INDEX "idx_games_time_class" ON "games"("time_class");

-- Moves
CREATE TABLE "moves" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "game_id" UUID NOT NULL REFERENCES "games"("id") ON DELETE CASCADE,
    "move_number" INTEGER NOT NULL,
    "half_move" INTEGER NOT NULL,
    "color" "PlayerColor" NOT NULL,
    "san" VARCHAR(10) NOT NULL,
    "uci" VARCHAR(10) NOT NULL,
    "fen_before" TEXT NOT NULL,
    "fen_after" TEXT NOT NULL,
    "time_spent" INTEGER,
    "clock_after" VARCHAR(20),
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("game_id", "half_move")
);

CREATE INDEX "idx_moves_game_id" ON "moves"("game_id");
CREATE INDEX "idx_moves_game_move" ON "moves"("game_id", "move_number");

-- ============================================
-- ANALYSIS DOMAIN
-- ============================================

-- Analysis (game-level summary)
CREATE TABLE "analysis" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "game_id" UUID UNIQUE NOT NULL REFERENCES "games"("id") ON DELETE CASCADE,
    "accuracy_white" DECIMAL(5, 2),
    "accuracy_black" DECIMAL(5, 2),
    "acpl_white" DECIMAL(8, 2),
    "acpl_black" DECIMAL(8, 2),
    "blunders_white" INTEGER DEFAULT 0,
    "blunders_black" INTEGER DEFAULT 0,
    "mistakes_white" INTEGER DEFAULT 0,
    "mistakes_black" INTEGER DEFAULT 0,
    "inaccuracies_white" INTEGER DEFAULT 0,
    "inaccuracies_black" INTEGER DEFAULT 0,
    "brilliant_moves_white" INTEGER DEFAULT 0,
    "brilliant_moves_black" INTEGER DEFAULT 0,
    "good_moves_white" INTEGER DEFAULT 0,
    "good_moves_black" INTEGER DEFAULT 0,
    "book_moves_white" INTEGER DEFAULT 0,
    "book_moves_black" INTEGER DEFAULT 0,
    "performance_rating_white" INTEGER,
    "performance_rating_black" INTEGER,
    "analysis_depth" INTEGER NOT NULL,
    "engine_version" VARCHAR(50),
    "total_positions" INTEGER,
    "analyzed_at" TIMESTAMPTZ DEFAULT NOW(),
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX "idx_analysis_game_id" ON "analysis"("game_id");
CREATE INDEX "idx_analysis_analyzed_at" ON "analysis"("analyzed_at" DESC);

-- Position analysis (per-move)
CREATE TABLE "position_analysis" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "analysis_id" UUID NOT NULL REFERENCES "analysis"("id") ON DELETE CASCADE,
    "move_number" INTEGER NOT NULL,
    "half_move" INTEGER NOT NULL,
    "fen" TEXT NOT NULL,
    "evaluation" INTEGER,
    "mate_in" INTEGER,
    "best_move" VARCHAR(10) NOT NULL,
    "played_move" VARCHAR(10) NOT NULL,
    "is_blunder" BOOLEAN DEFAULT FALSE,
    "is_mistake" BOOLEAN DEFAULT FALSE,
    "is_inaccuracy" BOOLEAN DEFAULT FALSE,
    "is_brilliant" BOOLEAN DEFAULT FALSE,
    "is_good" BOOLEAN DEFAULT FALSE,
    "is_book" BOOLEAN DEFAULT FALSE,
    "is_best" BOOLEAN DEFAULT FALSE,
    "classification" "MoveClassification" NOT NULL,
    "centipawn_loss" INTEGER,
    "pv" JSONB,
    "depth" INTEGER,
    "nodes" BIGINT,
    "time_ms" INTEGER,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX "idx_position_analysis_id" ON "position_analysis"("analysis_id");
CREATE INDEX "idx_position_move" ON "position_analysis"("analysis_id", "move_number");
CREATE INDEX "idx_position_classification" ON "position_analysis"("classification");

-- Move evaluations (linked to moves table)
CREATE TABLE "move_evaluations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "move_id" UUID UNIQUE NOT NULL REFERENCES "moves"("id") ON DELETE CASCADE,
    "eval_before" INTEGER,
    "mate_in_before" INTEGER,
    "eval_after" INTEGER,
    "mate_in_after" INTEGER,
    "best_move" VARCHAR(10),
    "is_best_move" BOOLEAN DEFAULT FALSE,
    "classification" "MoveClassification" DEFAULT 'normal',
    "centipawn_loss" INTEGER,
    "depth" INTEGER,
    "pv" JSONB,
    "nodes" BIGINT,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX "idx_move_evaluation_move_id" ON "move_evaluations"("move_id");
CREATE INDEX "idx_move_evaluation_classification" ON "move_evaluations"("classification");

-- ============================================
-- STATISTICS DOMAIN
-- ============================================

-- User statistics
CREATE TABLE "user_statistics" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "period_type" "PeriodType" NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "total_games" INTEGER DEFAULT 0,
    "wins" INTEGER DEFAULT 0,
    "losses" INTEGER DEFAULT 0,
    "draws" INTEGER DEFAULT 0,
    "win_rate" DECIMAL(5, 2),
    "win_rate_white" DECIMAL(5, 2),
    "win_rate_black" DECIMAL(5, 2),
    "average_accuracy" DECIMAL(5, 2),
    "average_accuracy_white" DECIMAL(5, 2),
    "average_accuracy_black" DECIMAL(5, 2),
    "average_acpl" DECIMAL(8, 2),
    "average_acpl_white" DECIMAL(8, 2),
    "average_acpl_black" DECIMAL(8, 2),
    "total_blunders" INTEGER DEFAULT 0,
    "total_mistakes" INTEGER DEFAULT 0,
    "total_inaccuracies" INTEGER DEFAULT 0,
    "games_by_time_control" JSONB,
    "favorite_opening" VARCHAR(200),
    "openings_distribution" JSONB,
    "peak_rating" INTEGER,
    "current_rating" INTEGER,
    "rating_change" INTEGER,
    "calculated_at" TIMESTAMPTZ DEFAULT NOW(),
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("user_id", "period_type", "period_start")
);

CREATE INDEX "idx_user_stats_user_period" ON "user_statistics"("user_id", "period_type", "period_start" DESC);

-- Opening statistics
CREATE TABLE "opening_statistics" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "opening_eco" VARCHAR(3) NOT NULL,
    "opening_name" VARCHAR(200) NOT NULL,
    "games_as_white" INTEGER DEFAULT 0,
    "wins_as_white" INTEGER DEFAULT 0,
    "losses_as_white" INTEGER DEFAULT 0,
    "draws_as_white" INTEGER DEFAULT 0,
    "win_rate_white" DECIMAL(5, 2),
    "average_accuracy_white" DECIMAL(5, 2),
    "games_as_black" INTEGER DEFAULT 0,
    "wins_as_black" INTEGER DEFAULT 0,
    "losses_as_black" INTEGER DEFAULT 0,
    "draws_as_black" INTEGER DEFAULT 0,
    "win_rate_black" DECIMAL(5, 2),
    "average_accuracy_black" DECIMAL(5, 2),
    "total_games" INTEGER DEFAULT 0,
    "overall_win_rate" DECIMAL(5, 2),
    "average_accuracy" DECIMAL(5, 2),
    "common_variations" JSONB,
    "last_played_at" TIMESTAMPTZ,
    "calculated_at" TIMESTAMPTZ DEFAULT NOW(),
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("user_id", "opening_eco")
);

CREATE INDEX "idx_opening_stats_user" ON "opening_statistics"("user_id");
CREATE INDEX "idx_opening_stats_eco" ON "opening_statistics"("opening_eco");
CREATE INDEX "idx_opening_stats_games" ON "opening_statistics"("user_id", "total_games" DESC);

-- ============================================
-- JOBS DOMAIN
-- ============================================

-- Sync jobs
CREATE TABLE "sync_jobs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "linked_account_id" UUID NOT NULL REFERENCES "linked_accounts"("id") ON DELETE CASCADE,
    "status" "JobStatus" DEFAULT 'queued',
    "total_games" INTEGER,
    "processed_games" INTEGER DEFAULT 0,
    "new_games" INTEGER DEFAULT 0,
    "skipped_games" INTEGER DEFAULT 0,
    "error_message" TEXT,
    "retry_count" INTEGER DEFAULT 0,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX "idx_sync_jobs_user" ON "sync_jobs"("user_id");
CREATE INDEX "idx_sync_jobs_status" ON "sync_jobs"("status");
CREATE INDEX "idx_sync_jobs_created" ON "sync_jobs"("created_at" DESC);

-- Analysis jobs
CREATE TABLE "analysis_jobs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "game_id" UUID NOT NULL REFERENCES "games"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "status" "JobStatus" DEFAULT 'queued',
    "depth" INTEGER DEFAULT 20,
    "priority" INTEGER DEFAULT 5,
    "total_positions" INTEGER,
    "analyzed_positions" INTEGER DEFAULT 0,
    "current_move" INTEGER,
    "error_message" TEXT,
    "retry_count" INTEGER DEFAULT 0,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX "idx_analysis_jobs_game" ON "analysis_jobs"("game_id");
CREATE INDEX "idx_analysis_jobs_user" ON "analysis_jobs"("user_id");
CREATE INDEX "idx_analysis_jobs_status" ON "analysis_jobs"("status", "priority" DESC);
CREATE INDEX "idx_analysis_jobs_created" ON "analysis_jobs"("created_at" DESC);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON "users"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON "user_profiles"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON "user_settings"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at
    BEFORE UPDATE ON "games"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_updated_at
    BEFORE UPDATE ON "analysis"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_move_evaluations_updated_at
    BEFORE UPDATE ON "move_evaluations"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opening_statistics_updated_at
    BEFORE UPDATE ON "opening_statistics"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_jobs_updated_at
    BEFORE UPDATE ON "sync_jobs"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_jobs_updated_at
    BEFORE UPDATE ON "analysis_jobs"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
