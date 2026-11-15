import heroArtisanImg from '../assets/images/hero_artisan_ceramics_1794726971565.jpg';
import productCupsImg from '../assets/images/product_espresso_cups_1794726972619.jpg';
import productLampImg from '../assets/images/product_lamp_alabaster_1794726972643.jpg';
import productOilImg from '../assets/images/product_olive_oil_bottle_1794726973463.jpg';
import productVaseImg from '../assets/images/product_vase_travertine_1794726972090.jpg';
import { GitHubConfig, ShowcaseDocument } from '../types/showcase';
import { computeLayoutSignature } from './presets';

const INITIAL_LAYOUT = {
  isLocked: false,
  lockedAt: null,
  layoutSignature: '',
  presetId: 'editorial-warm' as const,
  columns: 3 as const,
  imageRatio: '4:3' as const,
  heroStyle: 'split' as const,
  cardDensity: 'balanced' as const,
  maxSummaryLines: 2 as const,
  tierDisplay: 'table' as const,
  itemsPerPage: 9 as const,
  showSku: true,
  showCategory: true,
  showAvailability: true,
  showSearchAndFilter: true,
};

INITIAL_LAYOUT.layoutSignature = computeLayoutSignature(INITIAL_LAYOUT);

export const DEFAULT_SHOWCASE_DOCUMENT: ShowcaseDocument = {
  version: 1,
  updatedAt: new Date().toISOString(),
  brand: {
    brandName: 'Atelier Bellini',
    heroEyebrow: 'Ceramiche & Oggetti d’Interni · Laboratorio Toscano',
    heroTitle: 'Gres tornito a mano per la casa e l’ospitalità',
    heroSubtitle:
      'Piccole serie in terracotta e pietra naturale con prezzi dedicati per quantità destinate a ristoranti, enoteche e studi di interni.',
    heroImageUrl: heroArtisanImg,
    craftNoteTitle: 'Forniture stabili su ordinazione e piccoli lotti',
    craftNoteBody:
      'Ogni manufatto è cotto a 1240°C per resistere all’uso quotidiano professionale. Gli scaglioni per quantità si aggiornano automaticamente nella scheda prodotto.',
    contactEmail: 'ordini@atelierbellini.example',
    whatsappNumber: '+39 055 000 1234',
    footerNote: 'Atelier Bellini — Listino pubblico ospitato su GitHub Pages',
  },
  layout: INITIAL_LAYOUT,
  products: [
    {
      id: 'prod-vaso-travertino',
      sku: 'AB-VAS-01',
      name: 'Vaso Scultoreo Pietra Serena',
      category: 'Vasi e Centrotavola',
      summary: 'Gres sabbiato tornito a mano con rigatura orizzontale opaca, altezza 26 cm.',
      description:
        'Vaso realizzato al tornio con argilla refrattaria chiara e finitura materica a coste sottili. Interno smaltato trasparente per garantire tenuta stagna anche con rami freschi. Ideale per sale ristorante, hall alberghiere e ambienti residenziali.',
      unitLabel: 'pz',
      basePrice: 68,
      currency: 'EUR',
      tiers: [
        { id: 't1', minQty: 1, maxQty: 4, unitPrice: 68, label: 'Singolo' },
        { id: 't2', minQty: 5, maxQty: 14, unitPrice: 58, label: 'Set Tavola' },
        { id: 't3', minQty: 15, maxQty: null, unitPrice: 49, label: 'Contract' },
      ],
      imageUrl: productVaseImg,
      availability: 'available',
      featured: true,
      order: 0,
    },
    {
      id: 'prod-tazzine-espresso',
      sku: 'AB-TAZ-02',
      name: 'Coppia Tazzine Espresso Puntinato',
      category: 'Tavola e Caffetteria',
      summary: 'Set 2 tazzine con piattino in gres puntinato ferro, spessore termico da bar.',
      description:
        'Progettate insieme a torrefazioni artigianali per trattenere il calore dell’estrazione. Il bordo arrotondato e il fondo non smaltato conferiscono una presa calda e naturale. Lavabili in lavastoviglie professionale.',
      unitLabel: 'set',
      basePrice: 34,
      currency: 'EUR',
      tiers: [
        { id: 't4', minQty: 1, maxQty: 5, unitPrice: 34, label: 'Privati' },
        { id: 't5', minQty: 6, maxQty: 19, unitPrice: 28, label: 'Caffetteria' },
        { id: 't6', minQty: 20, maxQty: null, unitPrice: 23, label: 'Fornitura Bar' },
      ],
      imageUrl: productCupsImg,
      availability: 'available',
      featured: true,
      order: 1,
    },
    {
      id: 'prod-oliera-terracotta',
      sku: 'AB-OLI-03',
      name: 'Oliera Terracotta e Ottone 500 ml',
      category: 'Tavola e Caffetteria',
      summary: 'Bottiglia opaca anti-luce in terracotta smaltata con dosatore in ottone spazzolato.',
      description:
        'Protegge l’olio extravergine da luce e ossidazione grazie al corpo ceramico opaco ad alta densità. Completa di versatore salvagoccia in ottone massiccio con guarnizione alimentare in sughero naturale.',
      unitLabel: 'pz',
      basePrice: 42,
      currency: 'EUR',
      tiers: [
        { id: 't7', minQty: 1, maxQty: 9, unitPrice: 42, label: 'Standard' },
        { id: 't8', minQty: 10, maxQty: 29, unitPrice: 35, label: 'Ristorazione' },
        { id: 't9', minQty: 30, maxQty: null, unitPrice: 29, label: 'Frantoio / Ingrosso' },
      ],
      imageUrl: productOilImg,
      availability: 'available',
      featured: false,
      order: 2,
    },
    {
      id: 'prod-lampada-ottone',
      sku: 'AB-LUM-04',
      name: 'Lampada da Tavolo Terra e Lino',
      category: 'Illuminazione',
      summary: 'Base tornita in gres sabbia, stelo in ottone spazzolato e paralume in lino naturale.',
      description:
        'Diffonde una luce calda e uniforme adatta a comodini, scrivanie e tavoli lounge. Cablaggio tessile intrecciato da 180 cm con interruttore a sfioro e attacco E27 certificato CE.',
      unitLabel: 'pz',
      basePrice: 185,
      currency: 'EUR',
      tiers: [
        { id: 't10', minQty: 1, maxQty: 3, unitPrice: 185, label: 'Singola' },
        { id: 't11', minQty: 4, maxQty: 11, unitPrice: 160, label: 'Boutique Hotel' },
        { id: 't12', minQty: 12, maxQty: null, unitPrice: 138, label: 'Progetto Interni' },
      ],
      imageUrl: productLampImg,
      availability: 'made-to-order',
      featured: true,
      order: 3,
    },
  ],
};

export const DEFAULT_GITHUB_CONFIG: GitHubConfig = {
  owner: '',
  repo: '',
  branch: 'main',
  htmlPath: 'index.html',
  dataPath: 'data/catalog.json',
  token: '',
  rememberTokenLocally: false,
  lastSyncedAt: null,
  lastCommitSha: null,
};
