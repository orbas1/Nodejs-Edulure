import {
  DEFAULT_PASSWORD_POLICY,
  EMAIL_PATTERN,
  evaluatePasswordStrength,
  normaliseEmail,
  normalisePasswordPolicy,
  normaliseText
} from './auth.js';

const LEARNER_DEFAULT_ROLE = 'instructor';
const LEARNER_ALLOWED_ROLES = ['user', 'instructor', 'admin'];

function normaliseRole(value, fallback = LEARNER_DEFAULT_ROLE) {
  const resolved = normaliseText(value, 32);
  return resolved || fallback;
}

function clampToUtcDate(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function parseDateOfBirth(value) {
  const trimmed = normaliseText(value, 32);
  if (!trimmed) {
    return { value: undefined };
  }

  let candidate;
  const shortDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (shortDateMatch) {
    const [, year, month, day] = shortDateMatch;
    candidate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  } else {
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return { error: 'Enter a valid date of birth' };
    }
    candidate = clampToUtcDate(parsed);
  }

  if (Number.isNaN(candidate.getTime())) {
    return { error: 'Enter a valid date of birth' };
  }

  const today = clampToUtcDate(new Date());
  if (candidate > today) {
    return { error: 'Date of birth cannot be in the future' };
  }

  const minimumAgeDate = new Date(Date.UTC(today.getUTCFullYear() - 16, today.getUTCMonth(), today.getUTCDate()));
  if (candidate > minimumAgeDate) {
    return { error: 'You must be at least 16 years old' };
  }

  const maximumAgeDate = new Date(Date.UTC(today.getUTCFullYear() - 120, today.getUTCMonth(), today.getUTCDate()));
  if (candidate < maximumAgeDate) {
    return { error: 'Enter a valid date of birth' };
  }

  return { value: clampToUtcDate(candidate).toISOString() };
}

function buildLearnerState(state, passwordPolicy = DEFAULT_PASSWORD_POLICY) {
  const firstName = normaliseText(state.firstName, 120);
  const lastName = normaliseText(state.lastName, 120);
  const email = normaliseEmail(state.email);
  const role = normaliseRole(state.role);
  const termsAccepted = Boolean(state.termsAccepted);

  const password = typeof state.password === 'string' ? state.password : '';
  const confirmPassword = typeof state.confirmPassword === 'string' ? state.confirmPassword : '';
  const passwordEvaluation = evaluatePasswordStrength(password, passwordPolicy);
  const dateOfBirthResult = parseDateOfBirth(state.dateOfBirth);

  const cleaned = {
    firstName,
    lastName,
    email,
    role,
    termsAccepted,
    password,
    confirmPassword,
    passwordEvaluation,
    dateOfBirth: dateOfBirthResult.value,
    dateOfBirthError: dateOfBirthResult.error
  };

  const bootstrapPayload = {
    email,
    role,
    firstName,
    lastName,
    termsAccepted,
    ...(dateOfBirthResult.value ? { dateOfBirth: dateOfBirthResult.value } : {})
  };

  const registerPayload = {
    firstName,
    lastName,
    email,
    password,
    confirmPassword,
    role,
    ...(dateOfBirthResult.value ? { dateOfBirth: dateOfBirthResult.value } : {})
  };

  return { cleaned, bootstrapPayload, registerPayload };
}

function normaliseListInput(value, { maxItems = 10, maxLength = 160 } = {}) {
  if (!value) {
    return [];
  }
  const rawList = Array.isArray(value)
    ? value
    : String(value)
        .split(/[\n,]/)
        .map((entry) => entry.trim());
  const unique = new Set();
  const result = [];
  for (const entry of rawList) {
    const cleaned = normaliseText(entry, maxLength);
    if (!cleaned) {
      continue;
    }
    const key = cleaned.toLowerCase();
    if (unique.has(key)) {
      continue;
    }
    unique.add(key);
    result.push(cleaned);
    if (result.length >= maxItems) {
      break;
    }
  }
  return result;
}

function sanitiseAddress(address) {
  if (!address || typeof address !== 'object') {
    return {};
  }
  return Object.entries(address).reduce((acc, [key, value]) => {
    const cleaned = normaliseText(value, 180);
    if (cleaned) {
      acc[key] = cleaned;
    }
    return acc;
  }, {});
}

function normaliseInvites(value) {
  const inviteList = normaliseListInput(value, { maxItems: 10, maxLength: 80 });
  return inviteList.map((code) => ({ code }));
}

function buildPreferences({ marketingOptIn, timeCommitment, onboardingPath, interests }) {
  return {
    marketingOptIn: Boolean(marketingOptIn),
    timeCommitment: timeCommitment || undefined,
    onboardingPath: onboardingPath || undefined,
    interests: interests.length ? interests : undefined
  };
}

function buildMetadata({ marketingSource, marketingCampaign }) {
  return {
    ...(marketingSource ? { source: marketingSource } : {}),
    ...(marketingCampaign ? { campaign: marketingCampaign } : {})
  };
}

function buildInstructorState(state, passwordPolicy = DEFAULT_PASSWORD_POLICY) {
  const firstName = normaliseText(state.firstName, 120);
  const lastName = normaliseText(state.lastName, 120);
  const email = normaliseEmail(state.email);
  const persona = normaliseText(state.persona, 160);
  const goals = normaliseListInput(state.goalsInput, { maxItems: 10, maxLength: 160 });
  const invites = normaliseInvites(state.inviteCodes ?? state.invites);
  const marketingOptIn = Boolean(state.marketingOptIn);
  const interests = normaliseListInput(state.interestsInput, { maxItems: 12, maxLength: 120 });
  const marketingSource = normaliseText(state.marketingSource, 120);
  const marketingCampaign = normaliseText(state.marketingCampaign, 120);
  const timeCommitment = normaliseText(state.timeCommitment, 60);
  const onboardingPath = normaliseText(state.onboardingPath, 120);
  const termsAccepted = Boolean(state.termsAccepted);
  const address = sanitiseAddress(state.address);

  const password = typeof state.password === 'string' ? state.password : '';
  const confirmPassword = typeof state.confirmPassword === 'string' ? state.confirmPassword : '';
  const role = normaliseText(state.role, 32) || 'instructor';
  const passwordEvaluation = evaluatePasswordStrength(password, passwordPolicy);

  const preferences = buildPreferences({
    marketingOptIn,
    timeCommitment,
    onboardingPath,
    interests
  });
  const metadata = buildMetadata({ marketingSource, marketingCampaign });

  const cleaned = {
    firstName,
    lastName,
    email,
    persona,
    goals,
    invites,
    marketingOptIn,
    interests,
    marketingSource,
    marketingCampaign,
    timeCommitment,
    onboardingPath,
    termsAccepted,
    address,
    password,
    confirmPassword,
    role,
    headline: normaliseText(state.headline, 160),
    portfolio: normaliseText(state.portfolio, 200),
    expertise: normaliseText(state.expertise, 240),
    audience: normaliseText(state.audience, 240),
    preferences,
    metadata,
    passwordEvaluation
  };

  const bootstrapPayload = {
    email,
    role,
    firstName,
    lastName,
    persona: persona || undefined,
    goals,
    invites,
    preferences,
    metadata,
    termsAccepted
  };

  const registerPayload = null;

  return { cleaned, bootstrapPayload, registerPayload };
}

function buildNormalisedOnboardingState(mode, state, passwordPolicy = DEFAULT_PASSWORD_POLICY) {
  if (mode === 'learner') {
    return buildLearnerState(state, passwordPolicy);
  }
  return buildInstructorState(state, passwordPolicy);
}

export function createOnboardingState(mode = 'learner') {
  if (mode === 'learner') {
    return {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: LEARNER_DEFAULT_ROLE,
      dateOfBirth: '',
      termsAccepted: false
    };
  }

  return {
    firstName: '',
    lastName: '',
    email: '',
    persona: '',
    goalsInput: '',
    inviteCodes: '',
    marketingOptIn: true,
    interestsInput: '',
    marketingSource: '',
    marketingCampaign: '',
    timeCommitment: '',
    onboardingPath: '',
    termsAccepted: false,
    role: 'instructor',
    headline: '',
    portfolio: '',
    expertise: '',
    audience: '',
    password: '',
    confirmPassword: ''
  };
}

export function validateOnboardingState(mode, state, options = {}) {
  const passwordPolicy = normalisePasswordPolicy(options.passwordPolicy ?? DEFAULT_PASSWORD_POLICY);
  const { cleaned, bootstrapPayload, registerPayload } = buildNormalisedOnboardingState(mode, state, passwordPolicy);
  const errors = {};

  if (!cleaned.firstName) {
    errors.firstName = 'First name is required';
  }
  if (!cleaned.email || !EMAIL_PATTERN.test(cleaned.email)) {
    errors.email = 'Enter a valid email address';
  }

  if (mode === 'learner') {
    if (!cleaned.passwordEvaluation.isCompliant) {
      errors.password = cleaned.passwordEvaluation.description;
    }
    if (cleaned.password !== cleaned.confirmPassword) {
      errors.confirmPassword = 'Passwords must match';
    }
    if (!LEARNER_ALLOWED_ROLES.includes(cleaned.role)) {
      errors.role = 'Select a valid role';
    }
    if (cleaned.dateOfBirthError) {
      errors.dateOfBirth = cleaned.dateOfBirthError;
    }
  }

  if (!cleaned.termsAccepted) {
    errors.termsAccepted = 'You must accept the terms to continue';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    cleaned,
    bootstrapPayload,
    registerPayload,
    passwordPolicy,
    passwordEvaluation: cleaned.passwordEvaluation
  };
}

export function buildOnboardingDraftPayload(mode, state, options = {}) {
  const passwordPolicy = normalisePasswordPolicy(options.passwordPolicy ?? DEFAULT_PASSWORD_POLICY);
  const { bootstrapPayload } = buildNormalisedOnboardingState(mode, state, passwordPolicy);
  return bootstrapPayload;
}

export function calculateOnboardingCompletion(mode, state, options = {}) {
  const passwordPolicy = normalisePasswordPolicy(options.passwordPolicy ?? DEFAULT_PASSWORD_POLICY);
  const { cleaned } = buildNormalisedOnboardingState(mode, state, passwordPolicy);
  let checkpoints;

  if (mode === 'learner') {
    checkpoints = [
      Boolean(cleaned.firstName),
      Boolean(cleaned.email),
      cleaned.passwordEvaluation.isCompliant,
      Boolean(cleaned.password && cleaned.password === cleaned.confirmPassword),
      cleaned.termsAccepted
    ];
  } else {
    checkpoints = [
      Boolean(cleaned.firstName),
      Boolean(cleaned.email),
      Boolean(cleaned.persona),
      cleaned.goals.length > 0,
      cleaned.interests.length > 0,
      cleaned.termsAccepted
    ];
  }
  const completed = checkpoints.filter(Boolean).length;
  const total = checkpoints.length;
  return {
    completed,
    total,
    progress: total ? completed / total : 0
  };
}
