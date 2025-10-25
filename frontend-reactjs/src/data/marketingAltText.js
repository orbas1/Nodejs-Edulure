const ALT_TEXT = {
  'hero.launchpad':
    'Educators collaborating inside the Edulure command centre while reviewing live schedules and learner insights.',
  'case-study.ops-guild':
    'Operations team reviewing growth metrics inside Edulure workspace dashboards.',
  'case-study.cohort-studio':
    'Curriculum designer organising modules on Edulure while students take notes during a live session.',
  'case-study.tutor-league':
    'Tutoring collective celebrating new learner signups after hosting a live Edulure session.'
};

export function getMarketingAltText(key, fallback = '') {
  if (!key) {
    return fallback;
  }
  return ALT_TEXT[key] ?? fallback;
}

export default ALT_TEXT;
