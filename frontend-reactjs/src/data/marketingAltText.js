const ALT_TEXT = {
  'hero.flow-five': 'Operators orchestrating onboarding, payments, and community sessions inside the Edulure Flow 5 dashboard.',
  'case-study.ops-guild':
    'Ops Guild founders presenting a dashboard with uplift metrics and enrolment charts for Flow 5 marketing.',
  'case-study.cohort-studio':
    'Instructor cohort reviewing lesson plans with monetisation overlays in the Edulure studio.',
  'case-study.tutor-league':
    'Tutors celebrating after exceeding sponsorship revenue goals using Edulure payouts.'
};

export function getMarketingAltText(key, fallback = '') {
  if (!key) {
    return fallback;
  }
  return ALT_TEXT[key] ?? fallback;
}

export default ALT_TEXT;
