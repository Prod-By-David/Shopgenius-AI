import prisma from "../db.server";
import type { AiRuntimeConfig } from "./ai.server";
import { isProviderId } from "./ai.server";
import { decryptSecret, encryptSecret } from "./crypto.server";
import {
  currentPeriodStart,
  getPlan,
  resolveGenerationLimit,
  type Plan,
  type PlanId,
} from "./plans.server";

export type ShopSettingsRecord = Awaited<ReturnType<typeof getShopSettings>>;

const DEFAULT_SHOP_SETTINGS = {
  plan: "FREE",
  aiProvider: "demo",
  defaultTone: "profesional",
  defaultLanguage: "es",
} as const;

export async function getShopSettings(shop: string) {
  const existing = await prisma.shopSettings.findUnique({ where: { shop } });
  if (existing) return existing;

  return prisma.shopSettings.create({
    data: {
      shop,
      ...DEFAULT_SHOP_SETTINGS,
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
}

export interface ShopQuota {
  plan: Plan;
  planId: PlanId;
  used: number;
  limit: number;
  remaining: number;
  percent: number;
  periodStart: Date;
  tokensIn: number;
  tokensOut: number;
}

export async function getShopQuota(shop: string): Promise<ShopQuota> {
  const settings = await getShopSettings(shop);
  const plan = getPlan(settings.plan);
  const periodStart = currentPeriodStart();

  const [count, tokens] = await Promise.all([
    prisma.generation.count({ where: { shop, createdAt: { gte: periodStart } } }),
    prisma.generation.aggregate({
      where: { shop, createdAt: { gte: periodStart } },
      _sum: { tokensIn: true, tokensOut: true },
    }),
  ]);

  const limit = resolveGenerationLimit(plan, settings.monthlyGenerationLimit);

  return {
    plan,
    planId: plan.id,
    used: count,
    limit,
    remaining: Math.max(0, limit - count),
    percent: limit > 0 ? Math.min(100, Math.round((count / limit) * 100)) : 100,
    periodStart,
    tokensIn: tokens._sum.tokensIn ?? 0,
    tokensOut: tokens._sum.tokensOut ?? 0,
  };
}

export class QuotaExceededError extends Error {
  quota: ShopQuota;
  constructor(quota: ShopQuota) {
    super(
      `Has alcanzado el límite de ${quota.limit} generaciones de tu plan ${quota.plan.name}. Mejora tu plan para seguir generando contenido.`,
    );
    this.name = "QuotaExceededError";
    this.quota = quota;
  }
}

export async function assertQuota(shop: string): Promise<ShopQuota> {
  const quota = await getShopQuota(shop);
  if (quota.remaining <= 0) throw new QuotaExceededError(quota);
  return quota;
}

export function buildAiConfig(settings: {
  aiProvider: string;
  aiModel: string | null;
  aiApiKeyEnc: string | null;
}): AiRuntimeConfig {
  return {
    provider: isProviderId(settings.aiProvider) ? settings.aiProvider : "demo",
    model: settings.aiModel,
    apiKey: decryptSecret(settings.aiApiKeyEnc),
    baseUrl: process.env.AI_BASE_URL || null,
  };
}

export async function updateShopSettings(
  shop: string,
  data: {
    aiProvider?: string;
    aiModel?: string | null;
    apiKey?: string | null;
    defaultTone?: string;
    defaultLanguage?: string;
    defaultKeywords?: string | null;
    brandVoice?: string | null;
    storeDescription?: string | null;
    monthlyGenerationLimit?: number | null;
    onboardedAt?: Date | null;
  },
) {
  await getShopSettings(shop);

  const update: Record<string, unknown> = {
    aiProvider: data.aiProvider,
    aiModel: data.aiModel === "" ? null : data.aiModel,
    defaultTone: data.defaultTone,
    defaultLanguage: data.defaultLanguage,
    defaultKeywords: data.defaultKeywords,
    brandVoice: data.brandVoice,
    storeDescription: data.storeDescription,
    monthlyGenerationLimit: data.monthlyGenerationLimit ?? undefined,
    onboardedAt: data.onboardedAt ?? undefined,
  };

  if (data.apiKey !== undefined && data.apiKey !== null) {
    update.aiApiKeyEnc = data.apiKey.trim() ? encryptSecret(data.apiKey.trim()) : null;
  }

  Object.keys(update).forEach((key) => {
    if (update[key] === undefined) delete update[key];
  });

  return prisma.shopSettings.update({ where: { shop }, data: update });
}

export async function setShopPlan(
  shop: string,
  planId: PlanId,
  options: { subscriptionId?: string | null; status?: string | null } = {},
) {
  await getShopSettings(shop);
  return prisma.shopSettings.update({
    where: { shop },
    data: {
      plan: planId,
      subscriptionId: options.subscriptionId ?? null,
      subscriptionStatus: options.status ?? (planId === "FREE" ? "NONE" : "ACTIVE"),
    },
  });
}

export async function recordGeneration(params: {
  shop: string;
  type: string;
  productId?: string | null;
  productTitle?: string | null;
  provider: string;
  model: string;
  input: unknown;
  output: unknown;
  tokensIn?: number;
  tokensOut?: number;
  shopSettingsId?: string | null;
  applied?: boolean;
}) {
  return prisma.generation.create({
    data: {
      shop: params.shop,
      type: params.type,
      productId: params.productId ?? null,
      productTitle: params.productTitle ?? null,
      provider: params.provider,
      model: params.model,
      inputJson: JSON.stringify(params.input),
      outputJson: JSON.stringify(params.output),
      tokensIn: params.tokensIn ?? 0,
      tokensOut: params.tokensOut ?? 0,
      shopSettingsId: params.shopSettingsId ?? null,
      applied: params.applied ?? false,
    },
  });
}

export async function markGenerationApplied(shop: string, generationId: string) {
  return prisma.generation.updateMany({
    where: { id: generationId, shop },
    data: { applied: true, appliedAt: new Date() },
  });
}

export function safeParseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
