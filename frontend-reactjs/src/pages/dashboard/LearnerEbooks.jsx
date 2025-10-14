import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { createEbookPurchaseIntent, listMarketplaceEbooks } from '../../api/ebookApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

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
  const marketplaceGrid = useMemo(() => marketplace.slice(0, 9), [marketplace]);

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
        <section className="grid gap-4 md:grid-cols-3">
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
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {marketplaceGrid.map((ebook) => (
                <div key={ebook.id} className="dashboard-section flex flex-col justify-between">
                  <div>
                    <p className="dashboard-kicker">Featured release</p>
                    <h2 className="mt-2 text-lg font-semibold text-slate-900">{ebook.title}</h2>
                    {ebook.subtitle ? <p className="mt-1 text-sm text-slate-600">{ebook.subtitle}</p> : null}
                    <p className="mt-3 text-xs text-slate-500">Downloads · {ebook.analytics.downloads.toLocaleString()}</p>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{ebook.price?.formatted ?? 'Contact us'}</p>
                      <p className="text-xs text-slate-500">{ebook.analytics.revenueFormatted || 'No purchases yet'}</p>
                    </div>
                    <button
                      type="button"
                      className={`dashboard-primary-pill px-4 py-2 text-xs ${
                        pendingPurchaseId === ebook.id ? 'pointer-events-none opacity-60' : ''
                      }`}
                      onClick={() => handlePurchase(ebook)}
                      disabled={pendingPurchaseId === ebook.id}
                      aria-busy={pendingPurchaseId === ebook.id}
                    >
                      {pendingPurchaseId === ebook.id ? 'Preparing…' : 'Secure checkout'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {purchaseStatus ? (
            <div
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
