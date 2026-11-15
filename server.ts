import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, aiAvailable: Boolean(getGeminiClient()) });
  });

  app.post('/api/creative-assist', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Assistente AI non configurato sul server. Puoi comunque usare i preset creativi integrati.',
        code: 'AI_UNAVAILABLE',
      });
      return;
    }

    const body = req.body as {
      mode?: 'layout' | 'product-copy';
      brandDescription?: string;
      brandName?: string;
      productName?: string;
      productCategory?: string;
      productNotes?: string;
      basePrice?: number;
    };

    try {
      if (body.mode === 'product-copy') {
        const productName = (body.productName || '').trim();
        const productCategory = (body.productCategory || '').trim();
        const productNotes = (body.productNotes || '').trim();

        if (!productName) {
          res.status(400).json({ error: 'Inserisci almeno il nome del prodotto.' });
          return;
        }

        const prompt = [
          'Sei un direttore editoriale e copywriter per cataloghi prodotto italiani di alta qualità.',
          `Prodotto: ${productName}`,
          productCategory ? `Categoria: ${productCategory}` : '',
          productNotes ? `Appunti del venditore: ${productNotes}` : '',
          body.basePrice ? `Prezzo base unitario: € ${body.basePrice}` : '',
          'Genera:',
          '1) summary: una sintesi elegante per la card in vetrina, MASSIMO 95 caratteri, chiara e concreta, senza emoji.',
          '2) description: una descrizione completa per la scheda prodotto (2-4 frasi ben scritte in italiano, materiali/uso/valore).',
          '3) suggestedTiers: 2 o 3 scaglioni quantità realistici (minQty, maxQty opzionale null per l’ultimo scaglione, discountPercent tra 5 e 30) adatti a questo prodotto.',
        ]
          .filter(Boolean)
          .join('\n');

        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                description: { type: Type.STRING },
                suggestedTiers: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      minQty: { type: Type.INTEGER },
                      maxQty: { type: Type.INTEGER, nullable: true },
                      discountPercent: { type: Type.INTEGER },
                      label: { type: Type.STRING },
                    },
                    required: ['minQty', 'discountPercent', 'label'],
                  },
                },
              },
              required: ['summary', 'description', 'suggestedTiers'],
            },
          },
        });

        const parsed = JSON.parse((response.text ?? '{}').trim());
        res.json({ ok: true, mode: 'product-copy', data: parsed });
        return;
      }

      const brandDescription = (body.brandDescription || '').trim();
      if (!brandDescription) {
        res.status(400).json({ error: 'Descrivi il tuo marchio, i prodotti e lo stile desiderato.' });
        return;
      }

      const layoutPrompt = [
        'Sei un art director esperto di e-commerce, vetrine editoriali e impaginazione stabile per cataloghi prodotti.',
        `Marchio: ${body.brandName || 'Attività indipendente'}`,
        `Descrizione richiesta dall’utente: ${brandDescription}`,
        'Proponi una configurazione completa e coerente di layout che rimarrà poi BLOCCATA e stabile alle aggiunte future di prodotti.',
        'Scegli presetId esattamente tra: "editorial-warm", "architectural-clean", "industrial-mono", "bottega-moderna".',
        'Scegli columns esattamente tra 2, 3, 4.',
        'Scegli imageRatio esattamente tra "4:3", "1:1", "3:4".',
        'Scegli heroStyle esattamente tra "split", "centered", "compact".',
        'Scegli cardDensity esattamente tra "airy", "balanced", "compact".',
        'Scegli tierDisplay esattamente tra "table", "selector", "detail-only".',
        'Scegli itemsPerPage esattamente tra 6, 9, 12.',
        'Scrivi testi in italiano naturale, sobrio ed elegante (niente punti esclamativi eccessivi o slogan artificiali).',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: layoutPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              presetId: { type: Type.STRING },
              columns: { type: Type.INTEGER },
              imageRatio: { type: Type.STRING },
              heroStyle: { type: Type.STRING },
              cardDensity: { type: Type.STRING },
              maxSummaryLines: { type: Type.INTEGER },
              tierDisplay: { type: Type.STRING },
              itemsPerPage: { type: Type.INTEGER },
              heroEyebrow: { type: Type.STRING },
              heroTitle: { type: Type.STRING },
              heroSubtitle: { type: Type.STRING },
              craftNoteTitle: { type: Type.STRING },
              craftNoteBody: { type: Type.STRING },
              designRationale: { type: Type.STRING },
            },
            required: [
              'presetId',
              'columns',
              'imageRatio',
              'heroStyle',
              'cardDensity',
              'maxSummaryLines',
              'tierDisplay',
              'itemsPerPage',
              'heroEyebrow',
              'heroTitle',
              'heroSubtitle',
              'craftNoteTitle',
              'craftNoteBody',
              'designRationale',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({ ok: true, mode: 'layout', data: parsed });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore durante la generazione creativa.';
      res.status(500).json({ error: message });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VetrinaKit server ready on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
