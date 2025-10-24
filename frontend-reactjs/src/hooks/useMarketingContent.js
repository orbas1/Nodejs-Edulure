import { useEffect, useMemo, useState } from 'react';

import { fetchMarketingLandingContent } from '../api/marketingApi.js';

const serialiseList = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
};

const serialiseForMemo = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return JSON.stringify([...value]);
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value;
};

export default function useMarketingContent(options = {}) {
  const query = useMemo(() => {
    const payload = {};
    if (options.types) {
      payload.types = serialiseList(options.types);
    }
    if (options.email) {
      payload.email = options.email;
    }
    if (options.surfaces) {
      payload.surfaces = serialiseList(options.surfaces);
    }
    if (options.variants) {
      payload.variants = serialiseList(options.variants);
    }
    return payload;
  }, [
    options.email,
    serialiseForMemo(options.types),
    serialiseForMemo(options.surfaces),
    serialiseForMemo(options.variants)
  ]);

  const [data, setData] = useState({ blocks: [], plans: [], invites: [], testimonials: [] });
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
            invites: Array.isArray(payload.invites) ? payload.invites : [],
            testimonials: Array.isArray(payload.testimonials) ? payload.testimonials : []
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
