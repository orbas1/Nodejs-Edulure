import { useCallback, useEffect, useState } from 'react';

import { fetchUserConsents, revokeConsent } from '../api/complianceApi.js';
import { useAuth } from '../context/AuthContext.jsx';

export function useConsentRecords(userId) {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken;
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!token || !userId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchUserConsents({ token, userId });
      setConsents(payload ?? []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load consent records'));
    } finally {
      setLoading(false);
    }
  }, [token, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const revoke = useCallback(
    async ({ consentId, reason }) => {
      if (!token) {
        throw new Error('Not authenticated');
      }
      await revokeConsent({ token, consentId, reason });
      await load();
    },
    [token, load]
  );

  return { consents, loading, error, refresh: load, revokeConsent: revoke };
}

export default useConsentRecords;
