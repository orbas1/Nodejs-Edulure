const STRATEGY_ENDPOINT = '/api/v1/strategy/briefing';

async function fetchJson(url, { signal } = {}) {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    const message = `Failed to load strategy briefing (${response.status})`;
    throw new Error(message);
  }
  const payload = await response.json();
  return payload?.data ?? payload;
}

const strategyBriefingApi = {
  async fetchBriefing(options = {}) {
    return fetchJson(STRATEGY_ENDPOINT, options);
  }
};

export default strategyBriefingApi;
