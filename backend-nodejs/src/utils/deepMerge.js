export function deepMerge(base, overrides) {
  const initial = Array.isArray(base) ? [...base] : { ...(base ?? {}) };
  if (!overrides || typeof overrides !== 'object') {
    return initial;
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      initial[key] = [...value];
      continue;
    }

    if (value && typeof value === 'object') {
      const baseValue = initial[key] && typeof initial[key] === 'object' ? initial[key] : {};
      initial[key] = deepMerge(baseValue, value);
      continue;
    }

    initial[key] = value;
  }

  return initial;
}

export default deepMerge;
