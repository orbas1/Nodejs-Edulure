import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

import HomeSection from '../home/HomeSection.jsx';
import { trackEvent } from '../../lib/analytics.js';

function ActionButton({ action, variant, analyticsKey }) {
  if (!action) {
    return null;
  }

  const handleClick = () => {
    if (action.onClick) {
      action.onClick();
    }
    trackEvent('marketing:monetization_ribbon_cta', {
      action: variant,
      analyticsKey,
      destination: action.to ?? action.href ?? null,
      label: action.label ?? null
    });
  };

  const href = action.href ?? action.to;
  const destination = href ?? '#';
  const isExternal = typeof destination === 'string' && destination.startsWith('http');

  if (isExternal) {
    return (
      <a className={`cta-button cta-button--${variant}`} href={destination} onClick={handleClick}>
        {action.label}
      </a>
    );
  }

  return (
    <Link className={`cta-button cta-button--${variant}`} to={action.to ?? destination} onClick={handleClick}>
      {action.label}
    </Link>
  );
}

ActionButton.propTypes = {
  action: PropTypes.shape({
    to: PropTypes.string,
    href: PropTypes.string,
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func
  }),
  variant: PropTypes.oneOf(['primary', 'secondary']).isRequired,
  analyticsKey: PropTypes.string.isRequired
};

ActionButton.defaultProps = {
  action: null
};

export default function MonetizationRibbon({ title, description, highlights, primaryAction, secondaryAction, analyticsKey }) {
  return (
    <section className="monetization-ribbon">
      <HomeSection size="wide" pad="py-16" className="monetization-ribbon__inner">
        <div className="monetization-ribbon__copy">
          <h2>{title}</h2>
          <p>{description}</p>
          <ul>
            {highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </div>
        <div className="monetization-ribbon__actions">
          <ActionButton action={primaryAction} variant="primary" analyticsKey={analyticsKey} />
          <ActionButton action={secondaryAction} variant="secondary" analyticsKey={analyticsKey} />
        </div>
      </HomeSection>
    </section>
  );
}

MonetizationRibbon.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  highlights: PropTypes.arrayOf(PropTypes.string).isRequired,
  primaryAction: PropTypes.shape({
    to: PropTypes.string,
    href: PropTypes.string,
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func
  }),
  secondaryAction: PropTypes.shape({
    to: PropTypes.string,
    href: PropTypes.string,
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func
  }),
  analyticsKey: PropTypes.string
};

MonetizationRibbon.defaultProps = {
  primaryAction: null,
  secondaryAction: null,
  analyticsKey: 'monetization-ribbon'
};
