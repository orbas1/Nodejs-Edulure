import { describe, expect, it } from 'vitest';

import { buildSrcSet, normaliseMarketingMedia, shouldStreamVideo } from '../media.js';

describe('media helpers', () => {
  it('normalises marketing media payloads with fallbacks', () => {
    const media = normaliseMarketingMedia({
      poster: 'poster.jpg',
      sources: [
        { src: 'hero-800.webp', width: 800, type: 'image/webp' },
        { src: 'hero.mp4', type: 'video/mp4', resolution: 1080 }
      ]
    });

    expect(media.poster).toBe('poster.jpg');
    expect(media.imageSources).toHaveLength(1);
    expect(media.videoSources).toHaveLength(1);
    expect(media.type).toBe('video');
  });

  it('builds srcset strings sorted by ascending width', () => {
    const srcSet = buildSrcSet([
      { src: 'hero-1600.webp', width: 1600 },
      { src: 'hero-800.webp', width: 800 },
      { src: 'hero-1200.webp', width: 1200 }
    ]);

    expect(srcSet).toBe('hero-800.webp 800w, hero-1200.webp 1200w, hero-1600.webp 1600w');
  });

  it('detects when video should stream', () => {
    const media = {
      type: 'video',
      videoSources: [{ src: 'hero.mp4', type: 'video/mp4' }]
    };

    expect(shouldStreamVideo(media)).toBe(true);
    expect(shouldStreamVideo(media, { preferStatic: true })).toBe(false);
  });
});
