-- Step 1: Add new clerkId column
ALTER TABLE "ProfileExternalAccount" ADD COLUMN "clerkId" TEXT;

-- Step 2: Update existing records
UPDATE "ProfileExternalAccount" ea
SET "clerkId" = p."clerkId"
FROM "Profile" p
WHERE ea."profileId" = p."id";

-- Step 3: Make clerkId not nullable
ALTER TABLE "ProfileExternalAccount" ALTER COLUMN "clerkId" SET NOT NULL;

-- Step 4: Add index
CREATE INDEX "ProfileExternalAccount_clerkId_idx" ON "ProfileExternalAccount"("clerkId");

-- Step 5: Update foreign key
ALTER TABLE "ProfileExternalAccount" 
DROP CONSTRAINT "ProfileExternalAccount_profileId_fkey",
ADD CONSTRAINT "ProfileExternalAccount_clerkId_fkey" 
FOREIGN KEY ("clerkId") REFERENCES "Profile"("clerkId") ON DELETE CASCADE;

-- Step 6: Drop old column
ALTER TABLE "ProfileExternalAccount" DROP COLUMN "profileId"; 