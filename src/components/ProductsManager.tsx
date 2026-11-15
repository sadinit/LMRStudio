import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  ImagePlus,
  Lock,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { AvailabilityStatus, LayoutConfig, Product, QuantityTier } from '../types/showcase';
import { compressImageFileToDataUrl } from '../utils/imageHelper';
import { formatCurrency, resolveTierForQuantity, sortTiers } from '../utils/pricing';

interface ProductsManagerProps {
  products: Product[];
  layout: LayoutConfig;
  onChangeProducts: (next: Product[]) => void;
  selectedProductId: string | null;
  onSelectProductId: (id: string | null) => void;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const ProductsManager: React.FC<ProductsManagerProps> = ({
  products,
  layout,
  onChangeProducts,
  selectedProductId,
  onSelectProductId,
}) => {
  const [filterText, setFilterText] = useState('');
  const [testQty, setTestQty] = useState(10);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.order - b.order),
    [products]
  );

  const visibleProducts = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return sortedProducts;
    return sortedProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [sortedProducts, filterText]);

  const activeProduct =
    sortedProducts.find((p) => p.id === selectedProductId) || sortedProducts[0] || null;

  const updateProduct = (id: string, patch: Partial<Product>) => {
    onChangeProducts(
      products.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  };

  const handleCreateProduct = () => {
    const nextOrder =
      products.length > 0 ? Math.max(...products.map((p) => p.order)) + 1 : 0;
    const newProd: Product = {
      id: makeId('prod'),
      sku: `ART-${String(products.length + 1).padStart(2, '0')}`,
      name: 'Nuovo Prodotto',
      category: sortedProducts[0]?.category || 'Catalogo',
      summary: 'Breve descrizione per la scheda vetrina (mantiene l’altezza fissa del layout).',
      description:
        'Descrizione dettagliata del prodotto, materiali, dimensioni e note d’uso per la scheda completa.',
      unitLabel: 'pz',
      basePrice: 25,
      currency: 'EUR',
      tiers: [
        { id: makeId('tier'), minQty: 1, maxQty: 9, unitPrice: 25, label: 'Standard' },
        { id: makeId('tier'), minQty: 10, maxQty: null, unitPrice: 21, label: 'Quantità' },
      ],
      imageUrl: '',
      availability: 'available',
      featured: false,
      order: nextOrder,
    };
    onChangeProducts([...products, newProd]);
    onSelectProductId(newProd.id);
    setAiMessage(null);
  };

  const handleDuplicate = (source: Product) => {
    const nextOrder = Math.max(...products.map((p) => p.order)) + 1;
    const copy: Product = {
      ...source,
      id: makeId('prod'),
      sku: `${source.sku}-COP`,
      name: `${source.name} (Copia)`,
      tiers: source.tiers.map((t) => ({ ...t, id: makeId('tier') })),
      order: nextOrder,
    };
    onChangeProducts([...products, copy]);
    onSelectProductId(copy.id);
  };

  const handleDelete = (id: string) => {
    const remaining = products
      .filter((p) => p.id !== id)
      .sort((a, b) => a.order - b.order)
      .map((p, idx) => ({ ...p, order: idx }));
    onChangeProducts(remaining);
    if (selectedProductId === id) {
      onSelectProductId(remaining[0]?.id || null);
    }
  };

  const moveProduct = (id: string, direction: -1 | 1) => {
    const list = [...sortedProducts];
    const index = list.findIndex((p) => p.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= list.length) return;
    const [item] = list.splice(index, 1);
    list.splice(target, 0, item);
    onChangeProducts(list.map((p, idx) => ({ ...p, order: idx })));
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    productId: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 1100, 0.84);
      updateProduct(productId, { imageUrl: dataUrl });
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Errore caricamento immagine.');
    } finally {
      e.target.value = '';
    }
  };

  const addTier = (product: Product) => {
    const sorted = sortTiers(product.tiers);
    const last = sorted[sorted.length - 1];
    const nextMin = last ? (last.maxQty !== null ? last.maxQty + 1 : last.minQty + 10) : 1;
    const updatedLast =
      last && last.maxQty === null
        ? sorted.map((t, idx) =>
            idx === sorted.length - 1 ? { ...t, maxQty: nextMin - 1 } : t
          )
        : sorted;
    const nextPrice = Number(
      Math.max(0.5, (last ? last.unitPrice : product.basePrice) * 0.85).toFixed(2)
    );
    const newTier: QuantityTier = {
      id: makeId('tier'),
      minQty: nextMin,
      maxQty: null,
      unitPrice: nextPrice,
      label: 'Volume',
    };
    updateProduct(product.id, { tiers: [...updatedLast, newTier] });
  };

  const updateTier = (
    product: Product,
    tierId: string,
    patch: Partial<QuantityTier>
  ) => {
    updateProduct(product.id, {
      tiers: product.tiers.map((t) => (t.id === tierId ? { ...t, ...patch } : t)),
    });
  };

  const removeTier = (product: Product, tierId: string) => {
    updateProduct(product.id, {
      tiers: product.tiers.filter((t) => t.id !== tierId),
    });
  };

  const handleAiCopyAssist = async (product: Product) => {
    setAiBusy(true);
    setAiMessage(null);
    try {
      const res = await fetch('/api/creative-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'product-copy',
          productName: product.name,
          productCategory: product.category,
          productNotes: product.description || product.summary,
          basePrice: product.basePrice,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || 'Assistente AI non disponibile.');
      }
      const payload = (await res.json()) as {
        data: {
          summary: string;
          description: string;
          suggestedTiers?: Array<{
            minQty: number;
            maxQty?: number | null;
            discountPercent: number;
            label: string;
          }>;
        };
      };
      const nextPatch: Partial<Product> = {
        summary: payload.data.summary,
        description: payload.data.description,
      };
      if (
        Array.isArray(payload.data.suggestedTiers) &&
        payload.data.suggestedTiers.length > 0
      ) {
        nextPatch.tiers = payload.data.suggestedTiers.map((t) => ({
          id: makeId('tier'),
          minQty: Math.max(1, t.minQty),
          maxQty: t.maxQty ?? null,
          unitPrice: Number(
            (product.basePrice * (1 - Math.min(60, Math.max(0, t.discountPercent)) / 100)).toFixed(
              2
            )
          ),
          label: t.label,
        }));
      }
      updateProduct(product.id, nextPatch);
      setAiMessage('Testi e scaglioni ottimizzati per rispettare i limiti del layout.');
    } catch (err) {
      // Offline/static fallback refinement
      const cleanSummary = `${product.name}: qualità selezionata per uso ${product.category.toLowerCase()}, disponibile anche a scaglioni.`.slice(
        0,
        96
      );
      updateProduct(product.id, { summary: cleanSummary });
      setAiMessage(
        err instanceof Error
          ? `${err.message} Applicata sintesi compatta locale.`
          : 'Applicata sintesi compatta locale.'
      );
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Layout Stability Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2.5 text-sm text-zinc-700">
          {layout.isLocked ? (
            <>
              <Lock className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>
                <strong>Layout bloccato ({layout.layoutSignature})</strong> — Ogni nuovo prodotto
                o modifica rispetterà automaticamente colonne ({layout.columns}), proporzione foto (
                {layout.imageRatio}) e altezza schede.
              </span>
            </>
          ) : (
            <span>
              Gestisci prodotti, foto e prezzi a scaglioni per quantità. Puoi aggiungere articoli
              sia ora che dopo il blocco del layout.
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleCreateProduct}
          className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuovo Prodotto
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left List */}
        <aside className="rounded-lg border border-zinc-200 bg-white lg:col-span-4">
          <div className="border-b border-zinc-200 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filtra prodotti o SKU..."
                className="w-full rounded-md border border-zinc-200 bg-zinc-50 py-1.5 pl-8 pr-3 text-sm focus:border-zinc-400 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-[680px] divide-y divide-zinc-100 overflow-y-auto">
            {visibleProducts.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500">
                Nessun prodotto in elenco.
              </div>
            ) : (
              visibleProducts.map((p, idx) => {
                const isSelected = activeProduct?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectProductId(p.id);
                      setAiMessage(null);
                    }}
                    className={`flex cursor-pointer items-center gap-3 p-3 transition-colors ${
                      isSelected ? 'bg-zinc-100' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <div className="h-12 w-14 shrink-0 overflow-hidden rounded border border-zinc-200 bg-zinc-100">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-400">
                          <ImagePlus className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-zinc-900">{p.name}</div>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <span className="font-mono tabular-nums">{p.sku}</span>
                        <span>·</span>
                        <span className="font-mono tabular-nums">
                          {formatCurrency(p.basePrice, p.currency)}
                        </span>
                        {p.tiers.length > 0 && (
                          <>
                            <span>·</span>
                            <span>{p.tiers.length} scaglioni</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div
                      className="flex flex-col gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveProduct(p.id, -1)}
                        className="rounded p-1 text-zinc-500 hover:bg-zinc-200 disabled:opacity-30"
                        title="Sposta su"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === visibleProducts.length - 1}
                        onClick={() => moveProduct(p.id, 1)}
                        className="rounded p-1 text-zinc-500 hover:bg-zinc-200 disabled:opacity-30"
                        title="Sposta giù"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Editor */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 lg:col-span-8">
          {!activeProduct ? (
            <div className="py-16 text-center">
              <p className="mb-4 text-sm text-zinc-600">
                Nessun prodotto selezionato. Aggiungi il primo articolo per popolare la vetrina.
              </p>
              <button
                type="button"
                onClick={handleCreateProduct}
                className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                Aggiungi Prodotto
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Editor Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">{activeProduct.name}</h2>
                  <p className="text-xs text-zinc-500">
                    Modifica dati, immagine, descrizione e prezzi a scaglioni per quantità.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={aiBusy}
                    onClick={() => handleAiCopyAssist(activeProduct)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {aiBusy ? 'Elaborazione...' : 'Ottimizza Testi & Scaglioni'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(activeProduct)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Duplica
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(activeProduct.id)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Elimina
                  </button>
                </div>
              </div>

              {aiMessage && (
                <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs text-zinc-700">
                  {aiMessage}
                </div>
              )}

              {/* Basic Fields */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-6">
                  <label className="mb-1 block text-xs font-medium text-zinc-700">
                    Nome Prodotto
                  </label>
                  <input
                    type="text"
                    value={activeProduct.name}
                    onChange={(e) => updateProduct(activeProduct.id, { name: e.target.value })}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-zinc-700">
                    Codice / SKU
                  </label>
                  <input
                    type="text"
                    value={activeProduct.sku}
                    onChange={(e) => updateProduct(activeProduct.id, { sku: e.target.value })}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm focus:border-zinc-900 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-zinc-700">
                    Disponibilità
                  </label>
                  <select
                    value={activeProduct.availability}
                    onChange={(e) =>
                      updateProduct(activeProduct.id, {
                        availability: e.target.value as AvailabilityStatus,
                      })
                    }
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                  >
                    <option value="available">Disponibile</option>
                    <option value="made-to-order">Su ordinazione</option>
                    <option value="out-of-stock">Esaurito</option>
                  </select>
                </div>

                <div className="md:col-span-4">
                  <label className="mb-1 block text-xs font-medium text-zinc-700">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={activeProduct.category}
                    onChange={(e) =>
                      updateProduct(activeProduct.id, { category: e.target.value })
                    }
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="mb-1 block text-xs font-medium text-zinc-700">
                    Prezzo Base (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={activeProduct.basePrice}
                    onChange={(e) =>
                      updateProduct(activeProduct.id, {
                        basePrice: Math.max(0, parseFloat(e.target.value || '0')),
                      })
                    }
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-zinc-900 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="mb-1 block text-xs font-medium text-zinc-700">
                    Unità di Misura (es. pz, set, kg, cf)
                  </label>
                  <input
                    type="text"
                    value={activeProduct.unitLabel}
                    onChange={(e) =>
                      updateProduct(activeProduct.id, { unitLabel: e.target.value })
                    }
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Image Section */}
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-20 shrink-0 overflow-hidden rounded border border-zinc-200 bg-white">
                      {activeProduct.imageUrl ? (
                        <img
                          src={activeProduct.imageUrl}
                          alt={activeProduct.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-400">
                          <ImagePlus className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-zinc-800">
                        Immagine Prodotto (adattata a rapporto fisso {layout.imageRatio})
                      </div>
                      <p className="text-xs text-zinc-500">
                        Carica un file dal computer (ottimizzato automaticamente) oppure incolla un URL.
                      </p>
                    </div>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100">
                    <Upload className="h-3.5 w-3.5" />
                    Carica Foto
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, activeProduct.id)}
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={
                    activeProduct.imageUrl.startsWith('data:')
                      ? ''
                      : activeProduct.imageUrl
                  }
                  onChange={(e) =>
                    updateProduct(activeProduct.id, { imageUrl: e.target.value })
                  }
                  placeholder={
                    activeProduct.imageUrl.startsWith('data:')
                      ? 'Immagine locale caricata (verrà salvata in images/ al commit su GitHub)'
                      : 'Oppure incolla URL immagine (es. ./images/foto.jpg o https://...)'
                  }
                  className="mt-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs focus:border-zinc-900 focus:outline-none"
                />
                {imageError && <p className="mt-1.5 text-xs text-red-600">{imageError}</p>}
              </div>

              {/* Descriptions */}
              <div className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-700">
                      Sintesi Scheda Vetrina
                    </label>
                    <span className="text-xs text-zinc-500 tabular-nums">
                      {activeProduct.summary.length} caratteri · Blocco a {layout.maxSummaryLines}{' '}
                      righe in griglia
                    </span>
                  </div>
                  <input
                    type="text"
                    value={activeProduct.summary}
                    onChange={(e) =>
                      updateProduct(activeProduct.id, { summary: e.target.value })
                    }
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                  />
                  {activeProduct.summary.length > 110 && (
                    <p className="mt-1 text-xs text-amber-700">
                      In griglia la sintesi verrà troncata a {layout.maxSummaryLines} righe per
                      mantenere identica l’altezza di tutte le schede; il testo completo appare nella
                      finestra Dettagli.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700">
                    Descrizione Completa (Scheda Dettaglio Prodotto)
                  </label>
                  <textarea
                    rows={3}
                    value={activeProduct.description}
                    onChange={(e) =>
                      updateProduct(activeProduct.id, { description: e.target.value })
                    }
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Tiered Pricing Editor */}
              <div className="space-y-3 border-t border-zinc-200 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      Prezzi per Quantità (Scaglioni)
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Definisci prezzi unitari decrescenti al crescere delle quantità ordinate.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addTier(activeProduct)}
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Aggiungi Scaglione
                  </button>
                </div>

                {activeProduct.tiers.length === 0 ? (
                  <p className="rounded border border-dashed border-zinc-300 p-4 text-center text-xs text-zinc-500">
                    Nessuno scaglione definito: verrà mostrato solo il prezzo base unitario.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-zinc-200">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="bg-zinc-50 text-zinc-600">
                        <tr>
                          <th className="px-3 py-2 font-medium">Da ({activeProduct.unitLabel})</th>
                          <th className="px-3 py-2 font-medium">
                            A (vuoto = illimitato)
                          </th>
                          <th className="px-3 py-2 font-medium">Prezzo Unitario (€)</th>
                          <th className="px-3 py-2 font-medium">Etichetta Fascia</th>
                          <th className="px-3 py-2 text-right font-medium">Sconto</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {sortTiers(activeProduct.tiers).map((tier) => {
                          const disc =
                            activeProduct.basePrice > 0 && tier.unitPrice < activeProduct.basePrice
                              ? Math.round(
                                  ((activeProduct.basePrice - tier.unitPrice) /
                                    activeProduct.basePrice) *
                                    100
                                )
                              : 0;
                          return (
                            <tr key={tier.id}>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min={1}
                                  value={tier.minQty}
                                  onChange={(e) =>
                                    updateTier(activeProduct, tier.id, {
                                      minQty: Math.max(1, parseInt(e.target.value || '1', 10)),
                                    })
                                  }
                                  className="w-20 rounded border border-zinc-300 px-2 py-1 font-mono tabular-nums"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min={tier.minQty}
                                  value={tier.maxQty ?? ''}
                                  placeholder="∞"
                                  onChange={(e) =>
                                    updateTier(activeProduct, tier.id, {
                                      maxQty:
                                        e.target.value === ''
                                          ? null
                                          : Math.max(tier.minQty, parseInt(e.target.value, 10)),
                                    })
                                  }
                                  className="w-20 rounded border border-zinc-300 px-2 py-1 font-mono tabular-nums"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={tier.unitPrice}
                                  onChange={(e) =>
                                    updateTier(activeProduct, tier.id, {
                                      unitPrice: Math.max(0, parseFloat(e.target.value || '0')),
                                    })
                                  }
                                  className="w-24 rounded border border-zinc-300 px-2 py-1 font-mono tabular-nums"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={tier.label || ''}
                                  onChange={(e) =>
                                    updateTier(activeProduct, tier.id, { label: e.target.value })
                                  }
                                  placeholder="Es. Rivenditori"
                                  className="w-32 rounded border border-zinc-300 px-2 py-1"
                                />
                              </td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums text-emerald-700">
                                {disc > 0 ? `-${disc}%` : '—'}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeTier(activeProduct, tier.id)}
                                  className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                                  aria-label="Rimuovi scaglione"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Quick Tier Simulator */}
                {(() => {
                  const sim = resolveTierForQuantity(activeProduct, testQty);
                  return (
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-700">Simula quantità cliente:</span>
                        <input
                          type="number"
                          min={1}
                          value={testQty}
                          onChange={(e) =>
                            setTestQty(Math.max(1, parseInt(e.target.value || '1', 10)))
                          }
                          className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 font-mono tabular-nums"
                        />
                        <span className="text-zinc-500">{activeProduct.unitLabel}</span>
                      </div>
                      <div className="flex items-center gap-4 font-mono tabular-nums">
                        <span className="text-zinc-600">
                          Unitario:{' '}
                          <strong className="text-zinc-900">
                            {formatCurrency(sim.unitPrice, activeProduct.currency)}
                          </strong>
                        </span>
                        <span className="text-zinc-900 font-semibold">
                          Totale: {formatCurrency(sim.unitPrice * testQty, activeProduct.currency)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
