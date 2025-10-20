import cors from 'cors';

const ORIGIN_DELIMITER = /[\s,]+/;
const PROTOCOL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;
const DEFAULT_DEVELOPMENT_PORT_HINTS = [
  3000,
  3001,
  3002,
  5173,
  5174,
  4173,
  4174,
  4200,
  4321,
  5000,
  5175,
  6006,
  7000,
  8000,
  8080,
  9000,
  19006
];

function formatUrlOrigin(url) {
  const protocol = url.protocol.toLowerCase();
  const hostname = url.hostname.toLowerCase();
  let port = url.port;

  if (port) {
    const portNumber = Number(port);
    if ((protocol === 'https:' && portNumber === 443) || (protocol === 'http:' && portNumber === 80)) {
      port = '';
    }
  }

  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
}

function normalizeUrlLike(value) {
  try {
    const url = new URL(value);
    return formatUrlOrigin(url);
  } catch (_error) {
    return null;
  }
}

function isLocalAddress(value) {
  const host = value.split(':')[0]?.toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '[::1]' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.localhost')
  );
}

function parseOriginComponents(origin) {
  try {
    const url = new URL(origin);
    const protocol = url.protocol.toLowerCase();
    const hostname = url.hostname.toLowerCase();
    const port = url.port ? Number(url.port) : null;

    return {
      protocol,
      hostname,
      port: Number.isFinite(port) ? port : null
    };
  } catch (_error) {
    return null;
  }
}

function formatOrigin(protocol, hostname, port) {
  const effectivePort = Number.isFinite(port) ? Number(port) : null;
  const omitPort =
    (protocol === 'https:' && (effectivePort === null || effectivePort === 443)) ||
    (protocol === 'http:' && (effectivePort === null || effectivePort === 80));
  const needsBrackets = hostname.includes(':') && !hostname.startsWith('[') && !hostname.endsWith(']');
  const host = needsBrackets ? `[${hostname}]` : hostname;

  return `${protocol}//${host}${omitPort ? '' : `:${effectivePort}`}`;
}

function expandDevelopmentOrigins(exactOrigins, options) {
  const {
    allowDevelopmentOrigins = process.env.NODE_ENV !== 'production',
    developmentPortHints = DEFAULT_DEVELOPMENT_PORT_HINTS
  } = options ?? {};

  if (!allowDevelopmentOrigins) {
    return;
  }

  const portHints = developmentPortHints
    .map((port) => Number(port))
    .filter((port) => Number.isFinite(port) && port > 0);

  const additionalOrigins = new Set();

  for (const origin of exactOrigins) {
    const components = parseOriginComponents(origin);
    if (!components) {
      continue;
    }

    const { protocol, hostname, port } = components;
    if (!isLocalAddress(hostname)) {
      continue;
    }

    const aliasHosts = new Set([hostname]);
    if (hostname === 'localhost') {
      aliasHosts.add('127.0.0.1');
      aliasHosts.add('0.0.0.0');
      aliasHosts.add('::1');
      aliasHosts.add('[::1]');
    } else if (hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      aliasHosts.add('localhost');
      aliasHosts.add('::1');
      aliasHosts.add('[::1]');
    } else if (hostname === '::1' || hostname === '[::1]') {
      aliasHosts.add('localhost');
      aliasHosts.add('127.0.0.1');
      aliasHosts.add('0.0.0.0');
      aliasHosts.add('[::1]');
    }

    if (aliasHosts.has('::1')) {
      aliasHosts.add('[::1]');
    }
    if (aliasHosts.has('[::1]')) {
      aliasHosts.add('::1');
    }

    const schemeCandidates = new Set([protocol]);
    if (protocol === 'http:' || protocol === 'https:') {
      schemeCandidates.add('http:');
      schemeCandidates.add('https:');
    }

    for (const aliasHost of aliasHosts) {
      for (const scheme of schemeCandidates) {
        const portsForScheme = new Set();

        if (scheme === 'http:' || scheme === 'https:') {
          portsForScheme.add(null);
          for (const hint of portHints) {
            portsForScheme.add(hint);
          }
          if (Number.isFinite(port)) {
            portsForScheme.add(port);
          }
        } else if (Number.isFinite(port)) {
          portsForScheme.add(port);
        } else {
          portsForScheme.add(null);
        }

        for (const candidatePort of portsForScheme) {
          additionalOrigins.add(formatOrigin(scheme, aliasHost, candidatePort));
        }
      }
    }
  }

  for (const origin of additionalOrigins) {
    exactOrigins.add(origin);
  }
}

function addCanonicalDomainAliases(exactOrigins) {
  const aliases = new Set();

  for (const origin of exactOrigins) {
    const components = parseOriginComponents(origin);
    if (!components) {
      continue;
    }

    const { protocol, hostname, port } = components;

    if (isLocalAddress(hostname)) {
      continue;
    }

    if (/^\d+(?:\.\d+){3}$/.test(hostname)) {
      continue;
    }

    if (hostname.startsWith('www.')) {
      const bareHost = hostname.slice(4);
      if (bareHost.split('.').length >= 2) {
        aliases.add(formatOrigin(protocol, bareHost, port));
      }
      continue;
    }

    if (hostname.split('.').length === 2) {
      aliases.add(formatOrigin(protocol, `www.${hostname}`, port));
    }
  }

  for (const alias of aliases) {
    exactOrigins.add(alias);
  }
}

function expandConfiguredOrigin(origin) {
  const trimmed = origin.trim();
  if (!trimmed) {
    return [];
  }

  const sanitized = trimmed.replace(/\/$/, '');
  const lowered = sanitized.toLowerCase();

  if (lowered === 'null') {
    return ['null'];
  }

  const attempts = [];

  if (PROTOCOL_PATTERN.test(sanitized)) {
    attempts.push(sanitized);
  } else {
    const schemes = isLocalAddress(sanitized) ? ['http://', 'https://'] : ['https://'];
    for (const scheme of schemes) {
      attempts.push(`${scheme}${sanitized}`);
    }
  }

  const results = new Set();

  for (const attempt of attempts) {
    const normalized = normalizeUrlLike(attempt);
    if (normalized) {
      results.add(normalized);
    }
  }

  if (results.size === 0) {
    results.add(lowered);
  }

  return Array.from(results);
}

function normalizeIncomingOrigin(origin) {
  if (!origin) {
    return null;
  }

  const trimmed = origin.trim();
  if (!trimmed) {
    return null;
  }

  const lowered = trimmed.toLowerCase();
  if (lowered === 'null') {
    return 'null';
  }

  const normalized = normalizeUrlLike(trimmed);
  if (normalized) {
    return normalized;
  }

  if (!PROTOCOL_PATTERN.test(trimmed)) {
    const httpsCandidate = normalizeUrlLike(`https://${trimmed}`);
    if (httpsCandidate) {
      return httpsCandidate;
    }

    const httpCandidate = normalizeUrlLike(`http://${trimmed}`);
    if (httpCandidate) {
      return httpCandidate;
    }
  }

  return lowered;
}

function buildWildcardMatcher(pattern) {
  const sanitized = pattern.trim().replace(/\/$/, '').toLowerCase();
  const escaped = sanitized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regexPattern = `^${escaped.replace(/\\\*/g, '.*')}$`;
  return {
    source: sanitized,
    regex: new RegExp(regexPattern, 'i')
  };
}

export function parseCorsOrigins(input) {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    return input
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  if (typeof input === 'string') {
    return input
      .split(ORIGIN_DELIMITER)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

export function createCorsOriginValidator(originsInput, options = {}) {
  const {
    additionalOrigins,
    allowDevelopmentOrigins,
    developmentPortHints,
    includeWwwAliases = true
  } = options;

  const entries = [...parseCorsOrigins(originsInput), ...parseCorsOrigins(additionalOrigins)];
  let allowAll = entries.length === 0;
  const exactOrigins = new Set();
  const wildcardMatchers = [];
  const wildcardSources = [];

  for (const entry of entries) {
    const sanitized = entry.trim().replace(/\/$/, '');
    if (!sanitized) {
      continue;
    }

    const comparison = sanitized.toLowerCase();
    if (comparison === '*' || comparison === 'true' || comparison === 'all') {
      allowAll = true;
      continue;
    }

    if (sanitized.includes('*')) {
      const matcher = buildWildcardMatcher(sanitized);
      wildcardMatchers.push(matcher);
      wildcardSources.push(matcher.source);

      if (/^https?:\/\/\*\./.test(matcher.source)) {
        const rootCandidate = matcher.source.replace('://*.', '://');
        for (const variant of expandConfiguredOrigin(rootCandidate)) {
          exactOrigins.add(variant);
        }
      }
      continue;
    }

    for (const variant of expandConfiguredOrigin(sanitized)) {
      exactOrigins.add(variant);
    }
  }

  expandDevelopmentOrigins(exactOrigins, { allowDevelopmentOrigins, developmentPortHints });

  if (includeWwwAliases) {
    addCanonicalDomainAliases(exactOrigins);
  }

  if (!allowAll && exactOrigins.size === 0 && wildcardMatchers.length === 0) {
    allowAll = true;
  }

  const isOriginAllowed = (origin) => {
    if (!origin) {
      return true;
    }

    if (allowAll) {
      return true;
    }

    const normalized = normalizeIncomingOrigin(origin);
    if (!normalized) {
      return allowAll;
    }

    if (exactOrigins.has(normalized)) {
      return true;
    }

    return wildcardMatchers.some((matcher) => matcher.regex.test(normalized));
  };

  return {
    allowAll,
    isOriginAllowed,
    getExactOrigins: () => Array.from(exactOrigins),
    getWildcardOrigins: () => [...wildcardSources],
    describe: () => ({
      allowAll,
      exactOrigins: Array.from(exactOrigins),
      wildcardOrigins: [...wildcardSources]
    }),
    middleware: (options = {}) =>
      cors({
        credentials: true,
        optionsSuccessStatus: 200,
        ...options,
        origin(origin, callback) {
          if (isOriginAllowed(origin)) {
            return callback(null, true);
          }

          const error = new Error(`Origin ${origin ?? '<unknown>'} not allowed by CORS policy`);
          error.status = 403;
          return callback(error);
        }
      })
  };
}

export function createCorsMiddleware(originsInput, options = {}) {
  const { policyOptions = {}, ...corsOptions } = options;
  const policy = createCorsOriginValidator(originsInput, policyOptions);
  return {
    policy,
    middleware: policy.middleware(corsOptions)
  };
}
