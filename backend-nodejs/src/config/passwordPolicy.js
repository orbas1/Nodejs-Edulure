const DEFAULT_PASSWORD_POLICY = Object.freeze({
  minLength: 12,
  requireLowercase: true,
  requireUppercase: true,
  requireNumber: true,
  requireSymbol: true,
  description:
    'Use at least 12 characters including uppercase and lowercase letters, a number, and a special character.'
});

function createLookahead(pattern) {
  return pattern ? `(?=${pattern})` : '';
}

export function buildPasswordPattern(policy = DEFAULT_PASSWORD_POLICY) {
  const parts = [];
  if (policy.requireLowercase) {
    parts.push(createLookahead('.*[a-z]'));
  }
  if (policy.requireUppercase) {
    parts.push(createLookahead('.*[A-Z]'));
  }
  if (policy.requireNumber) {
    parts.push(createLookahead('.*\\d'));
  }
  if (policy.requireSymbol) {
    parts.push(createLookahead('.*[^A-Za-z0-9]'));
  }

  const minLength = Math.max(policy.minLength ?? 1, 1);
  const expression = `^${parts.join('')}.{${minLength},}$`;
  return new RegExp(expression);
}

export function describePasswordPolicy(policy = DEFAULT_PASSWORD_POLICY) {
  const requirements = [];
  requirements.push({
    id: 'length',
    label: `At least ${policy.minLength ?? 12} characters`,
    required: true
  });
  if (policy.requireUppercase) {
    requirements.push({ id: 'uppercase', label: 'One uppercase letter', required: true });
  }
  if (policy.requireLowercase) {
    requirements.push({ id: 'lowercase', label: 'One lowercase letter', required: true });
  }
  if (policy.requireNumber) {
    requirements.push({ id: 'number', label: 'One number', required: true });
  }
  if (policy.requireSymbol) {
    requirements.push({ id: 'symbol', label: 'One special character', required: true });
  }

  return {
    policy: {
      minLength: policy.minLength ?? DEFAULT_PASSWORD_POLICY.minLength,
      requireLowercase: Boolean(policy.requireLowercase),
      requireUppercase: Boolean(policy.requireUppercase),
      requireNumber: Boolean(policy.requireNumber),
      requireSymbol: Boolean(policy.requireSymbol),
      description: policy.description ?? DEFAULT_PASSWORD_POLICY.description
    },
    requirements
  };
}

export function resolvePasswordPolicy(rawPolicy) {
  if (!rawPolicy || typeof rawPolicy !== 'object') {
    return DEFAULT_PASSWORD_POLICY;
  }

  return Object.freeze({
    minLength: Number.isInteger(rawPolicy.minLength) ? Math.max(rawPolicy.minLength, 1) : DEFAULT_PASSWORD_POLICY.minLength,
    requireLowercase:
      rawPolicy.requireLowercase === undefined
        ? DEFAULT_PASSWORD_POLICY.requireLowercase
        : Boolean(rawPolicy.requireLowercase),
    requireUppercase:
      rawPolicy.requireUppercase === undefined
        ? DEFAULT_PASSWORD_POLICY.requireUppercase
        : Boolean(rawPolicy.requireUppercase),
    requireNumber:
      rawPolicy.requireNumber === undefined ? DEFAULT_PASSWORD_POLICY.requireNumber : Boolean(rawPolicy.requireNumber),
    requireSymbol:
      rawPolicy.requireSymbol === undefined ? DEFAULT_PASSWORD_POLICY.requireSymbol : Boolean(rawPolicy.requireSymbol),
    description: rawPolicy.description ?? DEFAULT_PASSWORD_POLICY.description
  });
}

export { DEFAULT_PASSWORD_POLICY };
