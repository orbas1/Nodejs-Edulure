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

let cachedIndex;
const specCache = new Map();

function clone(value) {
  if (value == null) {
    return value;
  }

  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function readJsonFile(filePath) {
  try {
    const raw = readFileSync(filePath, 'utf8');
    return raw;
  } catch (error) {
    throw new Error(`Failed to read OpenAPI artefact at '${filePath}': ${error.message}`);
  }
}

function parseJson(filePath, contents) {
  try {
    return JSON.parse(contents);
  } catch (error) {
    throw new Error(`Malformed JSON in OpenAPI artefact '${filePath}': ${error.message}`);
  }
}

function loadIndex() {
  if (cachedIndex) {
    return cachedIndex;
  }

  try {
    const contents = readJsonFile(INDEX_FILE_PATH);
    const parsed = parseJson(INDEX_FILE_PATH, contents);
    const { services, ...metadata } = SPEC_INDEX_SCHEMA.parse(parsed);
    const preparedServices = services.map((serviceDescriptor) => ({
      ...serviceDescriptor,
      basePath: serviceDescriptor.basePath === '' ? '/' : serviceDescriptor.basePath
    }));

    const serviceLookup = new Map();
    for (const descriptor of preparedServices) {
      const key = descriptor.service;
      if (serviceLookup.has(key)) {
        throw new Error(`Duplicate OpenAPI descriptor registered for service '${key}'.`);
      }
      serviceLookup.set(key, descriptor);
    }

    cachedIndex = {
      metadata,
      services: preparedServices,
      serviceLookup
    };

    return cachedIndex;
  } catch (error) {
    throw new Error(`Failed to load service spec index: ${error.message}`, { cause: error });
  }
}

function resolveDescriptor(service) {
  if (typeof service !== 'string' || service.trim() === '') {
    return null;
  }

  const normalisedLookupKey = service.trim().toLowerCase();
  const index = loadIndex();
  const { serviceLookup, services } = index;

  if (serviceLookup.has(normalisedLookupKey)) {
    return serviceLookup.get(normalisedLookupKey);
  }

  return services.find((descriptor) => descriptor.name.toLowerCase() === normalisedLookupKey) ?? null;
}

function resolveSpecPath(descriptor) {
  const candidatePath = path.resolve(GENERATED_ROOT, descriptor.service, descriptor.version, 'openapi.json');
  const relative = path.relative(GENERATED_ROOT, candidatePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to resolve OpenAPI document outside registry root for service '${descriptor.service}'.`);
  }
  return candidatePath;
}

function parseSpecDocument(descriptor) {
  const specPath = resolveSpecPath(descriptor);
  const contents = readJsonFile(specPath);
  const spec = parseJson(specPath, contents);

  if (typeof spec.openapi !== 'string' || !/^3\.\d+\.\d+/.test(spec.openapi)) {
    throw new Error(`OpenAPI document for service '${descriptor.service}' does not declare a supported OpenAPI version.`);
  }

  if (!spec.info || typeof spec.info.title !== 'string') {
    throw new Error(`OpenAPI document for service '${descriptor.service}' is missing an info.title field.`);
  }

  if (!spec.paths || typeof spec.paths !== 'object') {
    throw new Error(`OpenAPI document for service '${descriptor.service}' is missing a paths object.`);
  }

  return spec;
}

export function getServiceSpecIndex() {
  const { services } = loadIndex();
  return services.map(
    ({ service, name, capability, version, description, basePath, documentationUrl, checksum, lastUpdated }) => {
      const payload = { service, name, capability, version, description, basePath };

      if (documentationUrl) {
        payload.documentationUrl = documentationUrl;
      }

      if (checksum) {
        payload.checksum = checksum;
      }

      if (lastUpdated) {
        payload.lastUpdated = lastUpdated;
      }

      return clone(payload);
    }
  );
}

export function getServiceSpecDocument(service) {
  const descriptor = resolveDescriptor(service);
  if (!descriptor) {
    return null;
  }

  if (specCache.has(descriptor.service)) {
    return clone(specCache.get(descriptor.service));
  }

  const parsed = parseSpecDocument(descriptor);
  specCache.set(descriptor.service, parsed);
  return clone(parsed);
}

export function clearServiceSpecCache() {
  cachedIndex = undefined;
  specCache.clear();
}

export default {
  getServiceSpecIndex,
  getServiceSpecDocument,
  clearServiceSpecCache
};
