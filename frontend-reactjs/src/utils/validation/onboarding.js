const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

function normaliseText(value, maxLength = 120) {
  if (value === undefined || value === null) {
    return '';
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function normaliseEmail(value) {
  return normaliseText(value, 180).toLowerCase();
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

export function validateOnboardingState(mode, state) {
  const errors = {};
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

  if (!firstName) {
    errors.firstName = 'First name is required';
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address';
  }

  let password;
  let confirmPassword;
  if (mode === 'learner') {
    password = state.password ?? '';
    confirmPassword = state.confirmPassword ?? '';
    const role = normaliseText(state.role, 32) || 'instructor';
    if (!PASSWORD_PATTERN.test(password)) {
      errors.password =
        'Use at least 12 characters with upper, lower, number, and symbol.';
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords must match';
    }
    if (!['user', 'instructor', 'admin'].includes(role)) {
      errors.role = 'Select a valid role';
    }
  }

  const ageResult = parseAge(state.age);
  if (ageResult?.error) {
    errors.age = ageResult.error;
  }

  if (!termsAccepted) {
    errors.termsAccepted = 'You must accept the terms to continue';
  }

  const address = sanitiseAddress(state.address);

  const preferences = {
    marketingOptIn,
    timeCommitment: timeCommitment || undefined,
    onboardingPath: onboardingPath || undefined,
    interests: interests.length ? interests : undefined
  };

  const metadata = {
    ...(marketingSource ? { source: marketingSource } : {}),
    ...(marketingCampaign ? { campaign: marketingCampaign } : {})
  };

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
    role: normaliseText(state.role, 32) || 'instructor',
    headline: normaliseText(state.headline, 160),
    portfolio: normaliseText(state.portfolio, 200),
    expertise: normaliseText(state.expertise, 240),
    audience: normaliseText(state.audience, 240)
  };

  const bootstrapPayload = {
    email,
    role: cleaned.role,
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
          role: cleaned.role,
          age: cleaned.age,
          address,
          marketingOptIn
        }
      : null;

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    cleaned,
    bootstrapPayload,
    registerPayload
  };
}
