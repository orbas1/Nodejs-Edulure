const DESIGN_SYSTEM_ENDPOINT = '/api/v1/design-system/tokens';

async function fetchJson(url, { signal } = {}) {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    const message = `Failed to load design system tokens (${response.status})`;
    throw new Error(message);
  }
  const payload = await response.json();
  return payload?.data ?? payload;
}

const designSystemApi = {
  async fetchTokens(options = {}) {
    return fetchJson(DESIGN_SYSTEM_ENDPOINT, options);
  }
};

export default designSystemApi;
