const BYTES_IN_MB = 1024 * 1024;

const MEDIA_TYPE_POLICY = {
  image: {
    allowedMimeTypes: [
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'image/avif'
    ],
    maxBytes: 30 * BYTES_IN_MB
  },
  document: {
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ],
    maxBytes: 120 * BYTES_IN_MB
  },
  video: {
    allowedMimeTypes: [
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'video/x-matroska'
    ],
    maxBytes: 512 * BYTES_IN_MB
  },
  audio: {
    allowedMimeTypes: [
      'audio/mpeg',
      'audio/mp4',
      'audio/wav',
      'audio/x-wav',
      'audio/flac',
      'audio/ogg'
    ],
    maxBytes: 100 * BYTES_IN_MB
  },
  ebook: {
    allowedMimeTypes: [
      'application/epub+zip',
      'application/pdf',
      'application/x-mobipocket-ebook'
    ],
    maxBytes: 60 * BYTES_IN_MB
  }
};

function normaliseMediaKind(kind) {
  if (typeof kind !== 'string') {
    return null;
  }
  const lower = kind.toLowerCase();
  return MEDIA_TYPE_POLICY[lower] ? lower : null;
}

function getMediaTypePolicy(kind) {
  const normalised = normaliseMediaKind(kind);
  return normalised ? { kind: normalised, ...MEDIA_TYPE_POLICY[normalised] } : null;
}

function assertMediaTypeCompliance({ kind, mimeType, size }) {
  const policy = getMediaTypePolicy(kind);
  if (!policy) {
    throw Object.assign(new Error(`Unsupported media kind: ${kind}`), { status: 422 });
  }

  if (typeof mimeType !== 'string' || !policy.allowedMimeTypes.includes(mimeType.trim().toLowerCase())) {
    throw Object.assign(new Error(`Unsupported MIME type ${mimeType} for ${policy.kind} uploads`), {
      status: 422,
      code: 'UNSUPPORTED_MEDIA_TYPE'
    });
  }

  if (size !== undefined && size !== null) {
    const numericSize = Number(size);
    if (!Number.isFinite(numericSize) || numericSize <= 0) {
      throw Object.assign(new Error('File size must be a positive number'), { status: 422 });
    }

    if (policy.maxBytes && numericSize > policy.maxBytes) {
      throw Object.assign(
        new Error(`File size exceeds the ${Math.round(policy.maxBytes / BYTES_IN_MB)}MB limit for ${policy.kind} assets`),
        { status: 422 }
      );
    }
  }

  return {
    kind: policy.kind,
    mimeType: mimeType.trim().toLowerCase(),
    size
  };
}

function listAllowedMimeTypes(kind) {
  const policy = getMediaTypePolicy(kind);
  return policy ? policy.allowedMimeTypes.slice() : [];
}

export {
  assertMediaTypeCompliance,
  getMediaTypePolicy,
  listAllowedMimeTypes,
  normaliseMediaKind
};

export default {
  assertMediaTypeCompliance,
  getMediaTypePolicy,
  listAllowedMimeTypes,
  normaliseMediaKind
};
