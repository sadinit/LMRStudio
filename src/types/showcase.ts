export type ThemePresetId =
  | 'editorial-warm'
  | 'architectural-clean'
  | 'industrial-mono'
  | 'bottega-moderna';

export type ImageRatio = '4:3' | '1:1' | '3:4';
export type HeroStyle = 'split' | 'centered' | 'compact';
export type CardDensity = 'airy' | 'balanced' | 'compact';
export type TierDisplayMode = 'table' | 'selector' | 'detail-only';
export type AvailabilityStatus = 'available' | 'made-to-order' | 'out-of-stock';

export interface QuantityTier {
  id: string;
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
  label?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  summary: string;
  description: string;
  unitLabel: string;
  basePrice: number;
  currency: string;
  tiers: QuantityTier[];
  imageUrl: string;
  availability: AvailabilityStatus;
  featured: boolean;
  order: number;
}

export interface LayoutConfig {
  isLocked: boolean;
  lockedAt: string | null;
  layoutSignature: string;
  presetId: ThemePresetId;
  columns: 2 | 3 | 4;
  imageRatio: ImageRatio;
  heroStyle: HeroStyle;
  cardDensity: CardDensity;
  maxSummaryLines: 2 | 3;
  tierDisplay: TierDisplayMode;
  itemsPerPage: 6 | 9 | 12;
  showSku: boolean;
  showCategory: boolean;
  showAvailability: boolean;
  showSearchAndFilter: boolean;
}

export interface BrandConfig {
  brandName: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  craftNoteTitle: string;
  craftNoteBody: string;
  contactEmail: string;
  whatsappNumber: string;
  footerNote: string;
}

export interface ShowcaseDocument {
  version: number;
  updatedAt: string;
  brand: BrandConfig;
  layout: LayoutConfig;
  products: Product[];
}

export interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  htmlPath: string;
  dataPath: string;
  token: string;
  rememberTokenLocally: boolean;
  lastSyncedAt: string | null;
  lastCommitSha: string | null;
}

export interface ThemePresetDefinition {
  id: ThemePresetId;
  name: string;
  subtitle: string;
  audience: string;
  displayFont: string;
  bodyFont: string;
  monoFont: string;
  isDark: boolean;
  colors: {
    canvas: string;
    surface: string;
    surfaceMuted: string;
    border: string;
    ink: string;
    inkMuted: string;
    accent: string;
    accentText: string;
  };
  radiusCard: string;
  radiusButton: string;
}

export interface CreativeLayoutProposal {
  presetId: ThemePresetId;
  columns: 2 | 3 | 4;
  imageRatio: ImageRatio;
  heroStyle: HeroStyle;
  cardDensity: CardDensity;
  maxSummaryLines: 2 | 3;
  tierDisplay: TierDisplayMode;
  itemsPerPage: 6 | 9 | 12;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  craftNoteTitle: string;
  craftNoteBody: string;
  designRationale: string;
}

export interface QuoteItem {
  productId: string;
  quantity: number;
}
