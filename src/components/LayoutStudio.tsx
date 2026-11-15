import React, { useState } from 'react';
import {
  Check,
  Lock,
  ShieldCheck,
  Sparkles,
  Unlock,
  Upload,
} from 'lucide-react';
import {
  buildLocalCreativeProposal,
  computeLayoutSignature,
  THEME_PRESETS,
} from '../data/presets';
import {
  BrandConfig,
  CardDensity,
  CreativeLayoutProposal,
  HeroStyle,
  ImageRatio,
  LayoutConfig,
  ThemePresetId,
  TierDisplayMode,
} from '../types/showcase';
import { compressImageFileToDataUrl } from '../utils/imageHelper';

interface LayoutStudioProps {
  layout: LayoutConfig;
  brand: BrandConfig;
  onChangeLayout: (next: LayoutConfig) => void;
  onChangeBrand: (next: BrandConfig) => void;
  onPreviewShowcase: () => void;
}

export const LayoutStudio: React.FC<LayoutStudioProps> = ({
  layout,
  brand,
  onChangeLayout,
  onChangeBrand,
  onPreviewShowcase,
}) => {
  const [creativeBrief, setCreativeBrief] = useState(
    'Oggetti artigianali per casa e ristorazione, vendiamo sia al dettaglio che a lotti per locali e architetti. Cerchiamo un’impaginazione ordinata, calda ed editoriale.'
  );
  const [aiBusy, setAiBusy] = useState(false);
  const [proposal, setProposal] = useState<CreativeLayoutProposal | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [unlockConfirmOpen, setUnlockConfirmOpen] = useState(false);

  const patchLayout = (patch: Partial<LayoutConfig>) => {
    if (layout.isLocked) return;
    const merged: LayoutConfig = {
      ...layout,
      ...patch,
    };
    merged.layoutSignature = computeLayoutSignature(merged);
    onChangeLayout(merged);
  };

  const lockLayoutNow = () => {
    const sig = computeLayoutSignature(layout);
    onChangeLayout({
      ...layout,
      isLocked: true,
      lockedAt: new Date().toISOString(),
      layoutSignature: sig,
    });
  };

  const unlockLayoutConfirmed = () => {
    onChangeLayout({
      ...layout,
      isLocked: false,
    });
    setUnlockConfirmOpen(false);
  };

  const handleGenerateProposal = async () => {
    setAiBusy(true);
    setAiNote(null);
    try {
      const res = await fetch('/api/creative-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'layout',
          brandName: brand.brandName,
          brandDescription: creativeBrief,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || 'Assistente AI offline');
      }
      const payload = (await res.json()) as { data: CreativeLayoutProposal };
      setProposal(payload.data);
    } catch {
      const fallback = buildLocalCreativeProposal(creativeBrief, brand.brandName);
      setProposal(fallback);
      setAiNote(
        'Proposta generata tramite motore di direzione artistica integrato (pronto anche su GitHub Pages senza server).'
      );
    } finally {
      setAiBusy(false);
    }
  };

  const applyProposal = (prop: CreativeLayoutProposal) => {
    if (layout.isLocked) return;
    const nextLayout: LayoutConfig = {
      ...layout,
      presetId: THEME_PRESETS[prop.presetId] ? prop.presetId : 'editorial-warm',
      columns: prop.columns === 2 || prop.columns === 4 ? prop.columns : 3,
      imageRatio:
        prop.imageRatio === '1:1' || prop.imageRatio === '3:4' ? prop.imageRatio : '4:3',
      heroStyle:
        prop.heroStyle === 'centered' || prop.heroStyle === 'compact'
          ? prop.heroStyle
          : 'split',
      cardDensity:
        prop.cardDensity === 'airy' || prop.cardDensity === 'compact'
          ? prop.cardDensity
          : 'balanced',
      maxSummaryLines: prop.maxSummaryLines === 3 ? 3 : 2,
      tierDisplay:
        prop.tierDisplay === 'selector' || prop.tierDisplay === 'detail-only'
          ? prop.tierDisplay
          : 'table',
      itemsPerPage: prop.itemsPerPage === 6 || prop.itemsPerPage === 12 ? prop.itemsPerPage : 9,
    };
    nextLayout.layoutSignature = computeLayoutSignature(nextLayout);
    onChangeLayout(nextLayout);

    onChangeBrand({
      ...brand,
      heroEyebrow: prop.heroEyebrow,
      heroTitle: prop.heroTitle,
      heroSubtitle: prop.heroSubtitle,
      craftNoteTitle: prop.craftNoteTitle,
      craftNoteBody: prop.craftNoteBody,
    });
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 1400, 0.85);
      onChangeBrand({ ...brand, heroImageUrl: dataUrl });
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Layout Lock Governance Banner */}
      <section
        className={`rounded-lg border p-5 ${
          layout.isLocked
            ? 'border-emerald-300 bg-emerald-50/70'
            : 'border-zinc-200 bg-white'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-2xl space-y-1">
            <div className="flex items-center gap-2">
              {layout.isLocked ? (
                <ShieldCheck className="h-5 w-5 text-emerald-800" />
              ) : (
                <Unlock className="h-5 w-5 text-zinc-700" />
              )}
              <h2 className="text-base font-semibold text-zinc-900">
                {layout.isLocked
                  ? 'Layout Definitivo Bloccato'
                  : 'Progettazione Layout e Impaginazione'}
              </h2>
              <span className="font-mono text-xs text-zinc-500 tabular-nums">
                {layout.layoutSignature}
              </span>
            </div>
            <p className="text-sm text-zinc-600">
              {layout.isLocked
                ? `Bloccato${layout.lockedAt ? ` il ${new Date(layout.lockedAt).toLocaleDateString('it-IT')}` : ''}. Le aggiunte o modifiche future di prodotti non possono alterare colonne, proporzioni, font, colori o impaginazione.`
                : 'Scegli o genera il layout ideale per la tua vetrina. Quando sei soddisfatto, bloccalo: tutte le aggiunte successive di prodotti manterranno esattamente questa impaginazione.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onPreviewShowcase}
              className="rounded-md border border-zinc-300 bg-white px-3.5 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 whitespace-nowrap"
            >
              Vedi Anteprima Live
            </button>
            {layout.isLocked ? (
              <button
                type="button"
                onClick={() => setUnlockConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-400 bg-white px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 whitespace-nowrap"
              >
                <Unlock className="h-3.5 w-3.5" />
                Sblocca Struttura
              </button>
            ) : (
              <button
                type="button"
                onClick={lockLayoutNow}
                className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 whitespace-nowrap"
              >
                <Lock className="h-3.5 w-3.5" />
                Blocca Layout Definitivo
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Creative Layout Assistant */}
        <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5 lg:col-span-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-zinc-800" />
            <h3 className="text-sm font-semibold text-zinc-900">
              Assistente Creativo per Impaginazione
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-zinc-600">
            Descrivi cosa vendi, a chi ti rivolgi e il tono visivo desiderato. L’assistente propone
            palette, font, griglia, modalità prezzi per quantità e testi di apertura.
          </p>

          <textarea
            rows={4}
            value={creativeBrief}
            onChange={(e) => setCreativeBrief(e.target.value)}
            placeholder="Es. Produciamo olio biologico e conserve in Toscana. Vendiamo sia bottiglie singole che cartoni da 6/12/24 pezzi per ristoranti..."
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
          />

          <button
            type="button"
            disabled={aiBusy}
            onClick={handleGenerateProposal}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {aiBusy ? 'Progettazione impaginazione...' : 'Genera Proposta di Impaginazione'}
          </button>

          {aiNote && <p className="text-xs text-zinc-500">{aiNote}</p>}

          {proposal && (
            <div className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Proposta Creativa
                </span>
                <span className="text-xs font-medium text-zinc-800">
                  {THEME_PRESETS[proposal.presetId]?.name}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-zinc-700">{proposal.designRationale}</p>
              <div className="grid grid-cols-2 gap-2 border-t border-zinc-200 pt-2.5 text-xs text-zinc-600">
                <div>Colonne: {proposal.columns}</div>
                <div>Foto: {proposal.imageRatio}</div>
                <div>Hero: {proposal.heroStyle}</div>
                <div>Articoli/pag: {proposal.itemsPerPage}</div>
              </div>
              <div className="border-t border-zinc-200 pt-2.5">
                <div className="text-xs font-semibold text-zinc-900">{proposal.heroTitle}</div>
                <div className="mt-0.5 text-xs text-zinc-600">{proposal.heroSubtitle}</div>
              </div>
              <button
                type="button"
                disabled={layout.isLocked}
                onClick={() => applyProposal(proposal)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-zinc-900 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Check className="h-3.5 w-3.5" />
                {layout.isLocked
                  ? 'Sblocca il layout per applicare'
                  : 'Applica questa Impaginazione'}
              </button>
            </div>
          )}
        </section>

        {/* Right: Structural Layout Controls */}
        <section className="space-y-6 rounded-lg border border-zinc-200 bg-white p-5 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">
                Regole Strutturali della Griglia & Impaginazione
              </h3>
              <p className="text-xs text-zinc-500">
                {layout.isLocked
                  ? 'Controlli protetti dal blocco layout per garantire stabilità visiva.'
                  : 'Personalizza i parametri prima di attivare il blocco definitivo.'}
              </p>
            </div>
            {layout.isLocked && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800">
                <Lock className="h-3.5 w-3.5" />
                Protetto
              </span>
            )}
          </div>

          <fieldset disabled={layout.isLocked} className="space-y-5 disabled:opacity-65">
            {/* Theme Presets */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-zinc-800">
                Direzione Visiva (Palette 60-30-10 & Coppia Font)
              </label>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {(Object.keys(THEME_PRESETS) as ThemePresetId[]).map((presetKey) => {
                  const preset = THEME_PRESETS[presetKey];
                  const active = layout.presetId === presetKey;
                  return (
                    <button
                      key={presetKey}
                      type="button"
                      onClick={() => patchLayout({ presetId: presetKey })}
                      className={`flex items-start gap-3 rounded-md border p-3 text-left transition-colors ${
                        active
                          ? 'border-zinc-900 bg-zinc-50'
                          : 'border-zinc-200 bg-white hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex shrink-0 overflow-hidden rounded border border-zinc-300">
                        <span
                          className="h-8 w-4"
                          style={{ backgroundColor: preset.colors.canvas }}
                        />
                        <span
                          className="h-8 w-3"
                          style={{ backgroundColor: preset.colors.ink }}
                        />
                        <span
                          className="h-8 w-3"
                          style={{ backgroundColor: preset.colors.accent }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-zinc-900">{preset.name}</div>
                        <div className="mt-0.5 text-[11px] leading-snug text-zinc-500">
                          {preset.subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid & Card Geometry */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                  Colonne Desktop
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {([2, 3, 4] as const).map((cols) => (
                    <button
                      key={cols}
                      type="button"
                      onClick={() => patchLayout({ columns: cols })}
                      className={`rounded border py-1.5 text-xs font-medium tabular-nums ${
                        layout.columns === cols
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-200 bg-white text-zinc-700'
                      }`}
                    >
                      {cols} col
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                  Proporzione Immagini
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['4:3', '1:1', '3:4'] as ImageRatio[]).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => patchLayout({ imageRatio: ratio })}
                      className={`rounded border py-1.5 font-mono text-xs tabular-nums ${
                        layout.imageRatio === ratio
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-200 bg-white text-zinc-700'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                  Prodotti per Pagina
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {([6, 9, 12] as const).map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => patchLayout({ itemsPerPage: cnt })}
                      className={`rounded border py-1.5 font-mono text-xs tabular-nums ${
                        layout.itemsPerPage === cnt
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-200 bg-white text-zinc-700'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Hero, Density, Summary Clamp */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                  Stile Apertura (Hero)
                </label>
                <select
                  value={layout.heroStyle}
                  onChange={(e) => patchLayout({ heroStyle: e.target.value as HeroStyle })}
                  className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-xs"
                >
                  <option value="split">Split con Immagine</option>
                  <option value="centered">Centrato Editoriale</option>
                  <option value="compact">Intestazione Compatta</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                  Respiro Schede
                </label>
                <select
                  value={layout.cardDensity}
                  onChange={(e) => patchLayout({ cardDensity: e.target.value as CardDensity })}
                  className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-xs"
                >
                  <option value="airy">Arioso</option>
                  <option value="balanced">Bilanciato</option>
                  <option value="compact">Compatto</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                  Righe Sintesi Fisse
                </label>
                <select
                  value={layout.maxSummaryLines}
                  onChange={(e) =>
                    patchLayout({ maxSummaryLines: Number(e.target.value) === 3 ? 3 : 2 })
                  }
                  className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-xs"
                >
                  <option value={2}>2 righe fisse</option>
                  <option value={3}>3 righe fisse</option>
                </select>
              </div>
            </div>

            {/* Tier Display Mode */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                Come mostrare i Prezzi per Quantità in Griglia
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  {
                    id: 'table' as TierDisplayMode,
                    title: 'Tabella Scaglioni',
                    desc: 'Mostra fino a 3 fasce quantità direttamente nella card.',
                  },
                  {
                    id: 'selector' as TierDisplayMode,
                    title: 'Calcolatore Rapido',
                    desc: 'Input quantità interattivo in ogni scheda con sconto live.',
                  },
                  {
                    id: 'detail-only' as TierDisplayMode,
                    title: 'Minimale + Dettaglio',
                    desc: 'Mostra prezzo base e rimanda gli scaglioni alla scheda prodotto.',
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => patchLayout({ tierDisplay: opt.id })}
                    className={`rounded-md border p-3 text-left ${
                      layout.tierDisplay === opt.id
                        ? 'border-zinc-900 bg-zinc-50'
                        : 'border-zinc-200 bg-white'
                    }`}
                  >
                    <div className="text-xs font-semibold text-zinc-900">{opt.title}</div>
                    <div className="mt-0.5 text-[11px] text-zinc-500">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Visibility toggles */}
            <div className="flex flex-wrap gap-4 border-t border-zinc-200 pt-4 text-xs text-zinc-700">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={layout.showCategory}
                  onChange={(e) => patchLayout({ showCategory: e.target.checked })}
                />
                Mostra Categoria
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={layout.showSku}
                  onChange={(e) => patchLayout({ showSku: e.target.checked })}
                />
                Mostra Codice SKU
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={layout.showAvailability}
                  onChange={(e) => patchLayout({ showAvailability: e.target.checked })}
                />
                Mostra Disponibilità
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={layout.showSearchAndFilter}
                  onChange={(e) => patchLayout({ showSearchAndFilter: e.target.checked })}
                />
                Mostra Ricerca e Categorie
              </label>
            </div>
          </fieldset>
        </section>
      </div>

      {/* Brand & Copy Details (Always Editable without changing Layout Geometry) */}
      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="mb-4 border-b border-zinc-200 pb-3">
          <h3 className="text-sm font-semibold text-zinc-900">
            Testi Intestazione, Foto Principale e Contatti
          </h3>
          <p className="text-xs text-zinc-500">
            Puoi aggiornare i testi del marchio o i recapiti in qualsiasi momento senza variare la
            struttura bloccata.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-4">
            <label className="mb-1 block text-xs font-medium text-zinc-700">Nome Attività</label>
            <input
              type="text"
              value={brand.brandName}
              onChange={(e) => onChangeBrand({ ...brand, brandName: e.target.value })}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-4">
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              Occhiello (Eyebrow)
            </label>
            <input
              type="text"
              value={brand.heroEyebrow}
              onChange={(e) => onChangeBrand({ ...brand, heroEyebrow: e.target.value })}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-4">
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              Email Richieste Ordine
            </label>
            <input
              type="email"
              value={brand.contactEmail}
              onChange={(e) => onChangeBrand({ ...brand, contactEmail: e.target.value })}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-6">
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              Titolo Principale (Hero)
            </label>
            <input
              type="text"
              value={brand.heroTitle}
              onChange={(e) => onChangeBrand({ ...brand, heroTitle: e.target.value })}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-6">
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              Immagine Principale (Hero Split)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={brand.heroImageUrl.startsWith('data:') ? '' : brand.heroImageUrl}
                onChange={(e) => onChangeBrand({ ...brand, heroImageUrl: e.target.value })}
                placeholder={
                  brand.heroImageUrl.startsWith('data:')
                    ? 'Immagine locale caricata'
                    : 'URL o percorso immagine'
                }
                className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-xs"
              />
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-100 whitespace-nowrap">
                <Upload className="h-3.5 w-3.5" />
                Carica
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleHeroUpload}
                />
              </label>
            </div>
          </div>

          <div className="md:col-span-6">
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              Sottotitolo Vetrina
            </label>
            <textarea
              rows={2}
              value={brand.heroSubtitle}
              onChange={(e) => onChangeBrand({ ...brand, heroSubtitle: e.target.value })}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-6">
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              Nota Condizioni / Forniture
            </label>
            <textarea
              rows={2}
              value={brand.craftNoteBody}
              onChange={(e) => onChangeBrand({ ...brand, craftNoteBody: e.target.value })}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      {/* Unlock Confirmation Modal */}
      {unlockConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-zinc-900">
              Sbloccare la struttura del layout?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              Lo sblocco consente di modificare colonne, proporzioni delle foto, colori e
              impaginazione. I tuoi prodotti resteranno intatti e potrai ribloccare il layout appena
              finito.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUnlockConfirmOpen(false)}
                className="rounded-md border border-zinc-300 px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Mantieni Bloccato
              </button>
              <button
                type="button"
                onClick={unlockLayoutConfirmed}
                className="rounded-md bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
              >
                Sblocca per Modifiche
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
