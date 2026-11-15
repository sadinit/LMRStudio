import { AvailabilityStatus, Product, QuantityTier } from '../types/showcase';

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function sortTiers(tiers: QuantityTier[]): QuantityTier[] {
  return [...tiers].sort((a, b) => a.minQty - b.minQty);
}

export function resolveTierForQuantity(
  product: Product,
  quantity: number
): { unitPrice: number; activeTier: QuantityTier | null; savingsPercent: number } {
  const safeQty = Math.max(1, Math.floor(quantity || 1));
  const sorted = sortTiers(product.tiers);

  let matched: QuantityTier | null = null;
  for (const tier of sorted) {
    const withinMin = safeQty >= tier.minQty;
    const withinMax = tier.maxQty === null || safeQty <= tier.maxQty;
    if (withinMin && withinMax) {
      matched = tier;
      break;
    }
  }

  // Fallback to highest applicable minQty if gaps exist
  if (!matched && sorted.length > 0) {
    const eligible = sorted.filter((t) => safeQty >= t.minQty);
    if (eligible.length > 0) {
      matched = eligible[eligible.length - 1];
    }
  }

  const unitPrice = matched ? matched.unitPrice : product.basePrice;
  const savingsPercent =
    product.basePrice > 0 && unitPrice < product.basePrice
      ? Math.round(((product.basePrice - unitPrice) / product.basePrice) * 100)
      : 0;

  return { unitPrice, activeTier: matched, savingsPercent };
}

export function formatTierRange(tier: QuantityTier, unitLabel: string): string {
  if (tier.maxQty === null) {
    return `${tier.minQty}+ ${unitLabel}`;
  }
  if (tier.minQty === tier.maxQty) {
    return `${tier.minQty} ${unitLabel}`;
  }
  return `${tier.minQty}–${tier.maxQty} ${unitLabel}`;
}

export function getLowestTierPrice(product: Product): number {
  if (!product.tiers.length) return product.basePrice;
  return Math.min(product.basePrice, ...product.tiers.map((t) => t.unitPrice));
}

export function availabilityLabel(status: AvailabilityStatus): string {
  switch (status) {
    case 'available':
      return 'Disponibile';
    case 'made-to-order':
      return 'Su ordinazione';
    case 'out-of-stock':
      return 'Esaurito';
  }
}
