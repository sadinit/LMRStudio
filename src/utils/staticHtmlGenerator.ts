import { THEME_PRESETS } from '../data/presets';
import { ShowcaseDocument } from '../types/showcase';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateStandaloneHtml(
  doc: ShowcaseDocument,
  imagePathMap?: Record<string, string>,
  catalogPath = './data/catalog.json'
): string {
  const preset = THEME_PRESETS[doc.layout.presetId];
  const mappedDoc: ShowcaseDocument = {
    ...doc,
    brand: {
      ...doc.brand,
      heroImageUrl:
        (imagePathMap && imagePathMap[doc.brand.heroImageUrl]) || doc.brand.heroImageUrl,
    },
    products: doc.products.map((p) => ({
      ...p,
      imageUrl: (imagePathMap && imagePathMap[p.imageUrl]) || p.imageUrl,
    })),
  };

  const ratioPadding =
    doc.layout.imageRatio === '4:3'
      ? '75%'
      : doc.layout.imageRatio === '1:1'
        ? '100%'
        : '133.333%';

  const densityGap =
    doc.layout.cardDensity === 'airy'
      ? '2rem'
      : doc.layout.cardDensity === 'compact'
        ? '1.25rem'
        : '1.65rem';

  const cardPad =
    doc.layout.cardDensity === 'airy'
      ? '1.5rem'
      : doc.layout.cardDensity === 'compact'
        ? '1rem'
        : '1.25rem';

  const serializedDoc = JSON.stringify(mappedDoc).replace(/<\/script>/gi, '<\\/script>');

  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
  <meta http-equiv="Pragma" content="no-cache" />
  <meta http-equiv="Expires" content="0" />
  <title>${escapeHtml(mappedDoc.brand.brandName)} — Vetrina Prodotti</title>
  <meta name="description" content="${escapeHtml(mappedDoc.brand.heroSubtitle)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=DM+Sans:wght@400;500;600&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Public+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    :root {
      --canvas: ${preset.colors.canvas};
      --surface: ${preset.colors.surface};
      --surface-muted: ${preset.colors.surfaceMuted};
      --border: ${preset.colors.border};
      --ink: ${preset.colors.ink};
      --ink-muted: ${preset.colors.inkMuted};
      --accent: ${preset.colors.accent};
      --accent-text: ${preset.colors.accentText};
      --font-display: ${preset.displayFont};
      --font-body: ${preset.bodyFont};
      --font-mono: ${preset.monoFont};
      --radius-card: ${preset.radiusCard};
      --radius-btn: ${preset.radiusButton};
      --grid-cols: ${doc.layout.columns};
      --grid-gap: ${densityGap};
      --card-pad: ${cardPad};
      --summary-lines: ${doc.layout.maxSummaryLines};
    }
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--canvas);
      color: var(--ink);
      font-family: var(--font-body);
      line-height: 1.55;
      -webkit-font-smoothing: antialiased;
    }
    img { display: block; max-width: 100%; }
    button, input, select { font: inherit; }
    .tabular { font-variant-numeric: tabular-nums; font-family: var(--font-mono); }
    .container { max-width: 1220px; margin: 0 auto; padding: 0 1.5rem; }

    header.topbar {
      border-bottom: 1px solid var(--border);
      background: var(--canvas);
      position: sticky;
      top: 0;
      z-index: 30;
    }
    .topbar-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
      min-height: 68px;
    }
    .brand-link {
      font-family: var(--font-display);
      font-size: 1.35rem;
      font-weight: 600;
      color: var(--ink);
      text-decoration: none;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 1.75rem;
    }
    .nav-links a {
      color: var(--ink-muted);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      white-space: nowrap;
    }
    .nav-links a:hover { color: var(--ink); }
    .btn-primary {
      background: var(--accent);
      color: var(--accent-text);
      border: 1px solid var(--accent);
      border-radius: var(--radius-btn);
      padding: 0.55rem 1.1rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: opacity 0.16s ease, transform 0.16s ease;
    }
    .btn-primary:hover { opacity: 0.92; }
    .btn-outline {
      background: transparent;
      color: var(--ink);
      border: 1px solid var(--border);
      border-radius: var(--radius-btn);
      padding: 0.5rem 0.95rem;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      transition: border-color 0.16s ease, background 0.16s ease;
    }
    .btn-outline:hover { border-color: var(--ink-muted); background: var(--surface-muted); }

    .hero { padding: 3.5rem 0 2.5rem; border-bottom: 1px solid var(--border); }
    .hero-split {
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      gap: 2.5rem;
      align-items: stretch;
    }
    .hero-centered { text-align: center; max-width: 760px; margin: 0 auto; }
    .hero-compact { display: flex; align-items: flex-end; justify-content: space-between; gap: 2rem; flex-wrap: wrap; }
    .hero-eyebrow {
      font-size: 0.78rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ink-muted);
      margin: 0 0 0.75rem;
      font-weight: 600;
    }
    .hero h1 {
      font-family: var(--font-display);
      font-size: clamp(2.1rem, 3.8vw, 3.4rem);
      line-height: 1.08;
      margin: 0 0 1rem;
      font-weight: 600;
      text-wrap: balance;
    }
    .hero p.subtitle {
      font-size: 1.05rem;
      color: var(--ink-muted);
      margin: 0 0 1.75rem;
      max-width: 60ch;
    }
    .hero-media {
      border-radius: var(--radius-card);
      overflow: hidden;
      border: 1px solid var(--border);
      background: var(--surface-muted);
      min-height: 300px;
    }
    .hero-media img { width: 100%; height: 100%; object-fit: cover; }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 2rem 0 1.5rem;
    }
    .cat-tabs { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .cat-btn {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--ink-muted);
      padding: 0.42rem 0.85rem;
      border-radius: var(--radius-btn);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
    }
    .cat-btn.active {
      background: var(--ink);
      color: var(--canvas);
      border-color: var(--ink);
    }
    .search-input {
      background: var(--surface);
      color: var(--ink);
      border: 1px solid var(--border);
      border-radius: var(--radius-btn);
      padding: 0.5rem 0.85rem;
      font-size: 0.875rem;
      min-width: 240px;
    }

    .product-grid {
      display: grid;
      grid-template-columns: repeat(var(--grid-cols), minmax(0, 1fr));
      gap: var(--grid-gap);
      align-items: stretch;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 100%;
      transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .card:hover { transform: translateY(-2px); }
    .card-img-wrap {
      position: relative;
      width: 100%;
      padding-top: ${ratioPadding};
      background: var(--surface-muted);
      overflow: hidden;
      border-bottom: 1px solid var(--border);
    }
    .card-img-wrap img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .card-body {
      padding: var(--card-pad);
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
    }
    .card-meta {
      font-size: 0.75rem;
      color: var(--ink-muted);
      margin-bottom: 0.4rem;
      display: flex;
      gap: 0.45rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .card-title {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0 0 0.45rem;
      line-height: 1.25;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card-summary {
      font-size: 0.88rem;
      color: var(--ink-muted);
      margin: 0 0 1rem;
      display: -webkit-box;
      -webkit-line-clamp: var(--summary-lines);
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: calc(var(--summary-lines) * 1.38em);
    }
    .card-pricing {
      margin-top: auto;
      padding-top: 0.85rem;
      border-top: 1px solid var(--border);
    }
    .tier-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
      margin: 0.5rem 0 0.85rem;
    }
    .tier-table td {
      padding: 0.28rem 0;
      border-bottom: 1px dashed var(--border);
    }
    .tier-table tr:last-child td { border-bottom: none; }
    .tier-table td.price-cell { text-align: right; font-weight: 600; }
    .card-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.6rem;
      margin-top: 0.75rem;
    }
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 2.5rem 0 1rem;
    }
    .craft-section {
      margin-top: 3rem;
      padding: 2.5rem 0;
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      gap: 2rem;
    }
    .craft-section h2 {
      font-family: var(--font-display);
      font-size: 1.65rem;
      margin: 0;
    }
    footer {
      padding: 2rem 0 3rem;
      color: var(--ink-muted);
      font-size: 0.85rem;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 1rem;
    }

    dialog.modal {
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      background: var(--surface);
      color: var(--ink);
      max-width: 820px;
      width: calc(100% - 2rem);
      padding: 0;
      box-shadow: 0 24px 64px rgba(0,0,0,0.22);
    }
    dialog.modal::backdrop { background: rgba(0,0,0,0.52); }
    .modal-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    .modal-img { background: var(--surface-muted); min-height: 300px; }
    .modal-img img { width: 100%; height: 100%; object-fit: cover; }
    .modal-content { padding: 1.75rem; display: flex; flex-direction: column; gap: 1rem; }
    .qty-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: var(--surface-muted);
      padding: 0.65rem 0.85rem;
      border-radius: var(--radius-btn);
      border: 1px solid var(--border);
    }
    .qty-box input {
      width: 72px;
      padding: 0.3rem 0.45rem;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--ink);
      border-radius: var(--radius-btn);
      text-align: center;
    }

    @media (max-width: 980px) {
      .product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .hero-split, .craft-section, .modal-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .product-grid { grid-template-columns: 1fr; }
      .nav-links { display: none; }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="container topbar-inner">
      <a href="#top" class="brand-link" id="brand-title">${escapeHtml(mappedDoc.brand.brandName)}</a>
      <nav class="nav-links">
        <a href="#catalogo">Catalogo</a>
        <a href="#condizioni">Forniture</a>
      </nav>
      <a href="#contatti" class="btn-primary" style="text-decoration:none;">Contatti</a>
    </div>
  </header>

  <main id="top">
    <section class="hero">
      <div class="container" id="hero-root"></div>
    </section>

    <section class="container" id="catalogo">
      <div class="toolbar" id="toolbar-root"></div>
      <div class="product-grid" id="grid-root"></div>
      <div class="pagination" id="pagination-root"></div>
    </section>

    <section class="container" id="condizioni">
      <div class="craft-section">
        <div>
          <h2 id="craft-title">${escapeHtml(mappedDoc.brand.craftNoteTitle)}</h2>
        </div>
        <div>
          <p id="craft-body" style="margin:0;color:var(--ink-muted);">${escapeHtml(mappedDoc.brand.craftNoteBody)}</p>
        </div>
      </div>
    </section>
  </main>

  <footer class="container" id="contatti">
    <span id="footer-note">${escapeHtml(mappedDoc.brand.footerNote || mappedDoc.brand.brandName)}</span>
    <span id="footer-contact">${escapeHtml(mappedDoc.brand.contactEmail)}${mappedDoc.brand.whatsappNumber ? ' · ' + escapeHtml(mappedDoc.brand.whatsappNumber) : ''}</span>
  </footer>

  <dialog class="modal" id="product-modal"></dialog>

  <script id="embedded-catalog" type="application/json">${serializedDoc}</script>
  <script>
    (function () {
      const embeddedEl = document.getElementById('embedded-catalog');
      let state = JSON.parse(embeddedEl.textContent || '{}');
      let activeCategory = 'Tutte';
      let searchQuery = '';
      let currentPage = 1;

      const fmt = (n, curr) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: curr || 'EUR' }).format(n);
      const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

      function resolvePrice(product, qty) {
        const q = Math.max(1, Math.floor(qty || 1));
        const tiers = (product.tiers || []).slice().sort((a, b) => a.minQty - b.minQty);
        let active = null;
        for (const t of tiers) {
          if (q >= t.minQty && (t.maxQty === null || q <= t.maxQty)) { active = t; break; }
        }
        if (!active && tiers.length) {
          const elig = tiers.filter((t) => q >= t.minQty);
          if (elig.length) active = elig[elig.length - 1];
        }
        return { unitPrice: active ? active.unitPrice : product.basePrice, active };
      }

      function renderHero() {
        const b = state.brand || {};
        const style = (state.layout && state.layout.heroStyle) || 'split';
        const root = document.getElementById('hero-root');
        if (style === 'centered') {
          root.innerHTML = '<div class="hero-centered">'
            + '<p class="hero-eyebrow">' + esc(b.heroEyebrow) + '</p>'
            + '<h1>' + esc(b.heroTitle) + '</h1>'
            + '<p class="subtitle" style="margin-inline:auto;">' + esc(b.heroSubtitle) + '</p>'
            + '<a href="#catalogo" class="btn-primary" style="display:inline-block;text-decoration:none;">Esplora il Catalogo</a>'
            + '</div>';
          return;
        }
        if (style === 'compact') {
          root.innerHTML = '<div class="hero-compact">'
            + '<div><p class="hero-eyebrow">' + esc(b.heroEyebrow) + '</p>'
            + '<h1 style="margin-bottom:0.5rem;">' + esc(b.heroTitle) + '</h1>'
            + '<p class="subtitle" style="margin-bottom:0;">' + esc(b.heroSubtitle) + '</p></div>'
            + '<a href="#catalogo" class="btn-primary" style="text-decoration:none;">Vai ai Prodotti</a>'
            + '</div>';
          return;
        }
        root.innerHTML = '<div class="hero-split">'
          + '<div style="display:flex;flex-direction:column;justify-content:center;">'
          + '<p class="hero-eyebrow">' + esc(b.heroEyebrow) + '</p>'
          + '<h1>' + esc(b.heroTitle) + '</h1>'
          + '<p class="subtitle">' + esc(b.heroSubtitle) + '</p>'
          + '<div><a href="#catalogo" class="btn-primary" style="display:inline-block;text-decoration:none;">Esplora il Catalogo</a></div>'
          + '</div>'
          + '<div class="hero-media">' + (b.heroImageUrl ? '<img src="' + esc(b.heroImageUrl) + '" alt="' + esc(b.brandName) + '" />' : '') + '</div>'
          + '</div>';
      }

      function getFilteredProducts() {
        const list = (state.products || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
        return list.filter((p) => {
          const catOk = activeCategory === 'Tutte' || p.category === activeCategory;
          const q = searchQuery.trim().toLowerCase();
          const searchOk = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.summary.toLowerCase().includes(q);
          return catOk && searchOk;
        });
      }

      function renderToolbar() {
        const root = document.getElementById('toolbar-root');
        if (state.layout && state.layout.showSearchAndFilter === false) {
          root.innerHTML = '';
          return;
        }
        const cats = ['Tutte'].concat(Array.from(new Set((state.products || []).map((p) => p.category).filter(Boolean))));
        root.innerHTML = '<div class="cat-tabs">'
          + cats.map((c) => '<button type="button" class="cat-btn ' + (c === activeCategory ? 'active' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>').join('')
          + '</div>'
          + '<input type="search" class="search-input" id="search-box" placeholder="Cerca prodotto o codice..." value="' + esc(searchQuery) + '" />';
        root.querySelectorAll('[data-cat]').forEach((btn) => {
          btn.addEventListener('click', () => {
            activeCategory = btn.getAttribute('data-cat');
            currentPage = 1;
            renderToolbar();
            renderGrid();
          });
        });
        const box = document.getElementById('search-box');
        if (box) {
          box.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            currentPage = 1;
            renderGrid();
          });
        }
      }

      function renderGrid() {
        const perPage = (state.layout && state.layout.itemsPerPage) || 9;
        const filtered = getFilteredProducts();
        const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
        if (currentPage > totalPages) currentPage = totalPages;
        const start = (currentPage - 1) * perPage;
        const pageItems = filtered.slice(start, start + perPage);
        const grid = document.getElementById('grid-root');
        const tierMode = (state.layout && state.layout.tierDisplay) || 'table';

        if (!pageItems.length) {
          grid.innerHTML = '<p style="color:var(--ink-muted);grid-column:1/-1;padding:2rem 0;">Nessun prodotto trovato per i filtri selezionati.</p>';
        } else {
          grid.innerHTML = pageItems.map((p) => {
            const tiers = (p.tiers || []).slice().sort((a, b) => a.minQty - b.minQty);
            const lowest = tiers.length ? Math.min(p.basePrice, ...tiers.map((t) => t.unitPrice)) : p.basePrice;
            let tierBlock = '';
            if (tierMode === 'table' && tiers.length) {
              tierBlock = '<table class="tier-table"><tbody>'
                + tiers.slice(0, 3).map((t) => '<tr><td>' + (t.maxQty === null ? t.minQty + '+ ' : t.minQty + '–' + t.maxQty + ' ') + esc(p.unitLabel) + '</td><td class="price-cell tabular">' + fmt(t.unitPrice, p.currency) + '</td></tr>').join('')
                + '</tbody></table>';
            } else if (tierMode === 'selector' && tiers.length) {
              tierBlock = '<div style="font-size:0.82rem;color:var(--ink-muted);margin:0.4rem 0 0.7rem;">Da <strong class="tabular" style="color:var(--ink);">' + fmt(lowest, p.currency) + '</strong> / ' + esc(p.unitLabel) + ' per quantità</div>';
            }
            const metaParts = [];
            if (!state.layout || state.layout.showCategory) metaParts.push(esc(p.category));
            if (!state.layout || state.layout.showSku) metaParts.push('<span class="tabular">' + esc(p.sku) + '</span>');
            if (!state.layout || state.layout.showAvailability) {
              metaParts.push(p.availability === 'available' ? 'Disponibile' : p.availability === 'made-to-order' ? 'Su ordinazione' : 'Esaurito');
            }
            return '<article class="card">'
              + '<div class="card-img-wrap">' + (p.imageUrl ? '<img src="' + esc(p.imageUrl) + '" alt="' + esc(p.name) + '" loading="lazy" />' : '') + '</div>'
              + '<div class="card-body">'
              + (metaParts.length ? '<div class="card-meta">' + metaParts.join(' <span aria-hidden="true">·</span> ') + '</div>' : '')
              + '<h3 class="card-title">' + esc(p.name) + '</h3>'
              + '<p class="card-summary">' + esc(p.summary) + '</p>'
              + '<div class="card-pricing">'
              + '<div style="display:flex;justify-content:space-between;align-items:baseline;">'
              + '<span style="font-size:0.8rem;color:var(--ink-muted);">Prezzo base</span>'
              + '<strong class="tabular" style="font-size:1.1rem;">' + fmt(p.basePrice, p.currency) + ' <span style="font-weight:400;font-size:0.78rem;color:var(--ink-muted);">/ ' + esc(p.unitLabel) + '</span></strong>'
              + '</div>'
              + tierBlock
              + '<div class="card-actions">'
              + '<button type="button" class="btn-outline" data-detail="' + esc(p.id) + '" style="flex:1;">Dettagli & Quantità</button>'
              + '</div></div></div></article>';
          }).join('');

          grid.querySelectorAll('[data-detail]').forEach((btn) => {
            btn.addEventListener('click', () => openProductModal(btn.getAttribute('data-detail')));
          });
        }

        const pag = document.getElementById('pagination-root');
        if (totalPages <= 1) {
          pag.innerHTML = '';
        } else {
          let html = '';
          for (let i = 1; i <= totalPages; i++) {
            html += '<button type="button" class="cat-btn ' + (i === currentPage ? 'active' : '') + '" data-page="' + i + '">' + i + '</button>';
          }
          pag.innerHTML = html;
          pag.querySelectorAll('[data-page]').forEach((btn) => {
            btn.addEventListener('click', () => {
              currentPage = Number(btn.getAttribute('data-page'));
              renderGrid();
              document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' });
            });
          });
        }
      }

      function openProductModal(productId) {
        const p = (state.products || []).find((x) => x.id === productId);
        if (!p) return;
        const modal = document.getElementById('product-modal');
        let qty = 1;
        const renderModal = () => {
          const res = resolvePrice(p, qty);
          const tiers = (p.tiers || []).slice().sort((a, b) => a.minQty - b.minQty);
          modal.innerHTML = '<div class="modal-grid">'
            + '<div class="modal-img">' + (p.imageUrl ? '<img src="' + esc(p.imageUrl) + '" alt="' + esc(p.name) + '" />' : '') + '</div>'
            + '<div class="modal-content">'
            + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;">'
            + '<div><div style="font-size:0.78rem;color:var(--ink-muted);">' + esc(p.category) + ' · <span class="tabular">' + esc(p.sku) + '</span></div>'
            + '<h2 style="font-family:var(--font-display);margin:0.25rem 0 0;font-size:1.6rem;">' + esc(p.name) + '</h2></div>'
            + '<button type="button" class="btn-outline" id="close-prod-modal">Chiudi</button></div>'
            + '<p style="margin:0;color:var(--ink-muted);font-size:0.92rem;">' + esc(p.description) + '</p>'
            + (tiers.length ? '<table class="tier-table"><tbody>' + tiers.map((t) => '<tr style="' + (res.active && res.active.id === t.id ? 'font-weight:600;color:var(--accent);' : '') + '"><td>' + (t.maxQty === null ? t.minQty + '+ ' : t.minQty + '–' + t.maxQty + ' ') + esc(p.unitLabel) + (t.label ? ' · ' + esc(t.label) : '') + '</td><td class="price-cell tabular">' + fmt(t.unitPrice, p.currency) + '</td></tr>').join('') + '</tbody></table>' : '')
            + '<div class="qty-box">'
            + '<label for="modal-qty-input" style="font-size:0.85rem;font-weight:500;">Quantità (' + esc(p.unitLabel) + ')</label>'
            + '<input id="modal-qty-input" type="number" min="1" value="' + qty + '" />'
            + '<div style="margin-left:auto;text-align:right;">'
            + '<div style="font-size:0.75rem;color:var(--ink-muted);">Prezzo unitario: <span class="tabular">' + fmt(res.unitPrice, p.currency) + '</span></div>'
            + '<div class="tabular" style="font-size:1.15rem;font-weight:700;">Totale: ' + fmt(res.unitPrice * qty, p.currency) + '</div>'
            + '</div></div>'
            + '</div></div>';

          document.getElementById('close-prod-modal').addEventListener('click', () => modal.close());
          const inp = document.getElementById('modal-qty-input');
          inp.addEventListener('change', (e) => {
            qty = Math.max(1, parseInt(e.target.value || '1', 10));
            renderModal();
          });
        };
        renderModal();
        modal.showModal();
      }

      renderHero();
      renderToolbar();
      renderGrid();

      if (window.location && window.location.protocol && window.location.protocol.indexOf('http') === 0) {
        fetch(${JSON.stringify(catalogPath)} + '?v=' + Date.now(), { cache: 'no-store' })
          .then((res) => (res.ok ? res.json() : null))
          .then((remote) => {
            if (!remote || !Array.isArray(remote.products) || !remote.brand) return;
            const localTime = Date.parse(state.updatedAt || '') || 0;
            const remoteTime = Date.parse(remote.updatedAt || '') || 0;
            if (remoteTime > localTime) {
              state = remote;
              const brandEl = document.getElementById('brand-title');
              if (brandEl) brandEl.textContent = remote.brand.brandName || '';
              const craftTitle = document.getElementById('craft-title');
              if (craftTitle) craftTitle.textContent = remote.brand.craftNoteTitle || '';
              const craftBody = document.getElementById('craft-body');
              if (craftBody) craftBody.textContent = remote.brand.craftNoteBody || '';
              const footerNoteEl = document.getElementById('footer-note');
              if (footerNoteEl) footerNoteEl.textContent = remote.brand.footerNote || remote.brand.brandName || '';
              const footerContactEl = document.getElementById('footer-contact');
              if (footerContactEl) {
                footerContactEl.textContent = (remote.brand.contactEmail || '') + (remote.brand.whatsappNumber ? ' · ' + remote.brand.whatsappNumber : '');
              }
              renderHero();
              renderToolbar();
              renderGrid();
            }
          })
          .catch(() => {});
      }
    })();
  </script>
</body>
</html>`;
}
