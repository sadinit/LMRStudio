import { useEffect, useState } from 'react';
import { GitHubPublisher } from './components/GitHubPublisher';
import { LayoutStudio } from './components/LayoutStudio';
import { ProductsManager } from './components/ProductsManager';
import { ShowcasePreview } from './components/ShowcasePreview';
import { DEFAULT_GITHUB_CONFIG, DEFAULT_SHOWCASE_DOCUMENT } from './data/defaultShowcase';
import { GitHubConfig, ShowcaseDocument } from './types/showcase';

type WorkspaceTab = 'preview' | 'products' | 'layout' | 'github';

const DOC_STORAGE_KEY = 'vetrinakit_showcase_doc_v1';
const GH_META_STORAGE_KEY = 'vetrinakit_github_meta_v1';
const GH_TOKEN_SESSION_KEY = 'vetrinakit_github_token_session';
const GH_TOKEN_LOCAL_KEY = 'vetrinakit_github_token_local';

function loadInitialDocument(): ShowcaseDocument {
  try {
    const raw = localStorage.getItem(DOC_STORAGE_KEY);
    if (!raw) return DEFAULT_SHOWCASE_DOCUMENT;
    const parsed = JSON.parse(raw) as ShowcaseDocument;
    if (parsed && parsed.layout && Array.isArray(parsed.products)) {
      return parsed;
    }
  } catch {
    // fallback to default
  }
  return DEFAULT_SHOWCASE_DOCUMENT;
}

function loadInitialGitHubConfig(): GitHubConfig {
  try {
    const raw = localStorage.getItem(GH_META_STORAGE_KEY);
    const base = raw
      ? { ...DEFAULT_GITHUB_CONFIG, ...(JSON.parse(raw) as Partial<GitHubConfig>) }
      : DEFAULT_GITHUB_CONFIG;
    const token =
      (base.rememberTokenLocally ? localStorage.getItem(GH_TOKEN_LOCAL_KEY) : null) ||
      sessionStorage.getItem(GH_TOKEN_SESSION_KEY) ||
      '';
    return { ...base, token };
  } catch {
    return DEFAULT_GITHUB_CONFIG;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('preview');
  const [doc, setDoc] = useState<ShowcaseDocument>(loadInitialDocument);
  const [githubConfig, setGithubConfig] = useState<GitHubConfig>(loadInitialGitHubConfig);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    () => doc.products[0]?.id || null
  );

  useEffect(() => {
    try {
      localStorage.setItem(DOC_STORAGE_KEY, JSON.stringify(doc));
    } catch {
      // Ignore quota exceeded on large inline data URLs
    }
  }, [doc]);

  useEffect(() => {
    try {
      const { token, ...metaOnly } = githubConfig;
      localStorage.setItem(GH_META_STORAGE_KEY, JSON.stringify(metaOnly));
      if (token) {
        sessionStorage.setItem(GH_TOKEN_SESSION_KEY, token);
        if (githubConfig.rememberTokenLocally) {
          localStorage.setItem(GH_TOKEN_LOCAL_KEY, token);
        } else {
          localStorage.removeItem(GH_TOKEN_LOCAL_KEY);
        }
      } else {
        sessionStorage.removeItem(GH_TOKEN_SESSION_KEY);
        localStorage.removeItem(GH_TOKEN_LOCAL_KEY);
      }
    } catch {
      // Ignore storage failures
    }
  }, [githubConfig]);

  const navItems: Array<{ id: WorkspaceTab; label: string }> = [
    { id: 'preview', label: 'Vetrina Live' },
    { id: 'products', label: 'Prodotti & Prezzi' },
    { id: 'layout', label: 'Studio Layout' },
    { id: 'github', label: 'GitHub & Esporta' },
  ];

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-zinc-900">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-[#F8F7F4]/95 backdrop-blur-xs">
        <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-8 px-6">
          {/* Zone 1: Single text wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className="text-lg font-bold tracking-tight text-zinc-950 whitespace-nowrap shrink-0"
          >
            VetrinaKit
          </button>

          {/* Zone 2: 4 clean single-line navigation links */}
          <nav className="flex items-center gap-6 overflow-x-auto text-sm font-medium">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`border-b-2 py-5 transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-zinc-950 text-zinc-950'
                      : 'border-transparent text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('github')}
              className="rounded-md bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 whitespace-nowrap shrink-0"
            >
              Pubblica su GitHub
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1360px] px-6 py-6">
        {activeTab === 'preview' && (
          <ShowcasePreview
            doc={doc}
            onGoToLayout={() => setActiveTab('layout')}
            onEditProduct={(productId) => {
              setSelectedProductId(productId);
              setActiveTab('products');
            }}
          />
        )}

        {activeTab === 'products' && (
          <ProductsManager
            products={doc.products}
            layout={doc.layout}
            selectedProductId={selectedProductId}
            onSelectProductId={setSelectedProductId}
            onChangeProducts={(nextProducts) =>
              setDoc((prev) => ({
                ...prev,
                updatedAt: new Date().toISOString(),
                products: nextProducts,
              }))
            }
          />
        )}

        {activeTab === 'layout' && (
          <LayoutStudio
            layout={doc.layout}
            brand={doc.brand}
            onChangeLayout={(nextLayout) =>
              setDoc((prev) => ({
                ...prev,
                updatedAt: new Date().toISOString(),
                layout: nextLayout,
              }))
            }
            onChangeBrand={(nextBrand) =>
              setDoc((prev) => ({
                ...prev,
                updatedAt: new Date().toISOString(),
                brand: nextBrand,
              }))
            }
            onPreviewShowcase={() => setActiveTab('preview')}
          />
        )}

        {activeTab === 'github' && (
          <GitHubPublisher
            doc={doc}
            githubConfig={githubConfig}
            onChangeGitHubConfig={setGithubConfig}
            onReplaceDocument={(nextDoc) => {
              setDoc(nextDoc);
              setSelectedProductId(nextDoc.products[0]?.id || null);
            }}
          />
        )}
      </main>
    </div>
  );
}
