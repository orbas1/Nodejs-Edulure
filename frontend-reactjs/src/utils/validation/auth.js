const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FALLBACK_PASSWORD_POLICY = Object.freeze({
  minLength: 12,
  requireLowercase: true,
  requireUppercase: true,
  requireNumber: true,
  requireSymbol: true,
  description:
    'Use at least 12 characters including uppercase and lowercase letters, a number, and a special character.'
});

export function normaliseText(value, maxLength = 120) {
  if (value === undefined || value === null) {
    return '';
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

export function normaliseEmail(value) {
  return normaliseText(value, 180).toLowerCase();
}

export function normalisePasswordPolicy(rawPolicy) {
  if (!rawPolicy || typeof rawPolicy !== 'object') {
    return FALLBACK_PASSWORD_POLICY;
  }

  return Object.freeze({
    minLength: Number.isInteger(rawPolicy.minLength)
      ? Math.max(rawPolicy.minLength, 1)
      : FALLBACK_PASSWORD_POLICY.minLength,
    requireLowercase:
      rawPolicy.requireLowercase === undefined
        ? FALLBACK_PASSWORD_POLICY.requireLowercase
        : Boolean(rawPolicy.requireLowercase),
    requireUppercase:
      rawPolicy.requireUppercase === undefined
        ? FALLBACK_PASSWORD_POLICY.requireUppercase
        : Boolean(rawPolicy.requireUppercase),
    requireNumber:
      rawPolicy.requireNumber === undefined
        ? FALLBACK_PASSWORD_POLICY.requireNumber
        : Boolean(rawPolicy.requireNumber),
    requireSymbol:
      rawPolicy.requireSymbol === undefined
        ? FALLBACK_PASSWORD_POLICY.requireSymbol
        : Boolean(rawPolicy.requireSymbol),
    description: rawPolicy.description ?? FALLBACK_PASSWORD_POLICY.description
  });
}

export function evaluatePasswordStrength(password, policy = FALLBACK_PASSWORD_POLICY) {
  const safePassword = typeof password === 'string' ? password : '';
  const requirements = [];
  const minLength = policy.minLength ?? FALLBACK_PASSWORD_POLICY.minLength;
  requirements.push({
    id: 'length',
    label: `At least ${minLength} characters`,
    required: true,
    met: safePassword.length >= minLength
  });
  if (policy.requireUppercase) {
    requirements.push({ id: 'uppercase', label: 'One uppercase letter', required: true, met: /[A-Z]/.test(safePassword) });
  }
  if (policy.requireLowercase) {
    requirements.push({ id: 'lowercase', label: 'One lowercase letter', required: true, met: /[a-z]/.test(safePassword) });
  }
  if (policy.requireNumber) {
    requirements.push({ id: 'number', label: 'One number', required: true, met: /\d/.test(safePassword) });
  }
  if (policy.requireSymbol) {
    requirements.push({
      id: 'symbol',
      label: 'One special character',
      required: true,
      met: /[^A-Za-z0-9]/.test(safePassword)
    });
  }

  const metCount = requirements.filter((requirement) => requirement.met).length;
  const totalRequired = requirements.filter((requirement) => requirement.required !== false).length;
  const isCompliant = requirements.every((requirement) => requirement.required === false || requirement.met);

  return {
    requirements,
    metCount,
    totalRequired,
    isCompliant,
    description: policy.description ?? FALLBACK_PASSWORD_POLICY.description
  };
}

export function createLoginState(overrides = {}) {
  return {
    email: '',
    password: '',
    twoFactorCode: '',
    rememberMe: true,
    ...overrides
  };
}

export function validateLoginState(state, { requireTwoFactor = false } = {}) {
  const errors = {};
  const email = normaliseEmail(state.email);
  if (!email || !EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter the email address you use for Edulure.';
  }

  const password = typeof state.password === 'string' ? state.password.trim() : '';
  if (!password) {
    errors.password = 'Enter your password to continue.';
  }

  const twoFactorCode = typeof state.twoFactorCode === 'string' ? state.twoFactorCode.trim() : '';
  const rememberMe = Boolean(state.rememberMe);
  if (twoFactorCode) {
    if (!/^\d{6,10}$/.test(twoFactorCode)) {
      errors.twoFactorCode = 'Enter your 6–10 digit security code.';
    }
  } else if (requireTwoFactor) {
    errors.twoFactorCode = 'Security code required for this sign-in.';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    cleaned: {
      email,
      password,
      twoFactorCode: twoFactorCode || undefined,
      rememberMe
    }
  };
}

export function createRegisterAccountState(overrides = {}) {
  return {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    ...overrides
  };
}

export function validateRegisterAccountState(state, policy = FALLBACK_PASSWORD_POLICY) {
  const errors = {};
  const firstName = normaliseText(state.firstName, 120);
  const lastName = normaliseText(state.lastName, 120);
  const email = normaliseEmail(state.email);
  if (!firstName) {
    errors.firstName = 'Tell us your first name so we can personalise onboarding.';
  }
  if (!email || !EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid work email address.';
  }

  const password = typeof state.password === 'string' ? state.password : '';
  const confirmPassword = typeof state.confirmPassword === 'string' ? state.confirmPassword : '';
  const evaluation = evaluatePasswordStrength(password, policy);
  if (!evaluation.isCompliant) {
    errors.password = evaluation.description;
  }
  if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords must match before continuing.';
  }

  const role = normaliseText(state.role, 40) || 'user';
  if (!['user', 'instructor', 'admin'].includes(role)) {
    errors.role = 'Choose a valid role.';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    cleaned: {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      role,
      evaluation
    }
  };
}

export { EMAIL_PATTERN, FALLBACK_PASSWORD_POLICY as DEFAULT_PASSWORD_POLICY };
