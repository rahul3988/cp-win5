-- AlterTable
ALTER TABLE "admin_config" ADD COLUMN     "attendanceTiers" JSONB,
ADD COLUMN     "depositBonusPct" DOUBLE PRECISION NOT NULL DEFAULT 5;
