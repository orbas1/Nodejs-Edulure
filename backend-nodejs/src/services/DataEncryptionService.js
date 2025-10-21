import crypto from 'crypto';

import logger from '../config/logger.js';
import { env } from '../config/env.js';

const HASH_ALGORITHM = 'sha256';
const AUTH_TAG_LENGTH = 16;
const IV_LENGTH = 12;

function ensureBufferKey(key) {
  if (!key) {
    throw new Error('Encryption key is not configured');
  }
  if (Buffer.isBuffer(key)) {
    if (key.length !== 32) {
      return crypto.createHash(HASH_ALGORITHM).update(key).digest();
    }
    return key;
  }
  const trimmed = typeof key === 'string' ? key.trim() : '';
  if (!trimmed) {
    throw new Error('Encryption key is empty');
  }
  try {
    const candidate = Buffer.from(trimmed, 'base64');
    if (candidate.length === 32) {
      return candidate;
    }
    if (candidate.length > 0) {
      return crypto.createHash(HASH_ALGORITHM).update(candidate).digest();
    }
  } catch (_error) {
    // Fall back to hashing raw input
  }
  return crypto.createHash(HASH_ALGORITHM).update(trimmed).digest();
}

function normalizeStructured(value) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Buffer.isBuffer(value)) {
    return value.toString('base64');
  }
  if (Array.isArray(value)) {
    return value.map((item) => {
      const normalisedItem = normalizeStructured(item);
      return normalisedItem === undefined ? null : normalisedItem;
    });
  }
  if (typeof value === 'object') {
    return Object.keys(value)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
      .reduce((acc, key) => {
        const normalisedValue = normalizeStructured(value[key]);
        if (normalisedValue !== undefined) {
          acc[key] = normalisedValue;
        }
        return acc;
      }, {});
  }
  return String(value);
}

function serializeStructured(value) {
  const normalized = normalizeStructured(value);
  if (normalized === undefined) {
    return '';
  }
  return JSON.stringify(normalized);
}

function attemptLegacyStructuredParse(serialized) {
  if (typeof serialized !== 'string' || !serialized.trim()) {
    return null;
  }

  const normalised = serialized
    .replace(/":\s*,/g, '":null,')
    .replace(/":\s*}/g, '":null}')
    .replace(/":\s*([A-Za-z@_:/-][A-Za-z0-9@._:/-]*)(?=[,}\]])/g, '":"$1"');

  try {
    return JSON.parse(normalised);
  } catch (_error) {
    return null;
  }
}

function parseStructuredPayload(serialized) {
  if (!serialized) {
    return null;
  }

  try {
    return JSON.parse(serialized);
  } catch (_error) {
    return attemptLegacyStructuredParse(serialized);
  }
}

function toHashString(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (Buffer.isBuffer(value)) {
    return value.toString('base64');
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  return serializeStructured(value);
}

class DataEncryptionService {
  constructor() {
    const { activeKeyId, keys, defaultClassification } = env.security.dataEncryption;
    this.activeKeyId = activeKeyId;
    this.defaultClassification = defaultClassification ?? 'general';
    this.keys = new Map();

    Object.entries(keys).forEach(([keyId, secret]) => {
      try {
        this.keys.set(keyId, ensureBufferKey(secret));
      } catch (error) {
        logger.error({ err: error, keyId }, 'Failed to load data encryption key');
      }
    });

    if (!this.keys.size) {
      throw new Error('No data encryption keys could be loaded');
    }
    if (!this.keys.has(this.activeKeyId)) {
      logger.warn(
        { activeKeyId: this.activeKeyId },
        'Active encryption key not provided; falling back to first available key'
      );
      const [firstKeyId] = this.keys.keys();
      this.activeKeyId = firstKeyId;
    }
  }

  getKey(keyId = this.activeKeyId) {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Encryption key '${keyId}' is not registered`);
    }
    return key;
  }

  hash(value) {
    const normalised = toHashString(value);
    if (normalised === null) {
      return null;
    }
    return crypto.createHash(HASH_ALGORITHM).update(normalised).digest('hex');
  }

  fingerprint(values) {
    if (!values || values.length === 0) {
      return null;
    }
    return this.hash(values.join('|'));
  }

  encrypt(plaintext, { keyId } = {}) {
    if (plaintext === null || plaintext === undefined) {
      return { ciphertext: null, keyId: keyId ?? this.activeKeyId };
    }

    const key = this.getKey(keyId);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      ciphertext: Buffer.concat([iv, authTag, encrypted]),
      keyId
    };
  }

  decrypt(ciphertext, keyId = this.activeKeyId) {
    if (!ciphertext) {
      return null;
    }
    const key = this.getKey(keyId);
    const buffer = Buffer.isBuffer(ciphertext) ? ciphertext : Buffer.from(ciphertext);
    if (buffer.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Encrypted payload is too short');
    }
    const iv = buffer.subarray(0, IV_LENGTH);
    const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }

  encryptStructured(payload, { classificationTag, keyId, fingerprintValues } = {}) {
    const serialized = serializeStructured(payload);
    if (!serialized) {
      return {
        ciphertext: null,
        keyId: keyId ?? this.activeKeyId,
        hash: null,
        classificationTag: classificationTag ?? this.defaultClassification,
        fingerprint: fingerprintValues?.length ? this.fingerprint(fingerprintValues) : null
      };
    }

    const { ciphertext, keyId: resolvedKeyId } = this.encrypt(serialized, { keyId });
    return {
      ciphertext,
      keyId: resolvedKeyId ?? this.activeKeyId,
      hash: this.hash(serialized),
      classificationTag: classificationTag ?? this.defaultClassification,
      fingerprint: fingerprintValues?.length ? this.fingerprint(fingerprintValues) : this.hash(serialized)
    };
  }

  decryptStructured(ciphertext, keyId) {
    if (!ciphertext) {
      return null;
    }

    try {
      const decrypted = this.decrypt(ciphertext, keyId);
      if (!decrypted) {
        return null;
      }

      const parsed = parseStructuredPayload(decrypted);
      if (parsed !== null) {
        return parsed;
      }

      logger.error('Failed to parse structured payload after decryption');
      return null;
    } catch (error) {
      logger.error({ err: error }, 'Failed to decrypt structured payload');
      return null;
    }
  }
}

const dataEncryptionService = new DataEncryptionService();

export default dataEncryptionService;
