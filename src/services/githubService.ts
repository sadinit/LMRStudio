import { GitHubConfig, ShowcaseDocument } from '../types/showcase';
import { generateStandaloneHtml } from '../utils/staticHtmlGenerator';

function encodeUtf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decodeBase64ToUtf8(base64: string): string {
  const clean = base64.replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function parseGitHubRepoString(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim().replace(/\.git$/, '');
  const urlMatch = trimmed.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2] };
  }
  const slashMatch = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (slashMatch) {
    return { owner: slashMatch[1], repo: slashMatch[2] };
  }
  return null;
}

function ghHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };
  if (token && token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }
  return headers;
}

export async function testGitHubConnection(config: GitHubConfig): Promise<{
  ok: boolean;
  defaultBranch: string;
  privateRepo: boolean;
  pagesUrl: string;
}> {
  const { owner, repo, token } = config;
  if (!owner || !repo) {
    throw new Error('Inserisci proprietario e nome della repository GitHub.');
  }

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: ghHeaders(token),
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Repository non trovata o token privo di accesso.');
    }
    if (res.status === 401) {
      throw new Error('Token GitHub non valido o scaduto.');
    }
    throw new Error(`Errore GitHub (${res.status}).`);
  }

  const data = (await res.json()) as {
    default_branch: string;
    private: boolean;
    has_pages?: boolean;
  };

  return {
    ok: true,
    defaultBranch: data.default_branch || 'main',
    privateRepo: Boolean(data.private),
    pagesUrl: `https://${owner}.github.io/${repo}/`,
  };
}

export async function loadCatalogFromGitHub(
  config: GitHubConfig
): Promise<{ document: ShowcaseDocument; sha: string }> {
  const { owner, repo, branch, dataPath, token } = config;
  if (!owner || !repo) {
    throw new Error('Configura prima owner e repository GitHub.');
  }

  const cleanPath = dataPath.replace(/^\/+/, '');
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${encodeURIComponent(branch || 'main')}`;
  const res = await fetch(url, { headers: ghHeaders(token) });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`File "${cleanPath}" non ancora presente sul branch "${branch}".`);
    }
    throw new Error(`Impossibile leggere "${cleanPath}" (${res.status}).`);
  }

  const filePayload = (await res.json()) as { content: string; sha: string };
  const jsonText = decodeBase64ToUtf8(filePayload.content);
  const parsed = JSON.parse(jsonText) as ShowcaseDocument;

  if (!parsed || !parsed.layout || !Array.isArray(parsed.products)) {
    throw new Error('Il file JSON trovato non corrisponde allo schema VetrinaKit.');
  }

  // Resolve relative ./images/... references to raw GitHub URLs for preview inside the studio
  const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${branch || 'main'}/`;
  const resolveImage = (img: string) =>
    img && img.startsWith('./') ? `${rawBase}${img.slice(2)}` : img;

  return {
    sha: filePayload.sha,
    document: {
      ...parsed,
      brand: {
        ...parsed.brand,
        heroImageUrl: resolveImage(parsed.brand.heroImageUrl),
      },
      products: parsed.products.map((p) => ({
        ...p,
        imageUrl: resolveImage(p.imageUrl),
      })),
    },
  };
}

async function assetToBase64Image(
  imageUrl: string
): Promise<{ base64: string; ext: string } | null> {
  if (!imageUrl) return null;

  if (imageUrl.startsWith('data:image/')) {
    const match = imageUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!match) return null;
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    return { base64: match[2], ext };
  }

  // Local app starter images or same-origin bundled assets
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Errore lettura immagine locale'));
      reader.readAsDataURL(blob);
    });
    const base64 = dataUrl.split(',')[1] || '';
    return base64 ? { base64, ext } : null;
  }

  return null;
}

export async function publishShowcaseToGitHub(
  config: GitHubConfig,
  doc: ShowcaseDocument,
  commitMessage?: string
): Promise<{ commitSha: string; commitUrl: string; pagesUrl: string }> {
  const { owner, repo, branch, htmlPath, dataPath, token } = config;
  if (!owner || !repo || !token.trim()) {
    throw new Error('Inserisci repository e token GitHub con permessi di scrittura.');
  }

  const cleanBranch = branch.trim() || 'main';
  const cleanHtmlPath = htmlPath.trim().replace(/^\/+/, '') || 'index.html';
  const cleanDataPath = dataPath.trim().replace(/^\/+/, '') || 'data/catalog.json';

  // Convert local/uploaded images to clean repo paths under images/
  const imagePathMap: Record<string, string> = {};
  const imageFilesToUpload: Array<{ path: string; base64: string }> = [];

  const rawPrefix = `https://raw.githubusercontent.com/${owner}/${repo}/${cleanBranch}/`;

  const processUrl = async (url: string, targetBaseName: string) => {
    if (!url) return;
    if (url.startsWith(rawPrefix)) {
      imagePathMap[url] = `./${url.slice(rawPrefix.length)}`;
      return;
    }
    const converted = await assetToBase64Image(url);
    if (converted) {
      const repoPath = `images/${targetBaseName}.${converted.ext}`;
      imagePathMap[url] = `./${repoPath}`;
      imageFilesToUpload.push({ path: repoPath, base64: converted.base64 });
    }
  };

  if (doc.brand.heroImageUrl) {
    await processUrl(doc.brand.heroImageUrl, 'hero-vetrina');
  }
  for (const product of doc.products) {
    if (product.imageUrl) {
      const safeId = product.id.replace(/[^a-zA-Z0-9_-]/g, '');
      await processUrl(product.imageUrl, `prod-${safeId}`);
    }
  }

  const repoCatalogDoc: ShowcaseDocument = {
    ...doc,
    updatedAt: new Date().toISOString(),
    brand: {
      ...doc.brand,
      heroImageUrl: imagePathMap[doc.brand.heroImageUrl] || doc.brand.heroImageUrl,
    },
    products: doc.products.map((p) => ({
      ...p,
      imageUrl: imagePathMap[p.imageUrl] || p.imageUrl,
    })),
  };

  const catalogJson = JSON.stringify(repoCatalogDoc, null, 2);
  const standaloneHtml = generateStandaloneHtml(repoCatalogDoc);

  // Use Git Data API for one clean atomic commit
  const refUrl = `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(cleanBranch)}`;
  const refRes = await fetch(refUrl, { headers: ghHeaders(token) });

  if (!refRes.ok) {
    throw new Error(
      `Branch "${cleanBranch}" non trovato (${refRes.status}). Verifica che il repository sia inizializzato.`
    );
  }

  const refData = (await refRes.json()) as { object: { sha: string } };
  const parentCommitSha = refData.object.sha;

  const commitRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/commits/${parentCommitSha}`,
    { headers: ghHeaders(token) }
  );
  if (!commitRes.ok) {
    throw new Error('Impossibile leggere il commit corrente del branch.');
  }
  const commitData = (await commitRes.json()) as { tree: { sha: string } };
  const baseTreeSha = commitData.tree.sha;

  const createBlob = async (base64Content: string) => {
    const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
      method: 'POST',
      headers: ghHeaders(token),
      body: JSON.stringify({ content: base64Content, encoding: 'base64' }),
    });
    if (!blobRes.ok) {
      throw new Error(`Errore creazione blob su GitHub (${blobRes.status}).`);
    }
    const blobData = (await blobRes.json()) as { sha: string };
    return blobData.sha;
  };

  const treeEntries: Array<{
    path: string;
    mode: string;
    type: string;
    sha: string;
  }> = [];

  treeEntries.push({
    path: cleanHtmlPath,
    mode: '100644',
    type: 'blob',
    sha: await createBlob(encodeUtf8ToBase64(standaloneHtml)),
  });

  treeEntries.push({
    path: cleanDataPath,
    mode: '100644',
    type: 'blob',
    sha: await createBlob(encodeUtf8ToBase64(catalogJson)),
  });

  for (const img of imageFilesToUpload) {
    treeEntries.push({
      path: img.path,
      mode: '100644',
      type: 'blob',
      sha: await createBlob(img.base64),
    });
  }

  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers: ghHeaders(token),
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeEntries,
    }),
  });
  if (!treeRes.ok) {
    throw new Error(`Errore creazione tree GitHub (${treeRes.status}).`);
  }
  const treeData = (await treeRes.json()) as { sha: string };

  const newCommitRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/commits`,
    {
      method: 'POST',
      headers: ghHeaders(token),
      body: JSON.stringify({
        message:
          commitMessage?.trim() ||
          `Aggiorna vetrina prodotti (${doc.products.length} articoli · layout ${doc.layout.layoutSignature})`,
        tree: treeData.sha,
        parents: [parentCommitSha],
      }),
    }
  );
  if (!newCommitRes.ok) {
    throw new Error(`Errore creazione commit GitHub (${newCommitRes.status}).`);
  }
  const newCommit = (await newCommitRes.json()) as { sha: string; html_url?: string };

  const patchRefRes = await fetch(refUrl, {
    method: 'PATCH',
    headers: ghHeaders(token),
    body: JSON.stringify({ sha: newCommit.sha, force: false }),
  });
  if (!patchRefRes.ok) {
    throw new Error(`Errore aggiornamento branch "${cleanBranch}" (${patchRefRes.status}).`);
  }

  return {
    commitSha: newCommit.sha,
    commitUrl: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
    pagesUrl: `https://${owner}.github.io/${repo}/`,
  };
}
