import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  createBillingPortalSession,
  fetchBillingOverview,
  listBillingInvoices,
  listBillingPaymentMethods
} from '../api/billingPortalApi.js';
import { useAuth } from '../context/AuthContext.jsx';

const INITIAL_STATE = {
  overview: null,
  paymentMethods: [],
  invoices: [],
  loading: false,
  error: null,
  portalStatus: 'idle',
  portalError: null,
  lastLoadedAt: null
};

export default function useBillingPortal({ autoLoad = true } = {}) {
  const { token } = useAuth();
  const [state, setState] = useState(INITIAL_STATE);
  const stateRef = useRef(INITIAL_STATE);
  const loadingRef = useRef(false);
  const throttleRef = useRef(0);

  const load = useCallback(
    async ({ force = false } = {}) => {
      if (!token) {
        setState((prev) => ({ ...prev, overview: null, paymentMethods: [], invoices: [], error: null, loading: false }));
        return null;
      }

      const now = Date.now();
      if (!force && now - throttleRef.current < 5_000) {
        return stateRef.current;
      }

      throttleRef.current = now;
      loadingRef.current = true;
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const controller = new AbortController();
        const [overview, methods, invoices] = await Promise.all([
          fetchBillingOverview({ token, signal: controller.signal }).catch((error) => {
            throw error;
          }),
          listBillingPaymentMethods({ token, signal: controller.signal }).catch(() => []),
          listBillingInvoices({ token, signal: controller.signal }).catch(() => [])
        ]);

        setState((prev) => ({
          ...prev,
          overview,
          paymentMethods: methods,
          invoices,
          loading: false,
          error: null,
          lastLoadedAt: new Date().toISOString()
        }));
        return { overview, methods, invoices };
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error?.message ?? 'Unable to load billing details. Please try again shortly.'
        }));
        return null;
      } finally {
        loadingRef.current = false;
      }
    },
    [token]
  );

  useEffect(() => {
    if (!autoLoad) {
      return;
    }
    load();
  }, [autoLoad, load]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const launchPortal = useCallback(
    async ({ returnUrl } = {}) => {
      if (!token) {
        setState((prev) => ({ ...prev, portalStatus: 'error', portalError: 'Sign in required to manage billing.' }));
        return null;
      }

      setState((prev) => ({ ...prev, portalStatus: 'loading', portalError: null }));
      try {
        const session = await createBillingPortalSession({ token, returnUrl });
        if (!session?.url) {
          throw new Error('Billing portal URL was not returned.');
        }
        setState((prev) => ({ ...prev, portalStatus: 'success', portalError: null }));
        return session.url;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          portalStatus: 'error',
          portalError: error?.message ?? 'Unable to open the billing portal.'
        }));
        return null;
      }
    },
    [token]
  );

  const resetPortalStatus = useCallback(() => {
    setState((prev) => ({ ...prev, portalStatus: 'idle', portalError: null }));
  }, []);

  const derived = useMemo(() => {
    const { overview, paymentMethods, invoices, loading, error, portalStatus, portalError, lastLoadedAt } = state;

    return {
      overview,
      paymentMethods,
      invoices,
      loading,
      error,
      portalStatus,
      portalError,
      lastLoadedAt,
      hasData: Boolean(overview || paymentMethods.length || invoices.length)
    };
  }, [state]);

  return {
    ...derived,
    refresh: load,
    launchPortal,
    resetPortalStatus
  };
}
