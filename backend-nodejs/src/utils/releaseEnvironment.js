export function normalizeReleaseEnvironmentName(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return '';
  }

  const normalised = trimmed
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalised;
}
