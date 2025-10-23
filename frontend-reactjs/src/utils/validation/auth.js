const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const defaultPasswordPolicy = Object.freeze({
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: true
});

function normaliseString(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
}

function normaliseArray(value) {
  if (value === undefined || value === null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function evaluatePassword(password, policy = defaultPasswordPolicy) {
  const input = normaliseString(password);
  const lengthOk = input.length >= (policy.minLength ?? defaultPasswordPolicy.minLength);
  const upperOk = policy.requireUppercase ? /[A-Z]/.test(input) : true;
  const lowerOk = policy.requireLowercase ? /[a-z]/.test(input) : true;
  const numberOk = policy.requireNumber ? /[0-9]/.test(input) : true;
  const symbolOk = policy.requireSymbol ? /[^A-Za-z0-9]/.test(input) : true;

  return {
    lengthOk,
    upperOk,
    lowerOk,
    numberOk,
    symbolOk,
    valid: lengthOk && upperOk && lowerOk && numberOk && symbolOk
  };
}

export function validateLogin(values = {}, { requirePassword = true } = {}) {
  const errors = {};
  const email = normaliseString(values.email);
  if (!email || !EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address';
  }

  if (requirePassword) {
    const password = normaliseString(values.password);
    if (!password) {
      errors.password = 'Password is required';
    }
  }

  const twoFactorCode = normaliseString(values.twoFactorCode);
  if (twoFactorCode && !/^\d{6,10}$/.test(twoFactorCode)) {
    errors.twoFactorCode = 'Enter a 6-10 digit code without spaces';
  }

  return { errors };
}

export function validateRegistration(values = {}, policy = defaultPasswordPolicy) {
  const errors = {};
  const firstName = normaliseString(values.firstName);
  const lastName = normaliseString(values.lastName);
  const email = normaliseString(values.email);
  const password = normaliseString(values.password);
  const confirmPassword = normaliseString(values.confirmPassword);
  const age = normaliseString(values.age);

  if (!firstName) {
    errors.firstName = 'First name is required';
  }
  if (!lastName) {
    errors.lastName = 'Last name is required';
  }
  if (!email || !EMAIL_PATTERN.test(email)) {
    errors.email = 'Provide a valid email address';
  }

  const evaluation = evaluatePassword(password, policy);
  if (!evaluation.valid) {
    errors.password = 'Password does not meet the minimum security requirements';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Confirm your password';
  } else if (confirmPassword !== password) {
    errors.confirmPassword = 'Passwords must match exactly';
  }

  if (age) {
    const parsed = Number.parseInt(age, 10);
    if (!Number.isFinite(parsed)) {
      errors.age = 'Age must be a number';
    } else if (parsed < 16) {
      errors.age = 'You must be at least 16 years old';
    }
  }

  const role = normaliseString(values.role);
  if (!role) {
    errors.role = 'Select your role intent';
  }

  const address = values.address ?? {};
  if (address && typeof address === 'object') {
    const street = normaliseString(address.streetAddress);
    const city = normaliseString(address.city);
    const country = normaliseString(address.country);
    if (street && street.length < 3) {
      errors['address.streetAddress'] = 'Street address must be at least three characters';
    }
    if (city && city.length < 2) {
      errors['address.city'] = 'City must be at least two characters';
    }
    if (country && country.length < 2) {
      errors['address.country'] = 'Country must be at least two characters';
    }
  }

  return { errors, passwordEvaluation: evaluation };
}

export function validateInstructorApplication(values = {}) {
  const errors = {};
  if (!normaliseString(values.name)) {
    errors.name = 'Provide your full name';
  }
  if (!normaliseString(values.headline)) {
    errors.headline = 'Add a short professional headline';
  }
  if (!normaliseString(values.portfolio)) {
    errors.portfolio = 'Link to your portfolio or website';
  }
  if (!normaliseString(values.expertise)) {
    errors.expertise = 'Outline your areas of expertise';
  }
  const audience = normaliseString(values.audience);
  if (audience && audience.length < 4) {
    errors.audience = 'Audience size should describe your reach';
  }

  const topics = normaliseArray(values.focusTopics ?? values.expertiseTopics);
  if (topics.length > 8) {
    errors.focusTopics = 'Limit focus topics to eight items';
  }

  return { errors };
}

export function summarisePasswordRequirements(policy = defaultPasswordPolicy) {
  const requirements = [];
  requirements.push(`At least ${policy.minLength ?? defaultPasswordPolicy.minLength} characters`);
  if (policy.requireUppercase) requirements.push('One uppercase letter');
  if (policy.requireLowercase) requirements.push('One lowercase letter');
  if (policy.requireNumber) requirements.push('One digit');
  if (policy.requireSymbol) requirements.push('One special character');
  return requirements;
}
