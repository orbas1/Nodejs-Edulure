import { useEffect, useMemo, useRef, useState } from 'react';

import { previewCoupon } from '../api/paymentsApi.js';
import { useAuth } from '../context/AuthContext.jsx';

const STATUS = Object.freeze({
  idle: 'idle',
  pending: 'pending',
  valid: 'valid',
  invalid: 'invalid',
  error: 'error'
});

export default function useCouponValidation({
  code,
  currency,
  enabled = true,
  debounceMs = 400
} = {}) {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const [state, setState] = useState({ status: STATUS.idle, coupon: null, error: null });
  const abortRef = useRef(null);

  useEffect(() => {
    const trimmed = typeof code === 'string' ? code.trim() : '';
    if (!enabled || !token) {
      setState({ status: STATUS.idle, coupon: null, error: null });
      return () => {};
    }
    if (!trimmed) {
      setState({ status: STATUS.idle, coupon: null, error: null });
      return () => {};
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const timeout = setTimeout(async () => {
      setState((prev) => ({ ...prev, status: STATUS.pending, error: null }));
      try {
        const preview = await previewCoupon({
          token,
          code: trimmed,
          currency,
          signal: controller.signal
        });
        setState({ status: STATUS.valid, coupon: preview?.coupon ?? null, error: null, redemption: preview?.redemption ?? null });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        const status = error?.response?.status ?? error?.status;
        if (status === 404 || status === 409) {
          setState({ status: STATUS.invalid, coupon: null, error });
        } else {
          setState({ status: STATUS.error, coupon: null, error });
        }
      }
    }, Math.max(0, debounceMs));

    return () => {
      clearTimeout(timeout);
      controller.abort();
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    };
  }, [code, currency, debounceMs, enabled, token]);

  return useMemo(
    () => ({
      status: state.status,
      coupon: state.coupon,
      redemption: state.redemption ?? null,
      error: state.error,
      validating: state.status === STATUS.pending
    }),
    [state.coupon, state.error, state.redemption, state.status]
  );
}
