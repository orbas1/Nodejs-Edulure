import {
  DEFAULT_PASSWORD_POLICY,
  EMAIL_PATTERN,
  evaluatePasswordStrength,
  normaliseEmail,
  normalisePasswordPolicy,
  normaliseText
} from './auth.js';

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

function parseAge(value) {
  const trimmed = normaliseText(value, 3);
  if (!trimmed) {
    return undefined;
  }
  const numeric = Number.parseInt(trimmed, 10);
  if (Number.isNaN(numeric) || numeric < 16 || numeric > 120) {
    return { error: 'Age must be a number between 16 and 120' };
  }
  return { value: numeric };
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

function buildNormalisedOnboardingState(mode, state, passwordPolicy = DEFAULT_PASSWORD_POLICY) {
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
  const ageResult = parseAge(state.age);

  const password = typeof state.password === 'string' ? state.password : '';
  const confirmPassword = typeof state.confirmPassword === 'string' ? state.confirmPassword : '';
  const defaultRole = mode === 'learner' ? 'instructor' : 'instructor';
  const role = normaliseText(state.role, 32) || defaultRole;
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
    age: ageResult?.value,
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
    passwordEvaluation,
    ageError: ageResult?.error
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

  const registerPayload =
    mode === 'learner'
      ? {
          firstName,
          lastName,
          email,
          password,
          confirmPassword,
          role,
          age: ageResult?.value,
          address,
          marketingOptIn
        }
      : null;

  return { cleaned, bootstrapPayload, registerPayload };
}

export function createOnboardingState(mode = 'learner') {
  const base = {
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
    termsAccepted: false
  };
  if (mode === 'learner') {
    return {
      ...base,
      password: '',
      confirmPassword: '',
      role: 'instructor',
      age: '',
      address: {
        streetAddress: '',
        addressLine2: '',
        town: '',
        city: '',
        country: '',
        postcode: ''
      }
    };
  }
  return {
    ...base,
    role: 'instructor',
    headline: '',
    portfolio: '',
    expertise: '',
    audience: ''
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
    if (!['user', 'instructor', 'admin'].includes(cleaned.role)) {
      errors.role = 'Select a valid role';
    }
  }

  if (cleaned.ageError) {
    errors.age = cleaned.ageError;
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
  const checkpoints = [
    Boolean(cleaned.firstName),
    Boolean(cleaned.email),
    Boolean(cleaned.persona),
    cleaned.goals.length > 0,
    cleaned.interests.length > 0,
    cleaned.termsAccepted,
    mode === 'learner' ? cleaned.passwordEvaluation.isCompliant : true,
    mode === 'learner' ? Boolean(cleaned.password && cleaned.password === cleaned.confirmPassword) : true
  ];
  const completed = checkpoints.filter(Boolean).length;
  const total = checkpoints.length;
  return {
    completed,
    total,
    progress: total ? completed / total : 0
  };
}
