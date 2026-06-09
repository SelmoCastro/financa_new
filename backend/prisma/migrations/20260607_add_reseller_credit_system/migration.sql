-- Reseller credit system for Premium activation
-- MVP: separate reseller auth, immutable ledger, audited premium activations

CREATE TABLE "Reseller" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "companyName" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "hashedRefreshToken" TEXT,
    "creditVersion" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reseller_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResellerLedger" (
    "id" TEXT NOT NULL,
    "resellerId" TEXT NOT NULL,
    "entryType" TEXT NOT NULL,
    "deltaCredits" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "idempotencyKey" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResellerLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResellerPremiumActivation" (
    "id" TEXT NOT NULL,
    "resellerId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "targetUserEmailSnapshot" TEXT NOT NULL,
    "targetUserNameSnapshot" TEXT,
    "lookupEmail" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "creditsConsumed" INTEGER NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResellerPremiumActivation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Reseller_email_key" ON "Reseller"("email");
CREATE INDEX "Reseller_status_idx" ON "Reseller"("status");
CREATE INDEX "Reseller_createdByAdminId_idx" ON "Reseller"("createdByAdminId");
CREATE INDEX "Reseller_createdAt_idx" ON "Reseller"("createdAt");

CREATE UNIQUE INDEX "ResellerLedger_idempotencyKey_key" ON "ResellerLedger"("idempotencyKey");
CREATE INDEX "ResellerLedger_resellerId_createdAt_idx" ON "ResellerLedger"("resellerId", "createdAt");
CREATE INDEX "ResellerLedger_entryType_idx" ON "ResellerLedger"("entryType");
CREATE INDEX "ResellerLedger_referenceType_referenceId_idx" ON "ResellerLedger"("referenceType", "referenceId");
CREATE INDEX "ResellerLedger_createdByAdminId_idx" ON "ResellerLedger"("createdByAdminId");

CREATE UNIQUE INDEX "ResellerPremiumActivation_idempotencyKey_key" ON "ResellerPremiumActivation"("idempotencyKey");
CREATE INDEX "ResellerPremiumActivation_resellerId_createdAt_idx" ON "ResellerPremiumActivation"("resellerId", "createdAt");
CREATE INDEX "ResellerPremiumActivation_targetUserId_createdAt_idx" ON "ResellerPremiumActivation"("targetUserId", "createdAt");
CREATE INDEX "ResellerPremiumActivation_sku_idx" ON "ResellerPremiumActivation"("sku");

ALTER TABLE "Reseller"
    ADD CONSTRAINT "Reseller_createdByAdminId_fkey"
    FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ResellerLedger"
    ADD CONSTRAINT "ResellerLedger_resellerId_fkey"
    FOREIGN KEY ("resellerId") REFERENCES "Reseller"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResellerLedger"
    ADD CONSTRAINT "ResellerLedger_createdByAdminId_fkey"
    FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ResellerPremiumActivation"
    ADD CONSTRAINT "ResellerPremiumActivation_resellerId_fkey"
    FOREIGN KEY ("resellerId") REFERENCES "Reseller"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResellerPremiumActivation"
    ADD CONSTRAINT "ResellerPremiumActivation_targetUserId_fkey"
    FOREIGN KEY ("targetUserId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
