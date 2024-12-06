-- Create ProfessionalInfo collection
CREATE TABLE "ProfessionalInfo" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "professionalInfo" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProfessionalInfo_pkey" PRIMARY KEY ("id")
);

-- Create unique index on clerkId
CREATE UNIQUE INDEX "ProfessionalInfo_clerkId_key" ON "ProfessionalInfo"("clerkId"); 