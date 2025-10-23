import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import HomeSection from '../home/HomeSection.jsx';
import { submitMarketingLead } from '../../api/marketingApi.js';
import { trackEvent } from '../../lib/analytics.js';

const INITIAL_FORM = {
  fullName: '',
  email: '',
  company: '',
  persona: '',
  goal: ''
};

function InvitationList({ invites }) {
  if (!invites?.length) {
    return null;
  }

  return (
    <div className="conversion-panel__invites" role="status" aria-live="polite">
      <h3>Personal invites unlocked</h3>
      <ul>
        {invites.map((invite) => (
          <li key={invite.code}>
            <strong>{invite.community?.name ?? invite.code}</strong>
            <span>{invite.status === 'pending' ? 'Pending' : invite.status}</span>
            {invite.community?.slug ? (
              <a href={`/communities/${invite.community.slug}`}>View community</a>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

const inviteShape = PropTypes.shape({
  code: PropTypes.string.isRequired,
  status: PropTypes.string,
  expiresAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  community: PropTypes.shape({
    slug: PropTypes.string,
    name: PropTypes.string
  })
});

InvitationList.propTypes = {
  invites: PropTypes.arrayOf(inviteShape)
};

InvitationList.defaultProps = {
  invites: []
};

export default function ConversionPanel({ blockSlug, defaultCtaSource, defaultEmail, initialInvites }) {
  const [form, setForm] = useState({ ...INITIAL_FORM, email: defaultEmail ?? '' });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);
  const [invites, setInvites] = useState(initialInvites ?? []);

  const ctaSource = useMemo(() => defaultCtaSource ?? 'home-inline', [defaultCtaSource]);

  useEffect(() => {
    if (!defaultEmail) {
      return;
    }
    setForm((previous) => {
      if (previous.email) {
        return previous;
      }
      return { ...previous, email: defaultEmail };
    });
  }, [defaultEmail]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) {
      return;
    }
    setSubmitting(true);
    setStatus(null);

    try {
      const payload = {
        ...form,
        ctaSource,
        blockSlug,
        metadata: {
          submissionChannel: 'home',
          formVariant: 'waitlist-inline'
        }
      };
      const result = await submitMarketingLead(payload);
      trackEvent('marketing:lead_submitted', {
        surface: 'home',
        ctaSource,
        blockSlug,
        email: form.email
      });
      setStatus({ type: 'success', message: 'We captured your details. Check your inbox for next steps!' });
      const invitePayload = result?.invites ?? result?.metadata?.invites ?? [];
      setInvites(invitePayload);
      setForm((prev) => ({ ...INITIAL_FORM, email: prev.email || defaultEmail || '' }));
    } catch (error) {
      setStatus({ type: 'error', message: 'Something went wrong. Please try again in a moment.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="conversion-panel">
      <HomeSection size="wide" pad="py-20">
        <div className="conversion-panel__inner">
          <div className="conversion-panel__copy">
            <h2>Bring Flow 5 to your learners</h2>
            <p>
              Share a few details and we will queue your workspace walkthrough, plus unlock any community invites waiting for
              your email.
            </p>
            {status ? (
              <p
                className={`conversion-panel__status conversion-panel__status--${status.type}`}
                role="status"
                aria-live="polite"
              >
                {status.message}
              </p>
            ) : null}
          </div>
          <form className="conversion-panel__form" onSubmit={handleSubmit} noValidate>
            <label className="conversion-panel__field">
              <span>Name</span>
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Jordan Rivera"
                autoComplete="name"
              />
            </label>
            <label className="conversion-panel__field">
              <span>Email *</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>
            <label className="conversion-panel__field">
              <span>Company or collective</span>
              <input
                type="text"
                name="company"
                value={form.company}
                onChange={handleChange}
                placeholder="Flow 5 Collective"
                autoComplete="organization"
              />
            </label>
            <label className="conversion-panel__field">
              <span>Your role</span>
              <input
                type="text"
                name="persona"
                value={form.persona}
                onChange={handleChange}
                placeholder="Community architect"
              />
            </label>
            <label className="conversion-panel__field">
              <span>What should we prep?</span>
              <textarea
                name="goal"
                rows={3}
                value={form.goal}
                onChange={handleChange}
                placeholder="Sponsor-ready launch checklist and invite sync."
              />
            </label>
            <button type="submit" className="cta-button cta-button--primary" disabled={submitting}>
              {submitting ? 'Sending…' : 'Request Flow 5 walkthrough'}
            </button>
          </form>
        </div>
        <InvitationList invites={invites} />
      </HomeSection>
    </section>
  );
}

ConversionPanel.propTypes = {
  blockSlug: PropTypes.string,
  defaultCtaSource: PropTypes.string,
  defaultEmail: PropTypes.string,
  initialInvites: PropTypes.arrayOf(inviteShape)
};

ConversionPanel.defaultProps = {
  blockSlug: null,
  defaultCtaSource: 'home-inline',
  defaultEmail: '',
  initialInvites: []
};
