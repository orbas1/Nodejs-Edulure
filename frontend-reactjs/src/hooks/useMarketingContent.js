import { useEffect, useMemo, useState } from 'react';

import { fetchMarketingLandingContent } from '../api/marketingApi.js';

export default function useMarketingContent(options = {}) {
  const query = useMemo(() => {
    const payload = {};
    if (options.types) {
      payload.types = options.types;
    }
    if (options.email) {
      payload.email = options.email;
    }
    return payload;
  }, [options.email, options.types]);

  const [data, setData] = useState({ blocks: [], plans: [], invites: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMarketingLandingContent(query)
      .then((payload) => {
        if (!cancelled) {
          setData({
            blocks: Array.isArray(payload.blocks) ? payload.blocks : [],
            plans: Array.isArray(payload.plans) ? payload.plans : [],
            invites: Array.isArray(payload.invites) ? payload.invites : []
          });
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  return { data, loading, error };
}
