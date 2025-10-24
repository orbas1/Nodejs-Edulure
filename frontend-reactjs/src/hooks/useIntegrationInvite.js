import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchIntegrationInvite, submitIntegrationInvite } from '../api/integrationInviteApi.js';

const DEFAULT_FORM = {
  key: '',
  rotationIntervalDays: '',
  keyExpiresAt: '',
  actorEmail: '',
  actorName: '',
  reason: ''
};

function computeCountdown(expiresAt) {
  if (!expiresAt) {
    return null;
  }
  const target = new Date(expiresAt).getTime();
  if (Number.isNaN(target)) {
    return null;
  }
  const now = Date.now();
  const delta = Math.max(0, target - now);
  const expired = delta === 0;
  const totalSeconds = Math.floor(delta / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { expired, days, hours, minutes, seconds, totalSeconds };
}

export default function useIntegrationInvite({ inviteToken }) {
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [countdown, setCountdown] = useState(null);
  const [documentationStatus, setDocumentationStatus] = useState({ state: 'unknown', url: null });
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const countdownRef = useRef(null);
  const activeRequestRef = useRef(null);

  const load = useCallback(async () => {
    if (!inviteToken) {
      setInvite(null);
      setError(new Error('Invitation token is required'));
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      if (activeRequestRef.current) {
        activeRequestRef.current.abort();
      }
      const controller = new AbortController();
      activeRequestRef.current = controller;
      const response = await fetchIntegrationInvite({ token: inviteToken, signal: controller.signal });
      setInvite(response ?? null);
      setLastFetchedAt(new Date().toISOString());
      return response ?? null;
    } catch (err) {
      if (err?.name === 'AbortError' || err?.message === 'canceled') {
        return null;
      }
      setError(err instanceof Error ? err : new Error('Unable to load invitation'));
      setInvite(null);
      return null;
    } finally {
      setLoading(false);
      if (activeRequestRef.current) {
        activeRequestRef.current = null;
      }
    }
  }, [inviteToken]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!invite) {
      setForm(DEFAULT_FORM);
      return;
    }
    setForm((prev) => ({
      ...prev,
      rotationIntervalDays: invite.rotationIntervalDays ? String(invite.rotationIntervalDays) : prev.rotationIntervalDays ?? '',
      keyExpiresAt: invite.keyExpiresAt ? invite.keyExpiresAt.slice(0, 10) : prev.keyExpiresAt ?? '',
      actorEmail: invite.ownerEmail ?? prev.actorEmail ?? '',
      reason: invite.reason ?? prev.reason ?? ''
    }));
  }, [invite]);

  useEffect(() => {
    if (!invite?.expiresAt) {
      setCountdown(null);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      return;
    }

    const updateCountdown = () => {
      setCountdown(computeCountdown(invite.expiresAt));
    };

    updateCountdown();
    countdownRef.current = setInterval(updateCountdown, 1_000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [invite?.expiresAt]);

  useEffect(() => () => {
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
      activeRequestRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!invite?.documentationUrl) {
      setDocumentationStatus({ state: 'missing', url: null });
      return;
    }
    let cancelled = false;
    const url = invite.documentationUrl;
    setDocumentationStatus({ state: 'checking', url });

    if (typeof fetch !== 'function') {
      setDocumentationStatus({ state: 'unknown', url });
      return undefined;
    }

    fetch(url, { method: 'HEAD', mode: 'no-cors' })
      .then((response) => {
        if (cancelled) return;
        if (!response || response.type === 'opaque') {
          setDocumentationStatus({ state: 'unknown', url });
        } else if (response.ok) {
          setDocumentationStatus({ state: 'ok', url });
        } else {
          setDocumentationStatus({ state: 'warning', url });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDocumentationStatus({ state: 'warning', url });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [invite?.documentationUrl]);

  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const resetKey = useCallback(() => {
    setForm((prev) => ({ ...prev, key: '' }));
  }, []);

  const submit = useCallback(async () => {
    if (!inviteToken) {
      setStatus('error');
      setMessage('Invitation token missing.');
      return { ok: false };
    }

    if (countdown?.expired) {
      setStatus('error');
      setMessage('This invitation has expired. Request a new credential slot.');
      return { ok: false };
    }

    const trimmedKey = form.key.trim();
    if (trimmedKey.length < 20) {
      setStatus('error');
      setMessage('API key must be at least 20 characters long.');
      return { ok: false };
    }

    setStatus('submitting');
    setMessage(null);

    try {
      const payload = await submitIntegrationInvite({
        token: inviteToken,
        key: trimmedKey,
        rotationIntervalDays: form.rotationIntervalDays || undefined,
        keyExpiresAt: form.keyExpiresAt || undefined,
        actorEmail: form.actorEmail?.trim() || undefined,
        actorName: form.actorName?.trim() || undefined,
        reason: form.reason?.trim() || undefined
      });
      setStatus('success');
      setMessage('Credential received. Operations will verify connectivity and rotation.');
      if (payload?.invite) {
        setInvite(payload.invite);
      }
      resetKey();
      return { ok: true, payload };
    } catch (err) {
      setStatus('error');
      setMessage(err?.message ?? 'Unable to submit credential');
      return { ok: false };
    }
  }, [inviteToken, form, countdown, resetKey]);

  const isExpired = useMemo(() => countdown?.expired ?? false, [countdown]);

  return {
    invite,
    loading,
    error,
    status,
    message,
    form,
    updateField,
    submit,
    countdown,
    documentationStatus,
    refresh: load,
    isExpired,
    lastFetchedAt
  };
}
