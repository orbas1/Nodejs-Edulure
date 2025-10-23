const EMAIL_REGEX = /[^@\s]+@[^@\s]+\.[^@\s]+/i;
const MIN_PASSWORD_LENGTH = 12;
const MIN_MOTIVATION_LENGTH = 30;

export function normalizeAddress(address) {
  if (!address || typeof address !== 'object') {
    return {};
  }
  return Object.entries(address).reduce((acc, [key, value]) => {
    if (typeof value !== 'string') {
      return acc;
    }
    const trimmed = value.trim();
    if (trimmed) {
      acc[key] = trimmed;
    }
    return acc;
  }, {});
}

export function validateRegisterForm(formState) {
  const errors = {};
  if (!formState) {
    return { valid: false, errors: { form: 'Missing registration form values.' }, normalized: null };
  }

  const normalized = {
    firstName: String(formState.firstName ?? '').trim(),
    lastName: String(formState.lastName ?? '').trim(),
    email: String(formState.email ?? '').trim().toLowerCase(),
    password: String(formState.password ?? ''),
    confirmPassword: String(formState.confirmPassword ?? ''),
    role: String(formState.role ?? '').trim(),
    age: String(formState.age ?? '').trim(),
    address: normalizeAddress(formState.address ?? {})
  };

  if (!normalized.firstName) {
    errors.firstName = 'Add your first name to personalise the workspace.';
  }
  if (!normalized.lastName) {
    errors.lastName = 'Add your last name so teammates can recognise you.';
  }
  if (!normalized.email || !EMAIL_REGEX.test(normalized.email)) {
    errors.email = 'Enter a valid email so we can confirm your account.';
  }
  if (!normalized.password || normalized.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters in your password.`;
  }
  if (normalized.password !== normalized.confirmPassword) {
    errors.confirmPassword = 'Passwords must match before we can continue.';
  }

  let parsedAge = undefined;
  if (normalized.age) {
    const asNumber = Number.parseInt(normalized.age, 10);
    if (Number.isNaN(asNumber) || asNumber < 0) {
      errors.age = 'Age must be a non-negative number if provided.';
    } else {
      parsedAge = asNumber;
    }
  }

  const payload = {
    firstName: normalized.firstName,
    lastName: normalized.lastName,
    email: normalized.email,
    password: normalized.password,
    role: normalized.role || 'learner',
    ...(parsedAge !== undefined ? { age: parsedAge } : {}),
    ...(Object.keys(normalized.address).length ? { address: normalized.address } : {})
  };

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalized: payload
  };
}

export function looksLikeUrl(value) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return Boolean(parsed.protocol && parsed.host);
  } catch (_error) {
    return false;
  }
}

export function validateInstructorApplication(formState, { step } = {}) {
  const errors = {};
  if (!formState) {
    return { valid: false, errors: { form: 'Missing instructor application data.' }, normalized: null };
  }

  const normalized = {
    motivation: String(formState.motivation ?? '').trim(),
    experienceYears: String(formState.experienceYears ?? '').trim(),
    teachingFocus: String(formState.teachingFocus ?? '').trim(),
    portfolioUrl: String(formState.portfolioUrl ?? '').trim(),
    marketingAssets: String(formState.marketingAssets ?? '').trim(),
    availabilityTimezone: String(formState.availabilityTimezone ?? '').trim(),
    availabilityNotes: String(formState.availabilityNotes ?? '').trim(),
    availabilityPreferredDays: Array.isArray(formState.availabilityPreferredDays)
      ? formState.availabilityPreferredDays.filter(Boolean)
      : [],
    availabilitySessionFormats: Array.isArray(formState.availabilitySessionFormats)
      ? formState.availabilitySessionFormats.filter(Boolean)
      : []
  };

  const ensureMotivation = () => {
    if (normalized.motivation.length < MIN_MOTIVATION_LENGTH) {
      errors.motivation = `Share at least ${MIN_MOTIVATION_LENGTH} characters about your motivation.`;
    }
    const years = Number.parseInt(normalized.experienceYears || '0', 10);
    if (Number.isNaN(years) || years < 0) {
      errors.experienceYears = 'Add your years of experience as a non-negative number.';
    }
    if (!normalized.teachingFocus) {
      errors.teachingFocus = 'List at least one teaching focus area.';
    }
  };

  const ensurePortfolio = () => {
    if (!normalized.portfolioUrl) {
      errors.portfolioUrl = 'Add a portfolio or flagship cohort URL.';
    } else if (!looksLikeUrl(normalized.portfolioUrl)) {
      errors.portfolioUrl = 'Provide a valid https:// URL so reviewers can verify your work.';
    }
  };

  const ensureAvailability = () => {
    if (!normalized.availabilityTimezone) {
      errors.availabilityTimezone = 'Confirm your primary timezone.';
    }
    if (normalized.availabilityPreferredDays.length === 0) {
      errors.availabilityPreferredDays = 'Select at least one day you can host cohorts.';
    }
    if (normalized.availabilitySessionFormats.length === 0) {
      errors.availabilitySessionFormats = 'Choose at least one delivery format you support.';
    }
  };

  switch (step) {
    case 'motivation':
      ensureMotivation();
      break;
    case 'portfolio':
      ensurePortfolio();
      break;
    case 'availability':
      ensureAvailability();
      break;
    case 'review':
    default:
      ensureMotivation();
      ensurePortfolio();
      ensureAvailability();
      break;
  }

  const numericExperience = Number.parseInt(normalized.experienceYears || '0', 10);
  const payload = {
    motivation: normalized.motivation,
    experienceYears: Number.isNaN(numericExperience) ? 0 : numericExperience,
    teachingFocus: normalized.teachingFocus
      ? normalized.teachingFocus.split(',').map((value) => value.trim()).filter(Boolean)
      : [],
    portfolioUrl: normalized.portfolioUrl || null,
    marketingAssets: normalized.marketingAssets
      ? normalized.marketingAssets.split('\n').map((value) => value.trim()).filter(Boolean)
      : [],
    availability: {
      timezone: normalized.availabilityTimezone || null,
      notes: normalized.availabilityNotes || null,
      preferredDays: normalized.availabilityPreferredDays,
      sessionFormats: normalized.availabilitySessionFormats
    }
  };

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalized: payload
  };
}

export default {
  validateRegisterForm,
  validateInstructorApplication,
  normalizeAddress,
  looksLikeUrl
};
