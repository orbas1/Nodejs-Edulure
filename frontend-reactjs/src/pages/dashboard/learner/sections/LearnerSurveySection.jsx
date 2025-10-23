import { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import { submitLearnerSurvey } from '../../../../api/learnerDashboardApi.js';
import { useAuth } from '../../../../context/AuthContext.jsx';

export default function LearnerSurveySection({ survey, onSubmitted, className }) {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [complete, setComplete] = useState(false);

  const options = useMemo(() => (Array.isArray(survey?.options) ? survey.options : []), [survey?.options]);

  const handleSubmit = useCallback(async () => {
    if (!token || !survey?.id || !selected) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitLearnerSurvey({
        token,
        payload: {
          surveyId: survey.id,
          questionId: survey.questionId ?? null,
          response: selected,
          rating: survey.scale?.[selected] ?? null,
          channel: survey.channel ?? 'learner-dashboard',
          metadata: {
            surface: survey.surface ?? 'dashboard.home',
            courseContext: survey.courseContext ?? null,
            suggestedAction: survey.suggestedAction ?? null
          }
        }
      });
      setComplete(true);
      setSelected(null);
      if (typeof onSubmitted === 'function') {
        onSubmitted();
      }
    } catch (submissionError) {
      const message =
        submissionError?.message ?? 'We could not record your response. Please try again in a moment.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }, [token, survey, selected, onSubmitted]);

  if (!survey?.id || options.length === 0) {
    return null;
  }

  return (
    <section
      className={clsx(
        'dashboard-card-muted flex h-full flex-col justify-between rounded-xl border border-slate-200/60 bg-white/95 p-5',
        className
      )}
    >
      <div className="space-y-4">
        <div>
          <p className="dashboard-kicker text-xs font-semibold uppercase tracking-wide text-slate-500">
            Quick survey
          </p>
          <h2 className="text-lg font-semibold text-slate-900">{survey.question}</h2>
          {survey.description ? <p className="mt-1 text-sm text-slate-600">{survey.description}</p> : null}
        </div>

        <div className="grid gap-2">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelected(option.value)}
              className={clsx(
                'flex items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition',
                selected === option.value
                  ? 'border-primary/60 bg-primary/5 text-primary-800 shadow-inner shadow-primary/20'
                  : 'border-slate-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary-700'
              )}
              disabled={submitting || complete}
            >
              <span
                className={clsx(
                  'mt-1 h-3.5 w-3.5 rounded-full border-2',
                  selected === option.value
                    ? 'border-primary bg-primary'
                    : 'border-slate-300 bg-white'
                )}
              />
              <span>
                <span className="font-medium">{option.label}</span>
                {option.description ? (
                  <span className="block text-xs text-slate-500">{option.description}</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>

        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        {complete ? (
          <p className="text-xs text-emerald-600">{survey.thankYouMessage ?? 'Thanks for sharing—your dashboard tips will adjust shortly.'}</p>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-end gap-3 text-xs">
        {survey.secondaryAction ? (
          <a
            href={survey.secondaryAction.href}
            className="text-slate-500 underline decoration-slate-300 decoration-2 underline-offset-4 hover:text-slate-700"
          >
            {survey.secondaryAction.label}
          </a>
        ) : null}
        <button
          type="button"
          className="dashboard-primary-pill px-4 py-2"
          onClick={handleSubmit}
          disabled={!selected || submitting || complete}
        >
          {complete ? 'Response saved' : submitting ? 'Saving…' : survey.ctaLabel ?? 'Share feedback'}
        </button>
      </div>
    </section>
  );
}

LearnerSurveySection.propTypes = {
  survey: PropTypes.shape({
    id: PropTypes.string.isRequired,
    questionId: PropTypes.string,
    question: PropTypes.string.isRequired,
    description: PropTypes.string,
    options: PropTypes.arrayOf(
      PropTypes.shape({
        value: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        description: PropTypes.string
      })
    ),
    ctaLabel: PropTypes.string,
    thankYouMessage: PropTypes.string,
    channel: PropTypes.string,
    surface: PropTypes.string,
    scale: PropTypes.object,
    courseContext: PropTypes.any,
    suggestedAction: PropTypes.string,
    secondaryAction: PropTypes.shape({
      label: PropTypes.string.isRequired,
      href: PropTypes.string.isRequired
    })
  }),
  onSubmitted: PropTypes.func,
  className: PropTypes.string
};

LearnerSurveySection.defaultProps = {
  survey: null,
  onSubmitted: null,
  className: ''
};
