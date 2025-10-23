import PropTypes from 'prop-types';

import { buildSrcSet, normaliseMarketingMedia, shouldStreamVideo } from '../../lib/media.js';
import useDataSaverPreference from '../../hooks/useDataSaverPreference.js';
import { usePrefersReducedMotion } from '../../utils/a11y.js';

export default function HeroMediaPanel({ media, fallbackAlt, sizes = '(min-width: 1024px) 520px, 100vw' }) {
  const prefersDataSaver = useDataSaverPreference();
  const prefersReducedMotion = usePrefersReducedMotion();
  const payload = normaliseMarketingMedia(media);

  if (!payload) {
    return null;
  }

  const shouldRenderVideo = shouldStreamVideo(payload, {
    preferStatic: prefersDataSaver || prefersReducedMotion
  });

  const poster = payload.poster ?? payload.placeholder ?? undefined;
  const altText = payload.alt ?? fallbackAlt ?? '';
  const aspectRatio = payload.aspectRatio ?? 16 / 10;
  const aspectPadding = `${100 / aspectRatio}%`;

  return (
    <div className="hero-media-panel">
      <div className="hero-media-panel__frame" style={{ paddingBottom: aspectPadding }}>
        <div className="hero-media-panel__content">
          {shouldRenderVideo ? (
            <video
              className="hero-media-panel__video"
              poster={poster}
              playsInline
              muted
              loop
              autoPlay
              aria-label={altText}
            >
              {payload.videoSources.map((source) => (
                <source key={`${source.src}-${source.type}`} src={source.src} type={source.type} />
              ))}
            </video>
          ) : payload.imageSources.length ? (
            <picture>
              {payload.imageSources
                .filter((source) => source.media)
                .map((source) => (
                  <source key={`${source.src}-${source.media}`} srcSet={source.src} media={source.media} type={source.type} />
                ))}
              <img
                className="hero-media-panel__image"
                src={payload.imageSources[0].src}
                srcSet={buildSrcSet(payload.imageSources)}
                sizes={sizes}
                alt={altText}
                loading="lazy"
              />
            </picture>
          ) : poster ? (
            <img className="hero-media-panel__image" src={poster} alt={altText} loading="lazy" />
          ) : (
            <div className="hero-media-panel__placeholder" aria-hidden="true" />
          )}
        </div>
      </div>
      {payload.caption ? <p className="hero-media-panel__caption">{payload.caption}</p> : null}
    </div>
  );
}

HeroMediaPanel.propTypes = {
  media: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]),
  fallbackAlt: PropTypes.string,
  sizes: PropTypes.string
};

HeroMediaPanel.defaultProps = {
  media: null,
  fallbackAlt: '',
  sizes: '(min-width: 1024px) 520px, 100vw'
};
