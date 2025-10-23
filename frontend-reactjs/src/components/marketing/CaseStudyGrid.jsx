import PropTypes from 'prop-types';

import HomeSection from '../home/HomeSection.jsx';
import { buildSrcSet, normaliseMarketingMedia } from '../../lib/media.js';

function CaseStudyCard({ study }) {
  const media = normaliseMarketingMedia(study.media);
  const altText = study.alt ?? media?.alt ?? '';
  const srcSet = media ? buildSrcSet(media.imageSources) : '';
  const baseSrc = media?.imageSources?.[0]?.src ?? media?.poster ?? undefined;

  return (
    <article className="case-study-card" aria-labelledby={`${study.id}-heading`}>
      {baseSrc ? (
        <picture className="case-study-card__media">
          {media?.imageSources
            ?.filter((source) => source.media)
            .map((source) => (
              <source key={`${source.src}-${source.media}`} srcSet={source.src} media={source.media} type={source.type} />
            ))}
          <img src={baseSrc} srcSet={srcSet} alt={altText} loading="lazy" />
        </picture>
      ) : null}
      <div className="case-study-card__body">
        <div className="case-study-card__meta">
          <span className="case-study-card__persona">{study.persona}</span>
          <span className="case-study-card__metric">{study.metric}</span>
        </div>
        <h3 id={`${study.id}-heading`} className="case-study-card__title">
          {study.title}
        </h3>
        <p className="case-study-card__summary">{study.summary}</p>
        {study.cta ? (
          <a className="case-study-card__cta" href={study.cta.href} onClick={study.cta.onClick}>
            {study.cta.label}
          </a>
        ) : null}
      </div>
    </article>
  );
}

CaseStudyCard.propTypes = {
  study: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    summary: PropTypes.string.isRequired,
    metric: PropTypes.string.isRequired,
    persona: PropTypes.string.isRequired,
    media: PropTypes.object,
    alt: PropTypes.string,
    cta: PropTypes.shape({
      href: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      onClick: PropTypes.func
    })
  }).isRequired
};

export default function CaseStudyGrid({ eyebrow, title, caption, studies }) {
  return (
    <section className="case-study-grid">
      <HomeSection size="wide" pad="py-24">
        <div className="case-study-grid__header">
          {eyebrow ? <span className="case-study-grid__eyebrow">{eyebrow}</span> : null}
          <h2 className="case-study-grid__title">{title}</h2>
          {caption ? <p className="case-study-grid__caption">{caption}</p> : null}
        </div>
        <div className="case-study-grid__collection">
          {studies.map((study) => (
            <CaseStudyCard key={study.id} study={study} />
          ))}
        </div>
      </HomeSection>
    </section>
  );
}

CaseStudyGrid.propTypes = {
  eyebrow: PropTypes.string,
  title: PropTypes.string.isRequired,
  caption: PropTypes.string,
  studies: PropTypes.arrayOf(CaseStudyCard.propTypes.study).isRequired
};

CaseStudyGrid.defaultProps = {
  eyebrow: '',
  caption: ''
};
