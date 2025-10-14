import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { createEbookPurchaseIntent, listMarketplaceEbooks } from '../../api/ebookApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

function normaliseTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

function MarketplaceCard({ ebook, highlight, onPurchase, pending }) {
  const downloads = ebook.analytics?.downloads ?? 0;
  const readers = ebook.analytics?.readers ?? 0;
  const purchases = ebook.analytics?.purchases ?? 0;
  const price = ebook.price?.formatted ?? 'Contact us';

  return (
    <div
      className={`flex h-full flex-col justify-between rounded-3xl border p-6 shadow-sm transition ${
        highlight
          ? 'border-primary/20 bg-gradient-to-br from-primary/10 via-white to-primary/5'
          : 'border-slate-200 bg-white hover:border-primary/40'
      }`}
    >
      <div className="space-y-3">
        <p className={`dashboard-kicker ${highlight ? 'text-primary-dark' : ''}`}>{highlight ? 'Featured drop' : 'Marketplace'}</p>
        <h2 className="text-lg font-semibold text-slate-900">{ebook.title}</h2>
        {ebook.subtitle ? <p className="text-sm text-slate-600">{ebook.subtitle}</p> : null}
        <div className="text-xs text-slate-500">
          <p>Downloads · {downloads.toLocaleString()}</p>
          <p>Active readers · {readers.toLocaleString()}</p>
          <p>Purchases · {purchases.toLocaleString()}</p>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">{price}</p>
          <p className="text-xs text-slate-500">Secure checkout powered by Edulure</p>
        </div>
        <button
          type="button"
          className={`dashboard-primary-pill px-4 py-2 text-xs ${pending ? 'pointer-events-none opacity-60' : ''}`}
          onClick={() => onPurchase(ebook)}
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? 'Preparing…' : 'Secure checkout'}
        </button>
      </div>
    </div>
  );
}

MarketplaceCard.propTypes = {
  ebook: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    price: PropTypes.shape({ formatted: PropTypes.string }),
    analytics: PropTypes.shape({
      downloads: PropTypes.number,
      readers: PropTypes.number,
      purchases: PropTypes.number
    })
  }).isRequired,
  highlight: PropTypes.bool,
  onPurchase: PropTypes.func.isRequired,
  pending: PropTypes.bool
};

MarketplaceCard.defaultProps = {
  highlight: false,
  pending: false
};

export default function LearnerEbooks() {
  const { dashboard, refresh } = useOutletContext();
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const ebooks = dashboard?.ebooks;

  const [activeTab, setActiveTab] = useState('library');
  const [marketplace, setMarketplace] = useState([]);
  const [loadingMarketplace, setLoadingMarketplace] = useState(false);
  const [marketplaceError, setMarketplaceError] = useState(null);
  const [purchaseStatus, setPurchaseStatus] = useState(null);
  const [pendingPurchaseId, setPendingPurchaseId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingMarketplace(true);
    setMarketplaceError(null);
    listMarketplaceEbooks({ signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) {
          setMarketplace(response ?? []);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setMarketplaceError(error instanceof Error ? error : new Error('Unable to load marketplace'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingMarketplace(false);
        }
      });
    return () => controller.abort();
  }, []);

  const library = ebooks?.library ?? [];
  const recommendations = useMemo(() => (ebooks?.recommendations ?? []).slice(0, 3), [ebooks?.recommendations]);
  const marketplaceHighlights = useMemo(() => marketplace.slice(0, 3), [marketplace]);
  const marketplaceCatalogue = useMemo(() => marketplace.slice(3, 12), [marketplace]);

  useEffect(() => {
    if (activeTab !== 'marketplace' && purchaseStatus?.type !== 'success') {
      setPurchaseStatus(null);
      setPendingPurchaseId(null);
    }
  }, [activeTab, purchaseStatus]);

  const handlePurchase = useCallback(
    async (ebook) => {
      if (!token) {
        setPurchaseStatus({ type: 'error', message: 'You need to be signed in to purchase this title.' });
        return;
      }
      setPendingPurchaseId(ebook.id);
      setPurchaseStatus({ type: 'pending', message: `Creating secure checkout for ${ebook.title}…` });
      try {
        const payload = await createEbookPurchaseIntent({
          token,
          ebookId: ebook.id,
          payload: { provider: 'stripe' }
        });
        const clientSecret = payload.payment?.clientSecret ?? null;
        const approvalUrl = payload.payment?.approvalUrl ?? null;
        const nextSteps =
          approvalUrl || clientSecret
            ? `Use the ${approvalUrl ? 'provided approval link' : 'Stripe client secret'} to complete payment.`
            : 'Proceed to checkout using the supplied payment ID.';
        setPurchaseStatus({
          type: 'success',
          message: `Secure checkout created for ${ebook.title}. Reference ${payload.payment?.paymentId ?? 'N/A'}. ${nextSteps}`
        });
      } catch (error) {
        setPurchaseStatus({
          type: 'error',
          message: error instanceof Error ? error.message : 'Payment initialisation failed.'
        });
      } finally {
        setPendingPurchaseId(null);
      }
    },
    [token]
  );

  if (!ebooks) {
    return (
      <DashboardStateMessage
        title="E-book workspace unavailable"
        description="We could not load your library insights. Refresh to try pulling the latest progress and highlights."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="dashboard-title">E-book experiences</h1>
          <p className="dashboard-subtitle">
            Revisit your library or discover premium playbooks curated by trusted instructors.
          </p>
        </div>
        <div className="flex gap-2 rounded-full border border-slate-200 bg-white p-1 text-sm shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`rounded-full px-4 py-2 font-medium transition ${
              activeTab === 'library' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:text-primary'
            }`}
          >
            My library
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('marketplace')}
            className={`rounded-full px-4 py-2 font-medium transition ${
              activeTab === 'marketplace' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:text-primary'
            }`}
          >
            Marketplace
          </button>
        </div>
      </div>

      {activeTab === 'library' ? (
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {library.length > 0 ? (
              library.map((ebook) => (
                <div key={ebook.id} className="dashboard-section">
                  <p className="dashboard-kicker">{ebook.format}</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">{ebook.title}</h2>
                  <p className="mt-2 text-sm text-slate-600">Last opened {ebook.lastOpened}</p>
                  <div className="mt-4 h-2 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark"
                      style={{ width: `${ebook.progress}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{ebook.progress}% complete</p>
                  <div className="mt-4 flex items-center gap-3 text-xs text-slate-600">
                    <button type="button" className="dashboard-pill px-3 py-1">
                      Continue reading
                    </button>
                    <button type="button" className="dashboard-pill px-3 py-1">
                      Share highlight
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <DashboardStateMessage
                className="md:col-span-3"
                title="No saved e-books yet"
                description="Import resources or sync from your reader integrations to populate this space."
                actionLabel="Refresh"
                onAction={() => refresh?.()}
              />
            )}
          </div>

          {recommendations.length > 0 ? (
            <div className="dashboard-card border border-primary/20 bg-gradient-to-r from-primary/5 via-white to-primary/5 px-6 py-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="dashboard-kicker text-primary-dark">Personalised next reads</p>
                  <h2 className="text-lg font-semibold text-slate-900">Curated titles to continue your momentum</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Hand-picked based on your current curriculum and the communities you are active in.
                  </p>
                </div>
                <Link to="/explorer?tab=ebooks" className="dashboard-primary-pill px-5 py-2 text-xs">
                  Explore catalogue
                </Link>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {recommendations.map((item) => (
                  <div
                    key={item.id ?? item.slug ?? item.title}
                    className="rounded-3xl border border-white/40 bg-white/80 p-5 shadow-sm"
                  >
                    <p className="dashboard-kicker text-slate-400">{item.category ?? 'Recommended'}</p>
                    <h3 className="mt-2 text-base font-semibold text-slate-900">{item.title}</h3>
                    {item.subtitle ? <p className="mt-2 text-sm text-slate-600">{item.subtitle}</p> : null}
                    <p className="mt-4 text-xs text-slate-500">
                      Estimated {item.readingTime ?? item.readingTimeMinutes ?? '45'} minutes
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                      {normaliseTags(item.tags)
                        .slice(0, 3)
                        .map((tag) => (
                        <span key={tag} className="dashboard-pill bg-white px-3 py-1">
                          {tag}
                        </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="space-y-6">
          {marketplaceError ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              {marketplaceError.message}
            </div>
          ) : null}
          {loadingMarketplace ? (
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6">
                  <div className="h-3 w-24 rounded-full bg-slate-200" />
                  <div className="mt-4 h-4 w-32 rounded-full bg-slate-200" />
                  <div className="mt-3 h-2 w-full rounded-full bg-slate-100" />
                  <div className="mt-2 h-2 w-3/4 rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          ) : marketplaceHighlights.length + marketplaceCatalogue.length > 0 ? (
            <div className="space-y-6">
              {marketplaceHighlights.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {marketplaceHighlights.map((ebook) => (
                    <MarketplaceCard
                      key={ebook.id}
                      ebook={ebook}
                      highlight
                      onPurchase={handlePurchase}
                      pending={pendingPurchaseId === ebook.id}
                    />
                  ))}
                </div>
              ) : null}

              {marketplaceCatalogue.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {marketplaceCatalogue.map((ebook) => (
                    <MarketplaceCard
                      key={ebook.id}
                      ebook={ebook}
                      onPurchase={handlePurchase}
                      pending={pendingPurchaseId === ebook.id}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <DashboardStateMessage
              title="Marketplace is getting ready"
              description="We are onboarding new author releases. Check back soon for fresh playbooks and frameworks."
              actionLabel="Refresh"
              onAction={() => refresh?.()}
            />
          )}

          {purchaseStatus ? (
            <div
              role="status"
              aria-live="polite"
              className={`rounded-3xl border px-5 py-4 text-sm ${
                purchaseStatus.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : purchaseStatus.type === 'error'
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-primary/20 bg-primary/5 text-primary'
              }`}
            >
              {purchaseStatus.message}
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
