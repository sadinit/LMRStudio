import {
  CreativeLayoutProposal,
  LayoutConfig,
  ThemePresetDefinition,
  ThemePresetId,
} from '../types/showcase';

export const THEME_PRESETS: Record<ThemePresetId, ThemePresetDefinition> = {
  'editorial-warm': {
    id: 'editorial-warm',
    name: 'Editoriale Caldo',
    subtitle: 'Pietra chiara, carta avorio e terracotta',
    audience: 'Artigianato, enogastronomia, ceramiche, arredo',
    displayFont: "'Cormorant Garamond', Georgia, serif",
    bodyFont: "'Plus Jakarta Sans', system-ui, sans-serif",
    monoFont: "'JetBrains Mono', monospace",
    isDark: false,
    colors: {
      canvas: '#F6F3EE',
      surface: '#FFFFFF',
      surfaceMuted: '#EFEAE2',
      border: '#E2DBD0',
      ink: '#1C1917',
      inkMuted: '#57534E',
      accent: '#8B452F',
      accentText: '#FFFFFF',
    },
    radiusCard: '4px',
    radiusButton: '4px',
  },
  'architectural-clean': {
    id: 'architectural-clean',
    name: 'Architettonico Pulito',
    subtitle: 'Bianco gesso, linee nette e blu cobalto',
    audience: 'Design contemporaneo, studio oggetti, illuminazione',
    displayFont: "'Outfit', system-ui, sans-serif",
    bodyFont: "'Public Sans', system-ui, sans-serif",
    monoFont: "'IBM Plex Mono', monospace",
    isDark: false,
    colors: {
      canvas: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceMuted: '#F1F5F9',
      border: '#E2E8F0',
      ink: '#0F172A',
      inkMuted: '#475569',
      accent: '#1E40AF',
      accentText: '#FFFFFF',
    },
    radiusCard: '8px',
    radiusButton: '6px',
  },
  'industrial-mono': {
    id: 'industrial-mono',
    name: 'Catalogo Tecnico B2B',
    subtitle: 'Grigio pietra, griglia densa e ambra ad alta leggibilità',
    audience: 'Forniture aziendali, componenti, listini ingrosso',
    displayFont: "'Archivo', system-ui, sans-serif",
    bodyFont: "'DM Sans', system-ui, sans-serif",
    monoFont: "'IBM Plex Mono', monospace",
    isDark: false,
    colors: {
      canvas: '#F3F4F6',
      surface: '#FFFFFF',
      surfaceMuted: '#E5E7EB',
      border: '#D1D5DB',
      ink: '#111827',
      inkMuted: '#4B5563',
      accent: '#B45309',
      accentText: '#FFFFFF',
    },
    radiusCard: '2px',
    radiusButton: '2px',
  },
  'bottega-moderna': {
    id: 'bottega-moderna',
    name: 'Galleria Notturna',
    subtitle: 'Antracite profondo, avorio caldo e ottone spazzolato',
    audience: 'Edizioni limitate, alta gioielleria, audio, boutique',
    displayFont: "'Fraunces', Georgia, serif",
    bodyFont: "'DM Sans', system-ui, sans-serif",
    monoFont: "'JetBrains Mono', monospace",
    isDark: true,
    colors: {
      canvas: '#141413',
      surface: '#1D1D1B',
      surfaceMuted: '#262623',
      border: '#32322E',
      ink: '#F5F4EE',
      inkMuted: '#B3B0A6',
      accent: '#C9A25D',
      accentText: '#141413',
    },
    radiusCard: '6px',
    radiusButton: '6px',
  },
};

export function computeLayoutSignature(layout: LayoutConfig): string {
  const presetCode = {
    'editorial-warm': 'EDW',
    'architectural-clean': 'ARC',
    'industrial-mono': 'B2B',
    'bottega-moderna': 'GAL',
  }[layout.presetId];
  const ratioCode = layout.imageRatio.replace(':', '');
  const heroCode = layout.heroStyle.slice(0, 3).toUpperCase();
  const tierCode = layout.tierDisplay === 'table' ? 'TBL' : layout.tierDisplay === 'selector' ? 'SEL' : 'MOD';
  return `${presetCode}-${layout.columns}C-${ratioCode}-${heroCode}-${tierCode}-P${layout.itemsPerPage}`;
}

export function buildLocalCreativeProposal(
  brandDescription: string,
  brandName: string
): CreativeLayoutProposal {
  const lower = brandDescription.toLowerCase();

  if (
    lower.includes('b2b') ||
    lower.includes('ingrosso') ||
    lower.includes('ricambi') ||
    lower.includes('industrial') ||
    lower.includes('tecnic') ||
    lower.includes('ferramenta') ||
    lower.includes('component')
  ) {
    return {
      presetId: 'industrial-mono',
      columns: 3,
      imageRatio: '4:3',
      heroStyle: 'compact',
      cardDensity: 'compact',
      maxSummaryLines: 2,
      tierDisplay: 'table',
      itemsPerPage: 12,
      heroEyebrow: 'Listino Forniture e Scaglioni Quantità',
      heroTitle: `${brandName || 'Catalogo Tecnico'} — Forniture Dirette`,
      heroSubtitle:
        'Specifiche chiare, disponibilità immediata e sconti progressivi per ordini a volume.',
      craftNoteTitle: 'Condizioni di Fornitura e Imballo',
      craftNoteBody:
        'Ogni articolo rispetta tolleranze certificate. Gli scaglioni per quantità si applicano automaticamente in fase di richiesta ordine.',
      designRationale:
        'Griglia tecnica a 3 colonne con tabella scaglioni visibile su ogni scheda, 12 articoli per pagina e intestazione compatta per massimizzare la consultazione rapida B2B.',
    };
  }

  if (
    lower.includes('lusso') ||
    lower.includes('gioiell') ||
    lower.includes('orolog') ||
    lower.includes('audio') ||
    lower.includes('boutique') ||
    lower.includes('notte') ||
    lower.includes('esclusiv')
  ) {
    return {
      presetId: 'bottega-moderna',
      columns: 2,
      imageRatio: '3:4',
      heroStyle: 'split',
      cardDensity: 'airy',
      maxSummaryLines: 2,
      tierDisplay: 'selector',
      itemsPerPage: 6,
      heroEyebrow: 'Edizioni Curate · Collezione Permanente',
      heroTitle: `${brandName || 'Atelier'} — Oggetti in Piccola Serie`,
      heroSubtitle:
        'Presentazione ad alto contrasto su fondo antracite, pensata per valorizzare dettagli, materiali e finiture.',
      craftNoteTitle: 'Produzione Numerata su Misura',
      craftNoteBody:
        'Realizziamo piccoli lotti su commessa per privati, studi di architettura e hospitality con listino dedicato per quantità.',
      designRationale:
        'Impaginazione a 2 colonne ampie con formato verticale 3:4, selettore interattivo delle quantità e 6 pezzi per pagina per un ritmo da galleria.',
    };
  }

  if (
    lower.includes('design') ||
    lower.includes('modern') ||
    lower.includes('arredo') ||
    lower.includes('lampad') ||
    lower.includes('studio') ||
    lower.includes('minimal')
  ) {
    return {
      presetId: 'architectural-clean',
      columns: 3,
      imageRatio: '1:1',
      heroStyle: 'split',
      cardDensity: 'balanced',
      maxSummaryLines: 2,
      tierDisplay: 'selector',
      itemsPerPage: 9,
      heroEyebrow: 'Collezione Permanente · Design Funzionale',
      heroTitle: `${brandName || 'Studio'} — Forma, Funzione, Materia`,
      heroSubtitle:
        'Oggetti progettati per durare, con listino trasparente per singoli pezzi e forniture contract.',
      craftNoteTitle: 'Progetto e Forniture Contract',
      craftNoteBody:
        'Collaboriamo con architetti e rivenditori offrendo scaglioni dedicati a partire da 5 unità per referenza.',
      designRationale:
        'Layout architettonico a 3 colonne con riquadri 1:1 perfettamente allineati, selettore rapido dei volumi e 9 articoli per pagina.',
    };
  }

  return {
    presetId: 'editorial-warm',
    columns: 3,
    imageRatio: '4:3',
    heroStyle: 'split',
    cardDensity: 'balanced',
    maxSummaryLines: 2,
    tierDisplay: 'table',
    itemsPerPage: 9,
    heroEyebrow: 'Manifattura Artigianale · Vendita Diretta e Ingrosso',
    heroTitle: `${brandName || 'Bottega'} — Lavorazione dal Vero`,
    heroSubtitle:
      'Ogni pezzo nasce in laboratorio in piccoli lotti, con listino chiaro per privati, ristorazione e rivenditori.',
    craftNoteTitle: 'Dal Laboratorio alla Tavola',
    craftNoteBody:
      'Selezioniamo materie prime locali e cotture lente. Per ordini multipli garantiamo condizioni dedicate per quantità.',
    designRationale:
      'Palette calda editoriale con tipografia graziata e griglia bilanciata a 3 colonne (4:3) con tabella scaglioni immediata.',
  };
}
