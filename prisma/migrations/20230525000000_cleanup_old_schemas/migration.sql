-- This migration cleans up old schemas and updates the profile-related tables

-- Drop tables related to old endpoints (if any)
-- Example: DROP TABLE IF EXISTS "old_endpoint_table";

-- Update profile table if needed
ALTER TABLE "profiles" 
ADD COLUMN IF NOT EXISTS "username" TEXT,
ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

-- Create ProfileExternalAccount table if it doesn't exist
CREATE TABLE IF NOT EXISTS "profile_external_accounts" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  CONSTRAINT "profile_external_accounts_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on provider and providerId
ALTER TABLE "profile_external_accounts" 
ADD CONSTRAINT "profile_external_accounts_provider_providerId_key" 
UNIQUE ("provider", "providerId");

-- Create foreign key constraint
ALTER TABLE "profile_external_accounts" 
ADD CONSTRAINT "profile_external_accounts_profileId_fkey" 
FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create ProfilePreference table if it doesn't exist
CREATE TABLE IF NOT EXISTS "profile_preferences" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  CONSTRAINT "profile_preferences_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on profileId
ALTER TABLE "profile_preferences" 
ADD CONSTRAINT "profile_preferences_profileId_key" 
UNIQUE ("profileId");

-- Create foreign key constraint
ALTER TABLE "profile_preferences" 
ADD CONSTRAINT "profile_preferences_profileId_fkey" 
FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add any other necessary changes or cleanup operations

