import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_ROOT = path.join(__dirname, 'generated');
const INDEX_FILE_PATH = path.join(GENERATED_ROOT, 'index.json');

const SERVICE_IDENTIFIER_PATTERN = /^[a-z0-9-]+$/i;
const ISO_INSTANT_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/;
const HEX_CHECKSUM_PATTERN = /^[a-f0-9]{64}$/i;

const SERVICE_DESCRIPTOR_SCHEMA = z
  .object({
    service: z.string().min(1),
    name: z.string().min(1),
    capability: z.string().min(1),
    version: z.string().min(1),
    description: z.string().min(1),
    basePath: z
      .string()
      .min(1)
      .transform((value) => value.trim())
      .refine((value) => value.startsWith('/'), {
        message: 'OpenAPI base paths must be absolute.'
      }),
    file: z.string().optional(),
    documentationUrl: z.string().url().optional(),
    checksum: z
      .string()
      .trim()
      .regex(HEX_CHECKSUM_PATTERN, 'OpenAPI checksum must be a SHA-256 hex digest.')
      .optional(),
    lastUpdated: z
      .string()
      .trim()
      .refine((value) => {
        if (!value) {
          return true;
        }

        const parsed = Date.parse(value);
        return Number.isFinite(parsed) && ISO_INSTANT_PATTERN.test(new Date(parsed).toISOString());
      }, 'lastUpdated must be an ISO-8601 instant string.')
      .optional()
  })
  .transform((descriptor) => {
    const normalisedService = descriptor.service.trim();
    if (!SERVICE_IDENTIFIER_PATTERN.test(normalisedService)) {
      throw new Error(`Invalid service identifier '${descriptor.service}'.`);
    }

    const normalisedVersion = descriptor.version.trim().toLowerCase();
    if (!/^v\d+(?:\.\d+)?$/.test(normalisedVersion)) {
      throw new Error(`Unsupported OpenAPI version tag '${descriptor.version}'.`);
    }

    const sanitisedBasePath = descriptor.basePath.replace(/\/$/, '') || '/';

    const normalisedDocumentationUrl = descriptor.documentationUrl?.trim();
    const normalisedChecksum = descriptor.checksum?.toLowerCase();
    const trimmedFile = descriptor.file?.trim();
    const lastUpdatedIso = descriptor.lastUpdated
      ? new Date(descriptor.lastUpdated).toISOString()
      : undefined;

    return {
      service: normalisedService.toLowerCase(),
      name: descriptor.name.trim(),
      capability: descriptor.capability.trim(),
      version: normalisedVersion,
      description: descriptor.description.trim(),
      basePath: sanitisedBasePath,
      file: trimmedFile,
      documentationUrl: normalisedDocumentationUrl,
      checksum: normalisedChecksum,
      lastUpdated: lastUpdatedIso
    };
  });

const SPEC_INDEX_SCHEMA = z.object({
  generatedAt: z.string().optional(),
  baseSpec: z.string().optional(),
  services: z.array(SERVICE_DESCRIPTOR_SCHEMA).min(1)
});

let cachedRegistry;
const specCache = new Map();

const REQUIRED_DESCRIPTOR_FIELDS = ['service', 'capability', 'description', 'version'];

function normalizeServiceKey(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim().toLowerCase();
}

function ensureLeadingSlash(value, fallback) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return `/${fallback}`;
  }

  if (/\s/u.test(trimmed)) {
    throw new Error(`Base path for service '${fallback}' must not contain whitespace.`);
  }

  const withoutPrefix = trimmed.replace(/^\/+/u, '');
  return `/${withoutPrefix}`;
}

function readJsonFile(filePath, contextLabel) {
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch (error) {
    const wrapped = new Error(`${contextLabel} not found at ${filePath}`);
    wrapped.cause = error;
    wrapped.code = error.code;
    throw wrapped;
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    const wrapped = new Error(`Unable to parse ${contextLabel} at ${filePath}: ${error.message}`);
    wrapped.cause = error;
    throw wrapped;
  }
}

function resolveDocumentPath(rawFile, serviceId, version) {
  const defaultPath = path.join(serviceId, version, 'openapi.json');
  const candidate = String(rawFile ?? defaultPath).trim().replace(/^\.\//u, '');
  const resolvedPath = path.resolve(GENERATED_ROOT, candidate);

  if (!resolvedPath.startsWith(GENERATED_ROOT)) {
    throw new Error(
      `OpenAPI document for service '${serviceId}' resolved outside of generated spec directory`
    );
  }

  return resolvedPath;
}

function sanitizeDescriptor(rawDescriptor, indexPath, descriptorIndex) {
  if (!rawDescriptor || typeof rawDescriptor !== 'object') {
    throw new Error(
      `OpenAPI index at ${indexPath} contains an invalid descriptor at position ${descriptorIndex}`
    );
  }

  for (const field of REQUIRED_DESCRIPTOR_FIELDS) {
    if (!rawDescriptor[field]) {
      throw new Error(
        `OpenAPI index at ${indexPath} is missing required field '${field}' for descriptor ${descriptorIndex}`
      );
    }
  }

  const serviceId = String(rawDescriptor.service).trim();
  if (!serviceId) {
    throw new Error(
      `OpenAPI index at ${indexPath} declares an empty service identifier for descriptor ${descriptorIndex}`
    );
  }

  const name = rawDescriptor.name ? String(rawDescriptor.name).trim() : serviceId;
  const capability = String(rawDescriptor.capability).trim();
  const version = String(rawDescriptor.version).trim();
  const description = String(rawDescriptor.description).trim();

  if (!capability || !version || !description) {
    throw new Error(
      `OpenAPI index at ${indexPath} is missing required metadata for service '${serviceId}'.`
    );
  }
  const basePath = ensureLeadingSlash(rawDescriptor.basePath, serviceId);
  const documentPath = resolveDocumentPath(rawDescriptor.file, serviceId, version);

  return {
    service: serviceId,
    name,
    capability,
    version,
    description,
    basePath,
    documentPath
  };
}

function cloneValue(value) {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function loadRegistry() {
  if (cachedRegistry) {
    return cachedRegistry;
  }

  const indexPath = path.join(GENERATED_ROOT, 'index.json');
  const indexJson = readJsonFile(indexPath, 'OpenAPI service index');

  if (!Array.isArray(indexJson?.services)) {
    throw new Error(`OpenAPI index at ${indexPath} must contain a 'services' array.`);
  }

  const descriptors = indexJson.services.map((descriptor, idx) =>
    sanitizeDescriptor(descriptor, indexPath, idx)
  );

  const lookup = new Map();
  for (const descriptor of descriptors) {
    const aliases = new Set([descriptor.service, descriptor.name]);
    for (const alias of aliases) {
      const normalized = normalizeServiceKey(alias);
      if (!normalized) {
        continue;
      }
      lookup.set(normalized, descriptor);
    }
  }

  cachedRegistry = {
    descriptors,
    lookup,
    indexPath,
    generatedAt: indexJson.generatedAt ?? null,
    baseSpec: indexJson.baseSpec ?? null
  };

  return cachedRegistry;
}

export function getServiceSpecIndex() {
  const { descriptors } = loadRegistry();
  return descriptors.map(({ documentPath, ...publicDescriptor }) => ({ ...publicDescriptor }));
}

function validateSpecAgainstDescriptor(document, descriptor) {
  const openApiVersion = String(document?.openapi ?? '').trim();
  if (!/^3\.\d+\.\d+/u.test(openApiVersion)) {
    throw new Error(
      `OpenAPI document for service '${descriptor.service}' must declare an OpenAPI 3.x version`
    );
  }

  const paths = document?.paths;
  if (!paths || typeof paths !== 'object') {
    throw new Error(
      `OpenAPI document for service '${descriptor.service}' must expose a paths object`
    );
  }

  const invalidPaths = Object.keys(paths).filter(
    (pathKey) => !pathKey.startsWith(descriptor.basePath)
  );

  if (invalidPaths.length > 0) {
    throw new Error(
      `OpenAPI document for service '${descriptor.service}' declares paths outside its base path '${descriptor.basePath}': ${invalidPaths.join(', ')}`
    );
  }
}

function getDescriptorForService(service) {
  if (!service && service !== 0) {
    return null;
  }

  const { lookup } = loadRegistry();
  const normalized = normalizeServiceKey(service);
  return lookup.get(normalized) ?? null;
}

function createCacheKey(descriptor) {
  return `${descriptor.service}@${descriptor.version}`;
}

export function getServiceSpecDocument(service) {
  const descriptor = getDescriptorForService(service);
  if (!descriptor) {
    return null;
  }

  const cacheKey = createCacheKey(descriptor);
  if (!specCache.has(cacheKey)) {
    const document = readJsonFile(descriptor.documentPath, `OpenAPI document for ${descriptor.service}`);
    validateSpecAgainstDescriptor(document, descriptor);
    specCache.set(cacheKey, document);
  }

  return cloneValue(specCache.get(cacheKey));
}

export function clearServiceSpecCache() {
  cachedRegistry = undefined;
  specCache.clear();
}

export default {
  getServiceSpecIndex,
  getServiceSpecDocument,
  clearServiceSpecCache
};
