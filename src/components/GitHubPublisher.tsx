import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FolderGit2,
  GitCommitHorizontal,
  Lock,
  RefreshCw,
  Upload,
} from 'lucide-react';
import {
  loadCatalogFromGitHub,
  parseGitHubRepoString,
  publishShowcaseToGitHub,
  testGitHubConnection,
} from '../services/githubService';
import { GitHubConfig, ShowcaseDocument } from '../types/showcase';
import { inlineLocalImagesForDownload } from '../utils/imageHelper';
import { generateStandaloneHtml } from '../utils/staticHtmlGenerator';

interface GitHubPublisherProps {
  doc: ShowcaseDocument;
  githubConfig: GitHubConfig;
  onChangeGitHubConfig: (next: GitHubConfig) => void;
  onReplaceDocument: (next: ShowcaseDocument) => void;
}

export const GitHubPublisher: React.FC<GitHubPublisherProps> = ({
  doc,
  githubConfig,
  onChangeGitHubConfig,
  onReplaceDocument,
}) => {
  const [repoInput, setRepoInput] = useState(
    githubConfig.owner && githubConfig.repo
      ? `${githubConfig.owner}/${githubConfig.repo}`
      : ''
  );
  const [commitMessage, setCommitMessage] = useState('');
  const [busyAction, setBusyAction] = useState<'test' | 'load' | 'publish' | 'download' | null>(
    null
  );
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
    commitUrl?: string;
    pagesUrl?: string;
  } | null>(null);
  const [copiedHtml, setCopiedHtml] = useState(false);

  const handleRepoInputChange = (value: string) => {
    setRepoInput(value);
    const parsed = parseGitHubRepoString(value);
    if (parsed) {
      onChangeGitHubConfig({
        ...githubConfig,
        owner: parsed.owner,
        repo: parsed.repo,
      });
    } else if (!value.trim()) {
      onChangeGitHubConfig({
        ...githubConfig,
        owner: '',
        repo: '',
      });
    }
  };

  const handleTest = async () => {
    setBusyAction('test');
    setStatusMessage(null);
    try {
      const res = await testGitHubConnection(githubConfig);
      const currentBranchValid =
        res.branches.length === 0 || res.branches.includes(githubConfig.branch);
      const nextBranch = currentBranchValid ? githubConfig.branch : res.defaultBranch;

      if (nextBranch !== githubConfig.branch) {
        onChangeGitHubConfig({ ...githubConfig, branch: nextBranch });
      }

      setStatusMessage({
        type: 'success',
        text:
          res.branches.length === 0
            ? `Connessione riuscita a ${githubConfig.owner}/${githubConfig.repo} (repository vuota: verrà inizializzata al primo invio su "${nextBranch}").`
            : `Connessione riuscita a ${githubConfig.owner}/${githubConfig.repo} (branch attivo: ${nextBranch}).`,
        pagesUrl: res.pagesUrl,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Errore di connessione a GitHub.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleLoadFromGitHub = async () => {
    setBusyAction('load');
    setStatusMessage(null);
    try {
      const loaded = await loadCatalogFromGitHub(githubConfig);
      onReplaceDocument(loaded.document);
      setStatusMessage({
        type: 'success',
        text: `Caricato "${githubConfig.dataPath}" con ${loaded.document.products.length} prodotti${loaded.document.layout.isLocked ? ' e layout bloccato' : ''}.`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Errore caricamento file da GitHub.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handlePublish = async () => {
    setBusyAction('publish');
    setStatusMessage(null);
    try {
      const res = await publishShowcaseToGitHub(githubConfig, doc, commitMessage);
      onChangeGitHubConfig({
        ...githubConfig,
        lastSyncedAt: new Date().toISOString(),
        lastCommitSha: res.commitSha,
      });
      setCommitMessage('');

      const pagesHint =
        res.pagesStatus === 'enabled-now'
          ? ' GitHub Pages è stato attivato automaticamente: la pagina sarà visibile tra ~30-60 secondi.'
          : res.pagesStatus === 'needs-manual-enable'
            ? ` Per evitare il 404 sul link pubblico, attiva una sola volta Settings → Pages → Deploy from a branch (${githubConfig.branch || 'main'} / root) su questa repository.`
            : ' GitHub Pages si aggiornerà entro ~30-60 secondi.';

      setStatusMessage({
        type: 'success',
        text: `Commit pubblicato su ${githubConfig.owner}/${githubConfig.repo} (${res.commitSha.slice(0, 7)}).${pagesHint}`,
        commitUrl: res.commitUrl,
        pagesUrl: res.pagesUrl,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Errore durante il commit su GitHub.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const triggerDownload = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadHtml = async () => {
    setBusyAction('download');
    try {
      const allUrls = [
        doc.brand.heroImageUrl,
        ...doc.products.map((p) => p.imageUrl),
      ].filter(Boolean);
      const inlinedMap = await inlineLocalImagesForDownload(allUrls);
      const html = generateStandaloneHtml(doc, inlinedMap);
      triggerDownload('index.html', html, 'text/html;charset=utf-8');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownloadJson = () => {
    const json = JSON.stringify(doc, null, 2);
    triggerDownload('catalog.json', json, 'application/json;charset=utf-8');
  };

  const handleCopyHtml = async () => {
    const allUrls = [doc.brand.heroImageUrl, ...doc.products.map((p) => p.imageUrl)].filter(
      Boolean
    );
    const inlinedMap = await inlineLocalImagesForDownload(allUrls);
    const html = generateStandaloneHtml(doc, inlinedMap);
    await navigator.clipboard.writeText(html);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ShowcaseDocument;
      if (!parsed.layout || !Array.isArray(parsed.products)) {
        throw new Error('File JSON non compatibile con VetrinaKit.');
      }
      onReplaceDocument(parsed);
      setStatusMessage({
        type: 'success',
        text: `Importato "${file.name}" (${parsed.products.length} prodotti).`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Errore lettura JSON.',
      });
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {statusMessage && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
            statusMessage.type === 'error'
              ? 'border-red-300 bg-red-50 text-red-900'
              : statusMessage.type === 'success'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                : 'border-zinc-300 bg-white text-zinc-800'
          }`}
        >
          <span>{statusMessage.text}</span>
          <div className="flex items-center gap-3 text-xs font-semibold">
            {statusMessage.commitUrl && (
              <a
                href={statusMessage.commitUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline"
              >
                Vedi Commit
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {statusMessage.pagesUrl && (
              <a
                href={statusMessage.pagesUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline"
              >
                Apri GitHub Pages
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Direct GitHub Sync */}
        <section className="space-y-5 rounded-lg border border-zinc-200 bg-white p-6 lg:col-span-7">
          <div className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <FolderGit2 className="h-4 w-4 text-zinc-900" />
                <h2 className="text-base font-semibold text-zinc-900">
                  Pubblicazione Diretta su Repository GitHub
                </h2>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                Collega la tua repository per leggere e aggiornare direttamente{' '}
                <code className="font-mono text-zinc-800">index.html</code>,{' '}
                <code className="font-mono text-zinc-800">data/catalog.json</code> e le immagini in
                un unico commit.
              </p>
            </div>
            {doc.layout.isLocked && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 whitespace-nowrap">
                <Lock className="h-3.5 w-3.5" />
                Layout Bloccato
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-zinc-700">
                Repository GitHub (utente/nome-repo oppure URL completo)
              </label>
              <input
                type="text"
                value={repoInput}
                onChange={(e) => handleRepoInputChange(e.target.value)}
                placeholder="es. mario-rossi/vetrina-ceramiche oppure https://github.com/..."
                className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm focus:border-zinc-900 focus:outline-none"
              />
              {repoInput.trim() && !parseGitHubRepoString(repoInput) && (
                <p className="mt-1 text-xs text-amber-700">
                  Usa il formato <code className="font-mono">utente/nome-repo</code> o incolla l’URL
                  della repository GitHub.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Branch</label>
              <input
                type="text"
                value={githubConfig.branch}
                onChange={(e) =>
                  onChangeGitHubConfig({ ...githubConfig, branch: e.target.value })
                }
                placeholder="main"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">
                File Pagina Pubblica
              </label>
              <input
                type="text"
                value={githubConfig.htmlPath}
                onChange={(e) =>
                  onChangeGitHubConfig({ ...githubConfig, htmlPath: e.target.value })
                }
                placeholder="index.html"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">
                File Dati & Schema Bloccato
              </label>
              <input
                type="text"
                value={githubConfig.dataPath}
                onChange={(e) =>
                  onChangeGitHubConfig({ ...githubConfig, dataPath: e.target.value })
                }
                placeholder="data/catalog.json"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">
                Messaggio Commit (opzionale)
              </label>
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Aggiornamento prodotti vetrina"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-zinc-700">
                GitHub Personal Access Token (permesso Contents: Read & Write)
              </label>
              <input
                type="password"
                value={githubConfig.token}
                onChange={(e) =>
                  onChangeGitHubConfig({ ...githubConfig, token: e.target.value })
                }
                placeholder="github_pat_..."
                className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm"
              />
              <label className="mt-2 inline-flex items-center gap-2 text-xs text-zinc-600">
                <input
                  type="checkbox"
                  checked={githubConfig.rememberTokenLocally}
                  onChange={(e) =>
                    onChangeGitHubConfig({
                      ...githubConfig,
                      rememberTokenLocally: e.target.checked,
                    })
                  }
                />
                Ricorda token su questo browser (altrimenti resta solo per la sessione corrente)
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 border-t border-zinc-200 pt-4">
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={handleTest}
              className="rounded-md border border-zinc-300 bg-white px-3.5 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
            >
              {busyAction === 'test' ? 'Verifica...' : 'Testa Connessione'}
            </button>

            <button
              type="button"
              disabled={busyAction !== null}
              onClick={handleLoadFromGitHub}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3.5 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {busyAction === 'load' ? 'Caricamento...' : 'Carica Catalogo da GitHub'}
            </button>

            <button
              type="button"
              disabled={busyAction !== null}
              onClick={handlePublish}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              <GitCommitHorizontal className="h-3.5 w-3.5" />
              {busyAction === 'publish' ? 'Commit in corso...' : 'Pubblica su GitHub'}
            </button>
          </div>
        </section>

        {/* Right: Standalone Export & GitHub Pages Workflow */}
        <section className="space-y-5 rounded-lg border border-zinc-200 bg-white p-6 lg:col-span-5">
          <div className="border-b border-zinc-200 pb-4">
            <h3 className="text-base font-semibold text-zinc-900">
              Esporta File per Commit Manuale
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-600">
              Scarica la pagina vetrina autonoma senza dipendenze e il file di configurazione JSON
              da caricare direttamente nella tua repository.
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={busyAction === 'download'}
              onClick={handleDownloadHtml}
              className="flex w-full items-center justify-between rounded-md border border-zinc-900 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800"
            >
              <span className="inline-flex items-center gap-2">
                <Download className="h-4 w-4" />
                {busyAction === 'download'
                  ? 'Preparazione file...'
                  : 'Scarica index.html (Vetrina Completa)'}
              </span>
              <span className="font-mono text-[11px] opacity-80">HTML5</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadJson}
              className="flex w-full items-center justify-between rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
            >
              <span className="inline-flex items-center gap-2">
                <Download className="h-4 w-4" />
                Scarica catalog.json (Prodotti + Layout)
              </span>
              <span className="font-mono text-[11px] text-zinc-500">JSON</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyHtml}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                {copiedHtml ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedHtml ? 'Copiato' : 'Copia HTML'}
              </button>

              <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                <Upload className="h-3.5 w-3.5" />
                Importa JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleImportJson}
                />
              </label>
            </div>
          </div>

          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-xs leading-relaxed text-zinc-700">
            <div className="mb-2 font-semibold text-zinc-900">
              Come pubblicare su GitHub Pages in 3 passaggi:
            </div>
            <ol className="list-decimal space-y-1.5 pl-4">
              <li>
                Crea o scegli una repository GitHub (es.{' '}
                <code className="font-mono">tuonome/vetrina-prodotti</code>).
              </li>
              <li>
                Pubblica tramite il pannello a sinistra oppure carica{' '}
                <code className="font-mono">index.html</code> nella root del branch{' '}
                <code className="font-mono">main</code>.
              </li>
              <li>
                In GitHub apri <strong>Settings → Pages</strong> e seleziona{' '}
                <strong>Deploy from a branch → main / (root)</strong>. La tua vetrina sarà online
                con URL stabile e layout invariabile.
              </li>
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
};
