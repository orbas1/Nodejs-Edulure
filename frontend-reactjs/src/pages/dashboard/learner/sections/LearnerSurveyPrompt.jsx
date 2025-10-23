import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import { submitLearnerSurvey } from '../../../../api/learnerDashboardApi.js';
import { useAuth } from '../../../../context/AuthContext.jsx';
import SkeletonPanel from '../../../../components/loaders/SkeletonPanel.jsx';

const SCORE_OPTIONS = [1, 2, 3, 4, 5];

function normaliseOptionLabel(score, labels) {
  if (!Array.isArray(labels) || labels.length === 0) {
    return `Score ${score}`;
  }
  return labels[score - 1] ?? `Score ${score}`;
}

export default function LearnerSurveyPrompt({ survey, onDismiss, loading }) {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const [score, setScore] = useState(null);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const labels = useMemo(() => survey?.scaleLabels ?? survey?.labels ?? [], [survey?.scaleLabels, survey?.labels]);

  if (!survey && !loading) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token || !survey?.id || !score) {
      setError('Choose a score to share quick feedback.');
      return;
    }

    setStatus('submitting');
    setError(null);
    try {
      await submitLearnerSurvey({
        token,
        payload: {
          surveyId: survey.id,
          score,
          question: survey.question,
          comment: comment.trim() || undefined,
          tags: survey.tags ?? [],
          location: survey.location ?? 'learner-dashboard',
          context: survey.context ?? {}
        }
      });
      setStatus('success');
      onDismiss?.();
    } catch (submissionError) {
      setStatus('error');
      setError(submissionError?.message ?? 'We could not record your response. Try again.');
    }
  };

  const isSubmitting = status === 'submitting';

  return (
    <SkeletonPanel isLoading={loading} hasHeading>
      {!loading ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="dashboard-kicker">Quick pulse</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">
              {survey?.title ?? 'How is your learning week going?'}
            </h3>
            <p className="mt-1 text-sm text-slate-600">{survey?.question ?? 'Tell us how confident you feel right now.'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {SCORE_OPTIONS.map((option) => {
              const active = option === score;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setScore(option)}
                  className={
                    active
                      ? 'rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm'
                      : 'rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary'
                  }
                  disabled={isSubmitting}
                  aria-pressed={active}
                >
                  {option}
                  <span className="sr-only">{normaliseOptionLabel(option, labels)}</span>
                </button>
              );
            })}
          </div>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Add a note (optional)
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={3}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Share what is working well or what needs support."
              disabled={isSubmitting}
            />
          </label>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="dashboard-primary-pill px-5 py-2 text-xs"
              disabled={!token || !score || isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit feedback'}
            </button>
            <button
              type="button"
              className="dashboard-pill px-5 py-2 text-xs"
              onClick={() => {
                setScore(null);
                setComment('');
                setStatus('idle');
                setError(null);
                onDismiss?.();
              }}
              disabled={isSubmitting}
            >
              Skip for now
            </button>
          </div>
          {status === 'success' ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Thanks for sharing your thoughts! We will use this to tune your dashboard recommendations.
            </p>
          ) : null}
        </form>
      ) : null}
    </SkeletonPanel>
  );
}

LearnerSurveyPrompt.propTypes = {
  survey: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string,
    question: PropTypes.string,
    scaleLabels: PropTypes.arrayOf(PropTypes.string),
    labels: PropTypes.arrayOf(PropTypes.string),
    tags: PropTypes.arrayOf(PropTypes.string),
    location: PropTypes.string,
    context: PropTypes.object
  }),
  onDismiss: PropTypes.func,
  loading: PropTypes.bool
};

LearnerSurveyPrompt.defaultProps = {
  survey: null,
  onDismiss: null,
  loading: false
};
