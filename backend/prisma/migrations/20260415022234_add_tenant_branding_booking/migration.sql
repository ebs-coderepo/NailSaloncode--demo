-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "bookingEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bookingLeadMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "bookingMaxDaysAhead" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "bookingNotesEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "businessHours" JSONB,
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "primaryColor" TEXT NOT NULL DEFAULT '#db2777',
ADD COLUMN     "socialFacebook" TEXT,
ADD COLUMN     "socialInstagram" TEXT,
ADD COLUMN     "socialWebsite" TEXT,
ADD COLUMN     "tagline" TEXT,
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'light';
