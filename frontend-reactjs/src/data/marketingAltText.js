const ALT_TEXT = {
  'hero.campus-galaxy': 'Operators mapping a blended learning campus inside the Edulure workspace.',
  'case-study.ops-guild':
    'Ops Guild founders reviewing uplift metrics and enrolment charts inside the Edulure dashboard.',
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
