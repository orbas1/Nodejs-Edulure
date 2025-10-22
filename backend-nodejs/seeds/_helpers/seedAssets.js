import { createHash } from 'node:crypto';

import storageService from '../../src/services/StorageService.js';
import { storageBuckets } from '../../src/config/storage.js';

const generatedAssets = new Map();

function createGradient(id, colors) {
  return `    <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors[0]}" />
      <stop offset="100%" stop-color="${colors[1]}" />
    </linearGradient>`;
}

function buildPlaceholderSvg({
  width = 960,
  height = 540,
  title,
  subtitle,
  badge,
  colors = ['#38bdf8', '#0ea5e9']
}) {
  const gradientId = `grad-${createHash('md5').update(title ?? 'seed').digest('hex').slice(0, 8)}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${
    title ?? 'Edulure asset'
  }">
  <defs>
${createGradient(gradientId, colors)}
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="rgba(15, 23, 42, 0.18)" />
    </filter>
  </defs>
  <rect width="${width}" height="${height}" rx="42" fill="url(#${gradientId})" />
  <g filter="url(#shadow)">
    <rect x="48" y="72" width="${width - 96}" height="${height - 144}" rx="36" fill="rgba(15, 23, 42, 0.72)" />
  </g>
  <text x="${width / 2}" y="${height / 2 - 36}" text-anchor="middle" font-family="'Inter', 'Segoe UI', sans-serif" font-size="${
    Math.max(32, Math.round(width / 20))
  }" font-weight="700" fill="#f8fafc">${title ?? 'Edulure'}</text>
  <text x="${width / 2}" y="${height / 2 + 36}" text-anchor="middle" font-family="'Inter', 'Segoe UI', sans-serif" font-size="${
    Math.max(18, Math.round(width / 42))
  }" font-weight="500" fill="rgba(226, 232, 240, 0.85)">${subtitle ?? 'Learning communities & growth programs'}</text>
  ${
    badge
      ? `<g transform="translate(${width / 2 - 90}, ${height - 110})">
      <rect width="180" height="48" rx="24" fill="rgba(226, 232, 240, 0.16)" />
      <text x="90" y="30" text-anchor="middle" font-family="'Inter', 'Segoe UI', sans-serif" font-size="18" font-weight="600" fill="#f8fafc">${badge}</text>
    </g>`
      : ''
  }
</svg>`;
}

export async function ensureSeedImage(slug, options = {}) {
  if (generatedAssets.has(slug)) {
    return generatedAssets.get(slug);
  }

  const svg = buildPlaceholderSvg(options);
  const buffer = Buffer.from(svg, 'utf8');
  const key = storageService.generateStorageKey(`seeds/${slug}`, `${slug}.svg`);
  const result = await storageService.uploadBuffer({
    bucket: storageBuckets.public,
    key,
    body: buffer,
    contentType: 'image/svg+xml',
    visibility: 'public'
  });

  const finalKey = result.key ?? key;
  const asset = {
    bucket: result.bucket ?? storageBuckets.public,
    key: finalKey,
    url: storageService.buildPublicUrl({ bucket: result.bucket ?? storageBuckets.public, key: finalKey })
  };

  generatedAssets.set(slug, asset);
  return asset;
}

export default ensureSeedImage;
