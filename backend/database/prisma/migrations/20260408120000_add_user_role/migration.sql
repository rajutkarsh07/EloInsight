-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" ("role");
