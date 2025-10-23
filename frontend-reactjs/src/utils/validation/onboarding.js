const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:']);

export const REGISTRATION_SCHEMA = Object.freeze({
  firstName: { minLength: 2, maxLength: 120 },
  lastName: { minLength: 2, maxLength: 120 },
  email: { pattern: EMAIL_REGEX },
  password: { minLength: 12 },
  confirmPassword: {},
  role: { values: ['instructor', 'user'] },
  age: { min: 13, max: 120 },
  address: {
    streetAddress: { maxLength: 180 },
    addressLine2: { maxLength: 120, optional: true },
    town: { maxLength: 120, optional: true },
    city: { maxLength: 120, optional: true },
    country: { maxLength: 120, optional: true },
    postcode: { maxLength: 30, optional: true }
  }
});

export const INSTRUCTOR_APPLICATION_SCHEMA = Object.freeze({
  motivation: { minLength: 30 },
  experienceYears: { min: 0, max: 80 },
  teachingFocus: { minItems: 1 },
  portfolioUrl: { required: true },
  availabilityTimezone: { required: true },
  availabilityPreferredDays: { minItems: 1 },
  availabilitySessionFormats: { minItems: 1 }
});

function trimValue(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function hasComplexPassword(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }
  const hasLower = /[a-z]/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSymbol = /[^A-Za-z0-9]/.test(value);
  return hasLower && hasUpper && hasNumber && hasSymbol;
}

export function validateRegistrationForm(formState = {}, options = {}) {
  const errors = {};
  const normalized = {
    firstName: trimValue(formState.firstName ?? ''),
    lastName: trimValue(formState.lastName ?? ''),
    email: trimValue(formState.email ?? ''),
    password: formState.password ?? '',
    confirmPassword: formState.confirmPassword ?? '',
    role: trimValue(formState.role ?? ''),
    age: formState.age,
    address: formState.address ?? {}
  };

  if (!normalized.firstName || normalized.firstName.length < REGISTRATION_SCHEMA.firstName.minLength) {
    errors.firstName = 'Enter your first name so we can personalise your workspace.';
  }
  if (!normalized.lastName || normalized.lastName.length < REGISTRATION_SCHEMA.lastName.minLength) {
    errors.lastName = 'Enter your last name.';
  }
  if (!normalized.email || !REGISTRATION_SCHEMA.email.pattern.test(normalized.email)) {
    errors.email = 'Enter a valid email address to receive verification and receipts.';
  }
  if (!normalized.password || normalized.password.length < REGISTRATION_SCHEMA.password.minLength) {
    errors.password = `Use at least ${REGISTRATION_SCHEMA.password.minLength} characters.`;
  } else if (!hasComplexPassword(normalized.password)) {
    errors.password = 'Include upper, lower, number, and symbol characters for a secure password.';
  }
  if (normalized.confirmPassword !== normalized.password) {
    errors.confirmPassword = 'Passwords must match.';
  }

  if (!REGISTRATION_SCHEMA.role.values.includes(normalized.role)) {
    normalized.role = REGISTRATION_SCHEMA.role.values[0];
  }

  const trimmedAge = trimValue(normalized.age);
  if (trimmedAge !== undefined && trimmedAge !== null && String(trimmedAge).trim() !== '') {
    const numericAge = Number(trimmedAge);
    if (Number.isNaN(numericAge)) {
      errors.age = 'Age must be a number or left blank.';
    } else if (numericAge < REGISTRATION_SCHEMA.age.min || numericAge > REGISTRATION_SCHEMA.age.max) {
      errors.age = `Age should be between ${REGISTRATION_SCHEMA.age.min} and ${REGISTRATION_SCHEMA.age.max}.`;
    } else {
      normalized.age = numericAge;
    }
  } else {
    normalized.age = null;
  }

  const sanitizedAddress = Object.entries(normalized.address ?? {}).reduce((acc, [key, value]) => {
    if (!(key in REGISTRATION_SCHEMA.address)) {
      return acc;
    }
    const trimmed = trimValue(value ?? '');
    if (!trimmed) {
      return acc;
    }
    const rules = REGISTRATION_SCHEMA.address[key];
    if (rules.maxLength && trimmed.length > rules.maxLength) {
      errors.address = 'Address fields should stay under the length limit.';
      return acc;
    }
    acc[key] = trimmed;
    return acc;
  }, {});

  normalized.address = Object.keys(sanitizedAddress).length ? sanitizedAddress : null;

  if (options.requireTermsAcceptance && !options.acceptedTerms) {
    errors.agreeToTerms = 'Accept the terms to continue.';
  }

  return { errors, normalized };
}

export function createRegistrationPayload(formState, options = {}) {
  const { errors, normalized } = validateRegistrationForm(formState, options);
  if (Object.keys(errors).length) {
    return { errors, payload: null, normalized };
  }

  const payload = {
    firstName: normalized.firstName,
    lastName: normalized.lastName,
    email: normalized.email,
    password: normalized.password,
    role: normalized.role
  };

  if (normalized.age != null) {
    payload.age = normalized.age;
  }

  if (normalized.address) {
    payload.address = normalized.address;
  }

  const twoFactor = options.twoFactor ?? {};
  payload.twoFactor = {
    enabled: twoFactor.locked ? true : Boolean(twoFactor.enabled),
    enforced: Boolean(twoFactor.locked)
  };

  return { errors, payload, normalized };
}

function looksLikeUrl(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }
  try {
    const parsed = new URL(value);
    return SAFE_URL_PROTOCOLS.has(parsed.protocol);
  } catch (error) {
    return false;
  }
}

export function validateInstructorApplication(formState = {}, { stepId } = {}) {
  const errors = {};
  const motivation = trimValue(formState.motivation ?? '');
  const experience = Number(formState.experienceYears ?? 0);
  const focus = trimValue(formState.teachingFocus ?? '');
  const portfolio = trimValue(formState.portfolioUrl ?? '');
  const timezone = trimValue(formState.availabilityTimezone ?? '');
  const preferredDays = Array.isArray(formState.availabilityPreferredDays)
    ? formState.availabilityPreferredDays.filter(Boolean)
    : [];
  const sessionFormats = Array.isArray(formState.availabilitySessionFormats)
    ? formState.availabilitySessionFormats.filter(Boolean)
    : [];

  const ensureMotivation = () => {
    if (!motivation || motivation.length < INSTRUCTOR_APPLICATION_SCHEMA.motivation.minLength) {
      errors.motivation = `Share at least ${INSTRUCTOR_APPLICATION_SCHEMA.motivation.minLength} characters about your motivation.`;
    }
    if (Number.isNaN(experience) || experience < INSTRUCTOR_APPLICATION_SCHEMA.experienceYears.min) {
      errors.experienceYears = 'Add your years of experience as a non-negative number.';
    }
    if (experience > INSTRUCTOR_APPLICATION_SCHEMA.experienceYears.max) {
      errors.experienceYears = `Experience should be under ${INSTRUCTOR_APPLICATION_SCHEMA.experienceYears.max} years.`;
    }
    if (!focus) {
      errors.teachingFocus = 'List at least one teaching focus area.';
    }
  };

  const ensurePortfolio = () => {
    if (!portfolio) {
      errors.portfolioUrl = 'Add a portfolio or flagship cohort URL.';
    } else if (!looksLikeUrl(portfolio)) {
      errors.portfolioUrl = 'Provide a valid https:// URL so reviewers can verify your work.';
    }
  };

  const ensureAvailability = () => {
    if (!timezone) {
      errors.availabilityTimezone = 'Confirm your primary timezone.';
    }
    if (preferredDays.length < INSTRUCTOR_APPLICATION_SCHEMA.availabilityPreferredDays.minItems) {
      errors.availabilityPreferredDays = 'Select at least one day you can host cohorts.';
    }
    if (sessionFormats.length < INSTRUCTOR_APPLICATION_SCHEMA.availabilitySessionFormats.minItems) {
      errors.availabilitySessionFormats = 'Choose at least one delivery format you support.';
    }
  };

  if (!stepId || stepId === 'motivation') {
    ensureMotivation();
  }
  if (!stepId || stepId === 'portfolio') {
    ensurePortfolio();
  }
  if (!stepId || stepId === 'availability') {
    ensureAvailability();
  }
  if (stepId === 'review') {
    ensureMotivation();
    ensurePortfolio();
    ensureAvailability();
  }

  return errors;
}
