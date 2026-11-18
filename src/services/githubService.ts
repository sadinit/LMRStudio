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
  const trimmed = input.trim().replace(/\.git$/i, '').replace(/\/+$/, '');
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2] };
  }

  const pagesMatch = trimmed.match(/^https?:\/\/([A-Za-z0-9-]+)\.github\.io\/([^/]+)/i);
  if (pagesMatch) {
    return { owner: pagesMatch[1], repo: pagesMatch[2] };
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

function computeDefaultPagesUrl(owner: string, repo: string): string {
  if (repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
    return `https://${owner}.github.io/`;
  }
  return `https://${owner}.github.io/${repo}/`;
}

function explainRepoAccessError(status: number, owner: string, repo: string): string {
  if (status === 401) {
    return 'Token GitHub non valido o scaduto (401). Genera un nuovo token.';
  }
  if (status === 403) {
    return `Accesso negato su ${owner}/${repo} (403). Verifica i permessi del token (Contents: Read and write).`;
  }
  if (status === 404) {
    return `Repository "${owner}/${repo}" non trovata o non autorizzata dal token (404). Se usi un Fine-Grained Token, aggiungi anche questa repository in "Repository access" con permesso Contents: Read and write.`;
  }
  return `Errore GitHub (${status}) su ${owner}/${repo}.`;
}

export async function testGitHubConnection(config: GitHubConfig): Promise<{
  ok: boolean;
  defaultBranch: string;
  privateRepo: boolean;
  pagesUrl: string;
  branches: string[];
}> {
  const { owner, repo, token } = config;
  if (!owner || !repo) {
    throw new Error('Inserisci proprietario e nome della repository (es. utente/nome-repo).');
  }

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: ghHeaders(token),
  });

  if (!res.ok) {
    throw new Error(explainRepoAccessError(res.status, owner, repo));
  }

  const data = (await res.json()) as {
    default_branch: string;
    private: boolean;
    permissions?: { push?: boolean };
  };

  if (token.trim() && data.permissions && data.permissions.push === false) {
    throw new Error(
      `Il token può solo leggere "${owner}/${repo}" ma non scrivere. Abilita Contents: Read and write.`
    );
  }

  const branchesRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/branches?per_page=20`,
    { headers: ghHeaders(token) }
  );
  const branches = branchesRes.ok
    ? ((await branchesRes.json()) as Array<{ name: string }>).map((b) => b.name)
    : [];

  return {
    ok: true,
    defaultBranch: data.default_branch || 'main',
    privateRepo: Boolean(data.private),
    pagesUrl: computeDefaultPagesUrl(owner, repo),
    branches,
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
      throw new Error(
        `File "${cleanPath}" non trovato sul branch "${branch}" di ${owner}/${repo} (oppure token senza accesso a questa repository).`
      );
    }
    throw new Error(explainRepoAccessError(res.status, owner, repo));
  }

  const filePayload = (await res.json()) as { content: string; sha: string };
  const jsonText = decodeBase64ToUtf8(filePayload.content);
  const parsed = JSON.parse(jsonText) as ShowcaseDocument;

  if (!parsed || !parsed.layout || !Array.isArray(parsed.products)) {
    throw new Error('Il file JSON trovato non corrisponde allo schema VetrinaKit.');
  }

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

async function ensureBranchExistsOrBootstrap(
  owner: string,
  repo: string,
  branch: string,
  token: string,
  initialPath: string,
  initialBase64Content: string
): Promise<{ headSha: string; effectiveBranch: string }> {
  const refUrl = `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`;
  const refRes = await fetch(refUrl, { headers: ghHeaders(token) });

  if (refRes.ok) {
    const refData = (await refRes.json()) as { object: { sha: string } };
    return { headSha: refData.object.sha, effectiveBranch: branch };
  }

  // Inspect branches to distinguish an empty repository from a mismatched branch name
  const branchesRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/branches?per_page=20`,
    { headers: ghHeaders(token) }
  );

  if (!branchesRes.ok) {
    throw new Error(explainRepoAccessError(branchesRes.status, owner, repo));
  }

  const branches = (await branchesRes.json()) as Array<{ name: string; commit: { sha: string } }>;

  if (branches.length === 0) {
    // Empty repository: bootstrap initial commit via Contents API
    const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${initialPath}`;
    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers: ghHeaders(token),
      body: JSON.stringify({
        message: 'Inizializza repository vetrina',
        content: initialBase64Content,
        branch,
      }),
    });

    if (!putRes.ok) {
      throw new Error(explainRepoAccessError(putRes.status, owner, repo));
    }

    const putData = (await putRes.json()) as { commit: { sha: string } };
    return { headSha: putData.commit.sha, effectiveBranch: branch };
  }

  const available = branches.map((b) => b.name).join(', ');
  throw new Error(
    `Branch "${branch}" non trovato su ${owner}/${repo}. Branch disponibili: ${available}.`
  );
}

async function ensureGitHubPagesEnabled(
  owner: string,
  repo: string,
  branch: string,
  token: string
): Promise<{ pagesUrl: string; pagesStatus: 'active' | 'enabled-now' | 'needs-manual-enable' }> {
  const fallbackUrl = computeDefaultPagesUrl(owner, repo);
  const pagesEndpoint = `https://api.github.com/repos/${owner}/${repo}/pages`;

  try {
    const getRes = await fetch(pagesEndpoint, { headers: ghHeaders(token) });
    if (getRes.ok) {
      const data = (await getRes.json()) as { html_url?: string };
      return {
        pagesUrl: data.html_url || fallbackUrl,
        pagesStatus: 'active',
      };
    }

    if (getRes.status === 404) {
      const postRes = await fetch(pagesEndpoint, {
        method: 'POST',
        headers: ghHeaders(token),
        body: JSON.stringify({
          source: {
            branch,
            path: '/',
          },
        }),
      });

      if (postRes.ok) {
        const created = (await postRes.json()) as { html_url?: string };
        return {
          pagesUrl: created.html_url || fallbackUrl,
          pagesStatus: 'enabled-now',
        };
      }
    }
  } catch {
    // Ignore network/permission issues for optional Pages API check
  }

  return {
    pagesUrl: fallbackUrl,
    pagesStatus: 'needs-manual-enable',
  };
}

export async function publishShowcaseToGitHub(
  config: GitHubConfig,
  doc: ShowcaseDocument,
  commitMessage?: string
): Promise<{
  commitSha: string;
  commitUrl: string;
  pagesUrl: string;
  pagesStatus: 'active' | 'enabled-now' | 'needs-manual-enable';
}> {
  const { owner, repo, branch, htmlPath, dataPath, token } = config;
  if (!owner || !repo || !token.trim()) {
    throw new Error('Inserisci repository (utente/nome-repo) e token GitHub con permessi di scrittura.');
  }

  const cleanBranch = branch.trim() || 'main';
  const cleanHtmlPath = htmlPath.trim().replace(/^\/+/, '') || 'index.html';
  const cleanDataPath = dataPath.trim().replace(/^\/+/, '') || 'data/catalog.json';

  // Verify repository existence and write permissions first
  const repoCheckRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: ghHeaders(token),
  });
  if (!repoCheckRes.ok) {
    throw new Error(explainRepoAccessError(repoCheckRes.status, owner, repo));
  }
  const repoMeta = (await repoCheckRes.json()) as {
    permissions?: { push?: boolean };
  };
  if (repoMeta.permissions && repoMeta.permissions.push === false) {
    throw new Error(
      `Il token ha solo accesso in lettura su "${owner}/${repo}". Serve il permesso Contents: Read and write.`
    );
  }

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

  // Ensure branch exists (and bootstrap empty repository automatically if needed)
  const { headSha: parentCommitSha, effectiveBranch } = await ensureBranchExistsOrBootstrap(
    owner,
    repo,
    cleanBranch,
    token,
    cleanDataPath,
    encodeUtf8ToBase64(catalogJson)
  );

  const commitRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/commits/${parentCommitSha}`,
    { headers: ghHeaders(token) }
  );
  if (!commitRes.ok) {
    throw new Error(explainRepoAccessError(commitRes.status, owner, repo));
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
      if (blobRes.status === 404 || blobRes.status === 403) {
        throw new Error(
          `Permessi insufficienti sul token per scrivere su "${owner}/${repo}" (${blobRes.status}). Assicurati che il token abbia Contents: Read and write su questa repository.`
        );
      }
      throw new Error(`Errore creazione file su GitHub (${blobRes.status}).`);
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
  const newCommit = (await newCommitRes.json()) as { sha: string };

  const updateRefUrl = `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(effectiveBranch)}`;
  const patchRefRes = await fetch(updateRefUrl, {
    method: 'PATCH',
    headers: ghHeaders(token),
    body: JSON.stringify({ sha: newCommit.sha, force: false }),
  });

  if (!patchRefRes.ok) {
    const errDetail = await patchRefRes.text().catch(() => '');
    // Fallback to Contents API per-file commit if PATCH ref fails
    if (patchRefRes.status === 404 || patchRefRes.status === 422) {
      const filesToPut: Array<{ path: string; base64: string }> = [
        { path: cleanDataPath, base64: encodeUtf8ToBase64(catalogJson) },
        { path: cleanHtmlPath, base64: encodeUtf8ToBase64(standaloneHtml) },
        ...imageFilesToUpload,
      ];

      let lastCommitSha = newCommit.sha;
      for (const file of filesToPut) {
        const fileApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`;
        const existingRes = await fetch(
          `${fileApiUrl}?ref=${encodeURIComponent(effectiveBranch)}`,
          { headers: ghHeaders(token) }
        );
        const existingSha = existingRes.ok
          ? ((await existingRes.json()) as { sha?: string }).sha
          : undefined;

        const putRes = await fetch(fileApiUrl, {
          method: 'PUT',
          headers: ghHeaders(token),
          body: JSON.stringify({
            message:
              commitMessage?.trim() ||
              `Aggiorna ${file.path} (${doc.products.length} articoli)`,
            content: file.base64,
            branch: effectiveBranch,
            ...(existingSha ? { sha: existingSha } : {}),
          }),
        });

        if (!putRes.ok) {
          const putErr = await putRes.text().catch(() => '');
          throw new Error(
            `Errore aggiornamento branch "${effectiveBranch}" (${patchRefRes.status}) e fallback file "${file.path}" (${putRes.status}): ${putErr || errDetail}`
          );
        }
        const putData = (await putRes.json()) as { commit?: { sha?: string } };
        if (putData.commit?.sha) {
          lastCommitSha = putData.commit.sha;
        }
      }

      const pagesInfo = await ensureGitHubPagesEnabled(owner, repo, effectiveBranch, token);
      return {
        commitSha: lastCommitSha,
        commitUrl: `https://github.com/${owner}/${repo}/commit/${lastCommitSha}`,
        pagesUrl: pagesInfo.pagesUrl,
        pagesStatus: pagesInfo.pagesStatus,
      };
    }

    throw new Error(
      `Errore aggiornamento branch "${effectiveBranch}" (${patchRefRes.status})${errDetail ? `: ${errDetail}` : '.'}`
    );
  }

  const pagesInfo = await ensureGitHubPagesEnabled(owner, repo, effectiveBranch, token);

  return {
    commitSha: newCommit.sha,
    commitUrl: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
    pagesUrl: pagesInfo.pagesUrl,
    pagesStatus: pagesInfo.pagesStatus,
  };
}
