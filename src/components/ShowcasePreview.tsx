import React, { useMemo, useState } from 'react';
import {
  ImageOff,
  Lock,
  Mail,
  Monitor,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Smartphone,
  Tablet,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import { THEME_PRESETS } from '../data/presets';
import { Product, QuoteItem, ShowcaseDocument } from '../types/showcase';
import {
  availabilityLabel,
  formatCurrency,
  formatTierRange,
  getLowestTierPrice,
  resolveTierForQuantity,
  sortTiers,
} from '../utils/pricing';

interface ShowcasePreviewProps {
  doc: ShowcaseDocument;
  onGoToLayout?: () => void;
  onEditProduct?: (productId: string) => void;
}

type ViewportWidth = 'desktop' | 'tablet' | 'mobile';

function ResilientImage({
  src,
  alt,
  className,
  fallbackBg,
  fallbackInk,
}: {
  src?: string;
  alt: string;
  className?: string;
  fallbackBg: string;
  fallbackInk: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 p-6 text-center ${className || ''}`}
        style={{ backgroundColor: fallbackBg, color: fallbackInk }}
      >
        <ImageOff className="h-6 w-6 opacity-50" />
        <span className="text-xs opacity-70">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export const ShowcasePreview: React.FC<ShowcasePreviewProps> = ({
  doc,
  onGoToLayout,
  onEditProduct,
}) => {
  const preset = THEME_PRESETS[doc.layout.presetId];
  const [viewport, setViewport] = useState<ViewportWidth>('desktop');
  const [activeCategory, setActiveCategory] = useState<string>('Tutte');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalQty, setModalQty] = useState<number>(1);
  const [cardQuantities, setCardQuantities] = useState<Record<string, number>>({});
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [quoteOpen, setQuoteOpen] = useState<boolean>(false);

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(doc.products.map((p) => p.category.trim()).filter(Boolean))
    );
    return ['Tutte', ...unique];
  }, [doc.products]);

  const filteredProducts = useMemo(() => {
    const sorted = [...doc.products].sort((a, b) => a.order - b.order);
    return sorted.filter((p) => {
      const catMatch = activeCategory === 'Tutte' || p.category === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      const textMatch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q);
      return catMatch && textMatch;
    });
  }, [doc.products, activeCategory, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / doc.layout.itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageProducts = useMemo(() => {
    const start = (safePage - 1) * doc.layout.itemsPerPage;
    return filteredProducts.slice(start, start + doc.layout.itemsPerPage);
  }, [filteredProducts, safePage, doc.layout.itemsPerPage]);

  const aspectClass =
    doc.layout.imageRatio === '4:3'
      ? 'aspect-[4/3]'
      : doc.layout.imageRatio === '1:1'
        ? 'aspect-square'
        : 'aspect-[3/4]';

  const gridColumnsClass =
    viewport === 'mobile'
      ? 'grid-cols-1'
      : viewport === 'tablet'
        ? 'grid-cols-2'
        : doc.layout.columns === 2
          ? 'grid-cols-1 md:grid-cols-2'
          : doc.layout.columns === 4
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  const gapClass =
    doc.layout.cardDensity === 'airy'
      ? 'gap-8'
      : doc.layout.cardDensity === 'compact'
        ? 'gap-4'
        : 'gap-6';

  const cardPadClass =
    doc.layout.cardDensity === 'airy'
      ? 'p-6'
      : doc.layout.cardDensity === 'compact'
        ? 'p-4'
        : 'p-5';

  const totalQuoteCount = quoteItems.reduce((sum, item) => sum + item.quantity, 0);

  const addToQuote = (product: Product, qty: number) => {
    const cleanQty = Math.max(1, Math.floor(qty || 1));
    setQuoteItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + cleanQty } : i
        );
      }
      return [...prev, { productId: product.id, quantity: cleanQty }];
    });
  };

  const frameWidthClass =
    viewport === 'mobile'
      ? 'max-w-[390px] mx-auto border-x shadow-sm'
      : viewport === 'tablet'
        ? 'max-w-[820px] mx-auto border-x shadow-sm'
        : 'w-full';

  return (
    <div className="space-y-4">
      {/* Studio Preview Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-3 text-sm">
          {doc.layout.isLocked ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-800">
              <Lock className="h-4 w-4" />
              Layout bloccato e stabile
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium text-amber-800">
              <Unlock className="h-4 w-4" />
              Layout in bozza modificabile
            </span>
          )}
          <span className="text-zinc-300" aria-hidden="true">
            ·
          </span>
          <span className="font-mono text-xs text-zinc-500 tabular-nums">
            {doc.layout.layoutSignature}
          </span>
          <span className="hidden text-xs text-zinc-500 sm:inline">
            ({doc.layout.columns} col · {doc.layout.imageRatio} · {doc.layout.itemsPerPage}/pag)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              title="Vista Desktop"
              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                viewport === 'desktop'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setViewport('tablet')}
              title="Vista Tablet"
              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                viewport === 'tablet'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Tablet className="h-3.5 w-3.5" />
              Tablet
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              title="Vista Mobile"
              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                viewport === 'mobile'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              Mobile
            </button>
          </div>

          {onGoToLayout && (
            <button
              type="button"
              onClick={onGoToLayout}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-50 whitespace-nowrap"
            >
              {doc.layout.isLocked ? 'Dettagli Blocco' : 'Impagina & Blocca'}
            </button>
          )}
        </div>
      </div>

      {/* Live Storefront Viewport */}
      <div
        className={`overflow-hidden rounded-lg border border-zinc-200 transition-all ${frameWidthClass}`}
        style={{
          backgroundColor: preset.colors.canvas,
          color: preset.colors.ink,
          fontFamily: preset.bodyFont,
          borderColor: preset.colors.border,
        }}
      >
        {/* Storefront 3-Zone Top Bar */}
        <header
          className="border-b px-6 py-4"
          style={{ borderColor: preset.colors.border, backgroundColor: preset.colors.canvas }}
        >
          <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-8">
            <span
              className="text-xl font-semibold whitespace-nowrap shrink-0"
              style={{ fontFamily: preset.displayFont }}
            >
              {doc.brand.brandName}
            </span>

            {viewport !== 'mobile' && (
              <nav
                className="hidden items-center gap-6 text-sm font-medium md:flex"
                style={{ color: preset.colors.inkMuted }}
              >
                <a href="#preview-catalogo" className="hover:opacity-80 whitespace-nowrap">
                  Catalogo
                </a>
                <a href="#preview-forniture" className="hover:opacity-80 whitespace-nowrap">
                  Forniture
                </a>
                <a href="#preview-contatti" className="hover:opacity-80 whitespace-nowrap">
                  Contatti
                </a>
              </nav>
            )}

            <button
              type="button"
              onClick={() => setQuoteOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90 whitespace-nowrap shrink-0"
              style={{
                backgroundColor: preset.colors.accent,
                color: preset.colors.accentText,
                borderRadius: preset.radiusButton,
              }}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Richiesta ({totalQuoteCount})
            </button>
          </div>
        </header>

        {/* Storefront Hero */}
        <section
          className="border-b px-6 py-10 md:py-14"
          style={{ borderColor: preset.colors.border }}
        >
          <div className="mx-auto max-w-[1180px]">
            {doc.layout.heroStyle === 'split' && (
              <div
                className={`grid gap-8 items-stretch ${
                  viewport === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'
                }`}
              >
                <div className="flex flex-col justify-center lg:col-span-6">
                  <p
                    className="mb-3 text-xs font-semibold tracking-wider uppercase"
                    style={{ color: preset.colors.inkMuted }}
                  >
                    {doc.brand.heroEyebrow}
                  </p>
                  <h1
                    className="mb-4 text-3xl font-semibold leading-tight text-balance md:text-5xl"
                    style={{ fontFamily: preset.displayFont }}
                  >
                    {doc.brand.heroTitle}
                  </h1>
                  <p
                    className="mb-6 max-w-xl text-base leading-relaxed"
                    style={{ color: preset.colors.inkMuted }}
                  >
                    {doc.brand.heroSubtitle}
                  </p>
                  <div>
                    <a
                      href="#preview-catalogo"
                      className="inline-block px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
                      style={{
                        backgroundColor: preset.colors.accent,
                        color: preset.colors.accentText,
                        borderRadius: preset.radiusButton,
                      }}
                    >
                      Esplora il Catalogo
                    </a>
                  </div>
                </div>
                <div
                  className="overflow-hidden border lg:col-span-6 min-h-[260px]"
                  style={{
                    borderColor: preset.colors.border,
                    borderRadius: preset.radiusCard,
                    backgroundColor: preset.colors.surfaceMuted,
                  }}
                >
                  <ResilientImage
                    src={doc.brand.heroImageUrl}
                    alt={doc.brand.brandName}
                    className="h-full w-full object-cover"
                    fallbackBg={preset.colors.surfaceMuted}
                    fallbackInk={preset.colors.inkMuted}
                  />
                </div>
              </div>
            )}

            {doc.layout.heroStyle === 'centered' && (
              <div className="mx-auto max-w-2xl text-center">
                <p
                  className="mb-3 text-xs font-semibold tracking-wider uppercase"
                  style={{ color: preset.colors.inkMuted }}
                >
                  {doc.brand.heroEyebrow}
                </p>
                <h1
                  className="mb-4 text-3xl font-semibold leading-tight text-balance md:text-5xl"
                  style={{ fontFamily: preset.displayFont }}
                >
                  {doc.brand.heroTitle}
                </h1>
                <p
                  className="mx-auto mb-6 max-w-xl text-base leading-relaxed"
                  style={{ color: preset.colors.inkMuted }}
                >
                  {doc.brand.heroSubtitle}
                </p>
                <a
                  href="#preview-catalogo"
                  className="inline-block px-5 py-2.5 text-sm font-semibold"
                  style={{
                    backgroundColor: preset.colors.accent,
                    color: preset.colors.accentText,
                    borderRadius: preset.radiusButton,
                  }}
                >
                  Esplora il Catalogo
                </a>
              </div>
            )}

            {doc.layout.heroStyle === 'compact' && (
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div className="max-w-2xl">
                  <p
                    className="mb-2 text-xs font-semibold tracking-wider uppercase"
                    style={{ color: preset.colors.inkMuted }}
                  >
                    {doc.brand.heroEyebrow}
                  </p>
                  <h1
                    className="mb-2 text-3xl font-semibold leading-tight text-balance md:text-4xl"
                    style={{ fontFamily: preset.displayFont }}
                  >
                    {doc.brand.heroTitle}
                  </h1>
                  <p className="text-sm leading-relaxed" style={{ color: preset.colors.inkMuted }}>
                    {doc.brand.heroSubtitle}
                  </p>
                </div>
                <a
                  href="#preview-catalogo"
                  className="px-4 py-2.5 text-sm font-semibold whitespace-nowrap"
                  style={{
                    backgroundColor: preset.colors.accent,
                    color: preset.colors.accentText,
                    borderRadius: preset.radiusButton,
                  }}
                >
                  Vai ai Prodotti
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Catalog Section */}
        <section id="preview-catalogo" className="mx-auto max-w-[1180px] px-6 py-10">
          {doc.layout.showSearchAndFilter && (
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1.5">
                {categories.map((cat) => {
                  const isActive = cat === activeCategory;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setActiveCategory(cat);
                        setCurrentPage(1);
                      }}
                      className="border px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap"
                      style={{
                        borderRadius: preset.radiusButton,
                        borderColor: isActive ? preset.colors.ink : preset.colors.border,
                        backgroundColor: isActive ? preset.colors.ink : 'transparent',
                        color: isActive ? preset.colors.canvas : preset.colors.inkMuted,
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              <div className="relative min-w-[230px]">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                  style={{ color: preset.colors.inkMuted }}
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Cerca prodotto o SKU..."
                  className="w-full border py-1.5 pl-8 pr-3 text-sm focus:outline-none"
                  style={{
                    borderRadius: preset.radiusButton,
                    borderColor: preset.colors.border,
                    backgroundColor: preset.colors.surface,
                    color: preset.colors.ink,
                  }}
                />
              </div>
            </div>
          )}

          {pageProducts.length === 0 ? (
            <div
              className="rounded border p-10 text-center"
              style={{
                borderColor: preset.colors.border,
                backgroundColor: preset.colors.surface,
              }}
            >
              <Package className="mx-auto mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm font-medium">Nessun prodotto corrisponde ai filtri attuali.</p>
            </div>
          ) : (
            <div className={`grid ${gridColumnsClass} ${gapClass} items-stretch`}>
              {pageProducts.map((product) => {
                const sortedTiers = sortTiers(product.tiers);
                const cardQty = cardQuantities[product.id] ?? 1;
                const resolved = resolveTierForQuantity(product, cardQty);
                const lowestPrice = getLowestTierPrice(product);

                return (
                  <article
                    key={product.id}
                    className="flex h-full flex-col overflow-hidden border transition-transform duration-200 hover:-translate-y-0.5"
                    style={{
                      backgroundColor: preset.colors.surface,
                      borderColor: preset.colors.border,
                      borderRadius: preset.radiusCard,
                    }}
                  >
                    <div
                      className={`relative w-full overflow-hidden border-b ${aspectClass}`}
                      style={{
                        borderColor: preset.colors.border,
                        backgroundColor: preset.colors.surfaceMuted,
                      }}
                    >
                      <ResilientImage
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        fallbackBg={preset.colors.surfaceMuted}
                        fallbackInk={preset.colors.inkMuted}
                      />
                    </div>

                    <div className={`flex flex-1 flex-col ${cardPadClass}`}>
                      {(doc.layout.showCategory ||
                        doc.layout.showSku ||
                        doc.layout.showAvailability) && (
                        <div
                          className="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs"
                          style={{ color: preset.colors.inkMuted }}
                        >
                          {doc.layout.showCategory && <span>{product.category}</span>}
                          {doc.layout.showCategory && doc.layout.showSku && (
                            <span aria-hidden="true">·</span>
                          )}
                          {doc.layout.showSku && (
                            <span style={{ fontFamily: preset.monoFont }}>{product.sku}</span>
                          )}
                          {(doc.layout.showCategory || doc.layout.showSku) &&
                            doc.layout.showAvailability && <span aria-hidden="true">·</span>}
                          {doc.layout.showAvailability && (
                            <span>{availabilityLabel(product.availability)}</span>
                          )}
                        </div>
                      )}

                      <h3
                        className="mb-1.5 line-clamp-2 text-lg font-semibold leading-snug"
                        style={{ fontFamily: preset.displayFont }}
                      >
                        {product.name}
                      </h3>

                      <p
                        className={`mb-4 text-sm leading-relaxed ${
                          doc.layout.maxSummaryLines === 2
                            ? 'line-clamp-2 min-h-[2.75rem]'
                            : 'line-clamp-3 min-h-[4.125rem]'
                        }`}
                        style={{ color: preset.colors.inkMuted }}
                      >
                        {product.summary}
                      </p>

                      <div
                        className="mt-auto border-t pt-3"
                        style={{ borderColor: preset.colors.border }}
                      >
                        <div className="mb-2 flex items-baseline justify-between gap-2">
                          <span className="text-xs" style={{ color: preset.colors.inkMuted }}>
                            Prezzo base
                          </span>
                          <div className="tabular-nums font-semibold">
                            <span className="text-base" style={{ fontFamily: preset.monoFont }}>
                              {formatCurrency(product.basePrice, product.currency)}
                            </span>
                            <span
                              className="ml-1 text-xs font-normal"
                              style={{ color: preset.colors.inkMuted }}
                            >
                              / {product.unitLabel}
                            </span>
                          </div>
                        </div>

                        {doc.layout.tierDisplay === 'table' && sortedTiers.length > 0 && (
                          <table className="mb-3 w-full border-collapse text-xs">
                            <tbody>
                              {sortedTiers.slice(0, 3).map((tier) => (
                                <tr
                                  key={tier.id}
                                  className="border-b border-dashed last:border-b-0"
                                  style={{ borderColor: preset.colors.border }}
                                >
                                  <td className="py-1" style={{ color: preset.colors.inkMuted }}>
                                    {formatTierRange(tier, product.unitLabel)}
                                  </td>
                                  <td
                                    className="py-1 text-right font-semibold tabular-nums"
                                    style={{ fontFamily: preset.monoFont }}
                                  >
                                    {formatCurrency(tier.unitPrice, product.currency)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}

                        {doc.layout.tierDisplay === 'selector' && (
                          <div
                            className="mb-3 rounded border p-2"
                            style={{
                              borderColor: preset.colors.border,
                              backgroundColor: preset.colors.surfaceMuted,
                            }}
                          >
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <label htmlFor={`qty-${product.id}`}>Qtà ({product.unitLabel}):</label>
                              <input
                                id={`qty-${product.id}`}
                                type="number"
                                min={1}
                                value={cardQty}
                                onChange={(e) =>
                                  setCardQuantities((prev) => ({
                                    ...prev,
                                    [product.id]: Math.max(1, parseInt(e.target.value || '1', 10)),
                                  }))
                                }
                                className="w-16 rounded border px-1.5 py-0.5 text-center text-xs tabular-nums"
                                style={{
                                  borderColor: preset.colors.border,
                                  backgroundColor: preset.colors.surface,
                                  fontFamily: preset.monoFont,
                                }}
                              />
                            </div>
                            <div className="mt-1.5 flex items-baseline justify-between text-xs">
                              <span style={{ color: preset.colors.inkMuted }}>
                                {resolved.savingsPercent > 0
                                  ? `Sconto -${resolved.savingsPercent}%`
                                  : `Da ${formatCurrency(lowestPrice, product.currency)}`}
                              </span>
                              <span
                                className="font-semibold tabular-nums"
                                style={{ fontFamily: preset.monoFont }}
                              >
                                {formatCurrency(resolved.unitPrice * cardQty, product.currency)}
                              </span>
                            </div>
                          </div>
                        )}

                        {doc.layout.tierDisplay === 'detail-only' && sortedTiers.length > 0 && (
                          <p
                            className="mb-3 text-xs tabular-nums"
                            style={{ color: preset.colors.inkMuted }}
                          >
                            Listino a volume da{' '}
                            <strong style={{ color: preset.colors.ink }}>
                              {formatCurrency(lowestPrice, product.currency)}
                            </strong>{' '}
                            / {product.unitLabel}
                          </p>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProduct(product);
                              setModalQty(cardQty);
                            }}
                            className="flex-1 border px-3 py-2 text-xs font-medium transition-opacity hover:opacity-80"
                            style={{
                              borderColor: preset.colors.border,
                              borderRadius: preset.radiusButton,
                            }}
                          >
                            Dettagli e Quantità
                          </button>
                          {onEditProduct && (
                            <button
                              type="button"
                              onClick={() => onEditProduct(product.id)}
                              className="border px-2.5 py-2 text-xs transition-opacity hover:opacity-80"
                              style={{
                                borderColor: preset.colors.border,
                                borderRadius: preset.radiusButton,
                                color: preset.colors.inkMuted,
                              }}
                            >
                              Modifica
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Deterministic Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => {
                const isActive = pageNum === safePage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className="h-9 min-w-9 border px-3 text-xs font-semibold tabular-nums"
                    style={{
                      borderRadius: preset.radiusButton,
                      borderColor: isActive ? preset.colors.ink : preset.colors.border,
                      backgroundColor: isActive ? preset.colors.ink : 'transparent',
                      color: isActive ? preset.colors.canvas : preset.colors.ink,
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Craftsmanship / Supply Conditions */}
        <section
          id="preview-forniture"
          className="border-t px-6 py-10"
          style={{ borderColor: preset.colors.border }}
        >
          <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-6 md:grid-cols-12">
            <div className="md:col-span-5">
              <h2
                className="text-2xl font-semibold text-balance"
                style={{ fontFamily: preset.displayFont }}
              >
                {doc.brand.craftNoteTitle}
              </h2>
            </div>
            <div className="md:col-span-7">
              <p className="text-sm leading-relaxed" style={{ color: preset.colors.inkMuted }}>
                {doc.brand.craftNoteBody}
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer
          id="preview-contatti"
          className="border-t px-6 py-6 text-xs"
          style={{
            borderColor: preset.colors.border,
            color: preset.colors.inkMuted,
          }}
        >
          <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4">
            <span>{doc.brand.footerNote || doc.brand.brandName}</span>
            <span>
              {doc.brand.contactEmail}
              {doc.brand.whatsappNumber ? ` · ${doc.brand.whatsappNumber}` : ''}
            </span>
          </div>
        </footer>
      </div>

      {/* Product Detail + Quantity Calculator Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div
            className="grid max-h-[90vh] w-full max-w-3xl grid-cols-1 overflow-y-auto border shadow-2xl md:grid-cols-2"
            style={{
              backgroundColor: preset.colors.surface,
              color: preset.colors.ink,
              borderColor: preset.colors.border,
              borderRadius: preset.radiusCard,
              fontFamily: preset.bodyFont,
            }}
          >
            <div
              className="min-h-[260px]"
              style={{ backgroundColor: preset.colors.surfaceMuted }}
            >
              <ResilientImage
                src={selectedProduct.imageUrl}
                alt={selectedProduct.name}
                className="h-full w-full object-cover"
                fallbackBg={preset.colors.surfaceMuted}
                fallbackInk={preset.colors.inkMuted}
              />
            </div>
            <div className="flex flex-col gap-4 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs" style={{ color: preset.colors.inkMuted }}>
                    {selectedProduct.category} ·{' '}
                    <span style={{ fontFamily: preset.monoFont }}>{selectedProduct.sku}</span>
                  </div>
                  <h3
                    className="mt-1 text-2xl font-semibold leading-tight"
                    style={{ fontFamily: preset.displayFont }}
                  >
                    {selectedProduct.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="rounded border p-1.5 hover:opacity-75"
                  style={{ borderColor: preset.colors.border }}
                  aria-label="Chiudi scheda prodotto"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-sm leading-relaxed" style={{ color: preset.colors.inkMuted }}>
                {selectedProduct.description}
              </p>

              {selectedProduct.tiers.length > 0 && (
                <div>
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide">
                    Scaglioni Prezzo per Quantità
                  </div>
                  <table className="w-full border-collapse text-xs">
                    <tbody>
                      {sortTiers(selectedProduct.tiers).map((tier) => {
                        const res = resolveTierForQuantity(selectedProduct, modalQty);
                        const active = res.activeTier?.id === tier.id;
                        return (
                          <tr
                            key={tier.id}
                            onClick={() => setModalQty(tier.minQty)}
                            className="cursor-pointer border-b border-dashed"
                            style={{
                              borderColor: preset.colors.border,
                              color: active ? preset.colors.accent : preset.colors.ink,
                              fontWeight: active ? 600 : 400,
                            }}
                          >
                            <td className="py-1.5">
                              {formatTierRange(tier, selectedProduct.unitLabel)}
                              {tier.label ? ` · ${tier.label}` : ''}
                            </td>
                            <td
                              className="py-1.5 text-right tabular-nums"
                              style={{ fontFamily: preset.monoFont }}
                            >
                              {formatCurrency(tier.unitPrice, selectedProduct.currency)} /{' '}
                              {selectedProduct.unitLabel}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {(() => {
                const calc = resolveTierForQuantity(selectedProduct, modalQty);
                return (
                  <div
                    className="mt-auto rounded border p-3.5"
                    style={{
                      borderColor: preset.colors.border,
                      backgroundColor: preset.colors.surfaceMuted,
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <label htmlFor="detail-modal-qty" className="text-xs font-medium">
                        Quantità ({selectedProduct.unitLabel})
                      </label>
                      <input
                        id="detail-modal-qty"
                        type="number"
                        min={1}
                        value={modalQty}
                        onChange={(e) =>
                          setModalQty(Math.max(1, parseInt(e.target.value || '1', 10)))
                        }
                        className="w-20 rounded border px-2 py-1 text-center text-sm tabular-nums"
                        style={{
                          borderColor: preset.colors.border,
                          backgroundColor: preset.colors.surface,
                          fontFamily: preset.monoFont,
                        }}
                      />
                    </div>
                    <div className="mt-2.5 flex items-baseline justify-between">
                      <span className="text-xs" style={{ color: preset.colors.inkMuted }}>
                        Unitario:{' '}
                        <span className="tabular-nums" style={{ fontFamily: preset.monoFont }}>
                          {formatCurrency(calc.unitPrice, selectedProduct.currency)}
                        </span>
                        {calc.savingsPercent > 0 ? ` (-${calc.savingsPercent}%)` : ''}
                      </span>
                      <span
                        className="text-lg font-bold tabular-nums"
                        style={{ fontFamily: preset.monoFont }}
                      >
                        {formatCurrency(calc.unitPrice * modalQty, selectedProduct.currency)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <button
                type="button"
                onClick={() => {
                  addToQuote(selectedProduct, modalQty);
                  setSelectedProduct(null);
                  setQuoteOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold"
                style={{
                  backgroundColor: preset.colors.accent,
                  color: preset.colors.accentText,
                  borderRadius: preset.radiusButton,
                }}
              >
                <Plus className="h-4 w-4" />
                Aggiungi alla Richiesta Ordine
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quote Summary Drawer / Modal */}
      {quoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div
            className="w-full max-w-lg border p-6 shadow-2xl"
            style={{
              backgroundColor: preset.colors.surface,
              color: preset.colors.ink,
              borderColor: preset.colors.border,
              borderRadius: preset.radiusCard,
              fontFamily: preset.bodyFont,
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold" style={{ fontFamily: preset.displayFont }}>
                Riepilogo Richiesta Ordine
              </h3>
              <button
                type="button"
                onClick={() => setQuoteOpen(false)}
                className="rounded border p-1.5"
                style={{ borderColor: preset.colors.border }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {quoteItems.length === 0 ? (
              <p className="py-6 text-sm" style={{ color: preset.colors.inkMuted }}>
                La lista richiesta è vuota. Apri qualsiasi articolo per calcolare il prezzo in base
                alla quantità.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="divide-y" style={{ borderColor: preset.colors.border }}>
                  {quoteItems.map((item) => {
                    const p = doc.products.find((x) => x.id === item.productId);
                    if (!p) return null;
                    const calc = resolveTierForQuantity(p, item.quantity);
                    return (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between gap-3 py-3 text-sm"
                      >
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs" style={{ color: preset.colors.inkMuted }}>
                            {item.quantity} {p.unitLabel} ×{' '}
                            {formatCurrency(calc.unitPrice, p.currency)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className="font-semibold tabular-nums"
                            style={{ fontFamily: preset.monoFont }}
                          >
                            {formatCurrency(calc.unitPrice * item.quantity, p.currency)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setQuoteItems((prev) =>
                                prev.filter((x) => x.productId !== item.productId)
                              )
                            }
                            className="opacity-60 hover:opacity-100"
                            aria-label="Rimuovi articolo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div
                  className="flex items-baseline justify-between border-t pt-3"
                  style={{ borderColor: preset.colors.border }}
                >
                  <span className="text-sm font-medium">Totale stimato</span>
                  <span
                    className="text-xl font-bold tabular-nums"
                    style={{ fontFamily: preset.monoFont }}
                  >
                    {formatCurrency(
                      quoteItems.reduce((sum, item) => {
                        const p = doc.products.find((x) => x.id === item.productId);
                        if (!p) return sum;
                        return sum + resolveTierForQuantity(p, item.quantity).unitPrice * item.quantity;
                      }, 0),
                      'EUR'
                    )}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <a
                    href={`mailto:${encodeURIComponent(doc.brand.contactEmail)}?subject=${encodeURIComponent(`Richiesta ordine — ${doc.brand.brandName}`)}`}
                    className="inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold"
                    style={{
                      backgroundColor: preset.colors.accent,
                      color: preset.colors.accentText,
                      borderRadius: preset.radiusButton,
                    }}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Invia via Email
                  </a>
                  <button
                    type="button"
                    onClick={() => setQuoteItems([])}
                    className="border px-4 py-2.5 text-xs font-medium"
                    style={{
                      borderColor: preset.colors.border,
                      borderRadius: preset.radiusButton,
                    }}
                  >
                    Svuota
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
