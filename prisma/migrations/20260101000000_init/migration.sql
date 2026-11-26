-- Migración inicial de ShopGenius AI
-- Crea las tablas de sesión de Shopify, ajustes por tienda e historial de IA.

CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" DATETIME
);

CREATE TABLE "ShopSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "subscriptionId" TEXT,
    "subscriptionStatus" TEXT,
    "trialEndsAt" DATETIME,
    "aiProvider" TEXT NOT NULL DEFAULT 'demo',
    "aiModel" TEXT,
    "aiApiKeyEnc" TEXT,
    "defaultTone" TEXT NOT NULL DEFAULT 'profesional',
    "defaultLanguage" TEXT NOT NULL DEFAULT 'es',
    "defaultKeywords" TEXT,
    "brandVoice" TEXT,
    "storeDescription" TEXT,
    "monthlyGenerationLimit" INTEGER,
    "onboardedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "ShopSettings_shop_key" ON "ShopSettings"("shop");

CREATE TABLE "Generation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PRODUCT_DESCRIPTION',
    "productId" TEXT,
    "productTitle" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputJson" TEXT NOT NULL,
    "outputJson" TEXT NOT NULL,
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "appliedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shopSettingsId" TEXT,
    CONSTRAINT "Generation_shopSettingsId_fkey" FOREIGN KEY ("shopSettingsId") REFERENCES "ShopSettings" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Generation_shop_createdAt_idx" ON "Generation"("shop", "createdAt");
CREATE INDEX "Generation_shop_productId_idx" ON "Generation"("shop", "productId");
