-- Create new UserPreferences collection
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "preferences" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- Create unique index on clerkId
CREATE UNIQUE INDEX "UserPreferences_clerkId_key" ON "UserPreferences"("clerkId");

-- Remove preferences from Profile table
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "preferences"; 