const loadModule = async (specifier) => {
  try {
    return await import(specifier);
  } catch (error) {
    if (process.env.DEBUG_ESLINT_CONFIG === '1') {
      console.warn(`Optional dependency "${specifier}" could not be loaded`, error);
    }
    return null;
  }
};

const jsModule = await loadModule('@eslint/js');
const importPluginModule = await loadModule('eslint-plugin-import');
const prettierModule = await loadModule('eslint-config-prettier');
const globalsModule = await loadModule('globals');

const resolveModule = (mod) => (mod && mod.default ? mod.default : mod);

const jsConfig = resolveModule(jsModule);
const importPlugin = resolveModule(importPluginModule);
const prettierConfig = resolveModule(prettierModule);
const globalSets = resolveModule(globalsModule) ?? {};

const recommendedRules =
  jsConfig?.configs?.recommended?.rules ??
  jsModule?.configs?.recommended?.rules ?? {
    'curly': ['error', 'multi-line'],
    'dot-notation': 'error',
    'eqeqeq': ['error', 'smart'],
    'no-cond-assign': ['error', 'always'],
    'no-constant-condition': ['warn', { checkLoops: false }],
    'no-constructor-return': 'error',
    'no-control-regex': 'warn',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-prototype-builtins': 'error',
    'no-self-compare': 'error',
    'no-template-curly-in-string': 'warn',
    'no-unreachable': 'error',
    'no-unsafe-negation': 'error',
    'no-useless-backreference': 'error',
    'prefer-const': ['error', { destructuring: 'all' }],
    'prefer-template': 'warn'
  };

const importRecommendedRules = importPlugin
  ? importPlugin.configs?.recommended?.rules ?? {}
  : {};

const importSettings = {
  'import/resolver': {
    node: {
      extensions: ['.js', '.mjs', '.cjs'],
      moduleDirectory: ['node_modules', 'src']
    }
  },
  'import/core-modules': ['prom-client', 'nodemailer', 'vitest/config']
};

const importOrderRule = [
  'warn',
  {
    groups: [
      ['builtin', 'external'],
      ['internal'],
      ['parent', 'sibling', 'index']
    ],
    'newlines-between': 'always',
    alphabetize: {
      order: 'asc',
      caseInsensitive: true
    }
  }
];

const baseGlobals = {
  Buffer: 'readonly',
  console: 'readonly',
  process: 'readonly',
  setImmediate: 'readonly',
  clearImmediate: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  ...(globalSets.node ?? {}),
  ...(globalSets.es2021 ?? {}),
  ...(globalSets.es2022 ?? {})
};

const testGlobals = {
  describe: 'readonly',
  it: 'readonly',
  test: 'readonly',
  expect: 'readonly',
  beforeAll: 'readonly',
  beforeEach: 'readonly',
  afterAll: 'readonly',
  afterEach: 'readonly',
  vi: 'readonly',
  ...(globalSets.vitest ?? {}),
  ...(globalSets.jest ?? {})
};

const sharedRules = {
  ...recommendedRules,
  ...importRecommendedRules,
  ...(importPlugin ? { 'import/order': importOrderRule } : {}),
  'no-console': ['warn', { allow: ['warn', 'error'] }],
  'no-duplicate-imports': 'error',
  'no-new-wrappers': 'error',
  'no-promise-executor-return': 'error',
  'no-unused-vars': [
    'error',
    {
      args: 'after-used',
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
      ignoreRestSiblings: true
    }
  ],
  'prefer-object-spread': 'error'
};

const config = [
  {
    ignores: [
      '**/node_modules/**',
      'coverage/**',
      'dist/**',
      'build/**',
      'storage/**',
      '*.log'
    ]
  },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: baseGlobals
    },
    settings: importSettings,
    plugins: importPlugin ? { import: importPlugin } : {},
    rules: sharedRules
  },
  {
    files: ['src/services/DashboardService.js'],
    rules: {
      ...sharedRules,
      'no-unused-vars': [
        'warn',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true
        }
      ]
    }
  },
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: baseGlobals
    },
    rules: {
      ...sharedRules,
      'no-console': 'off'
    }
  },
  {
    files: ['test/**/*.js', '**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...baseGlobals,
        ...testGlobals
      }
    },
    rules: {
      ...sharedRules,
      'no-console': 'off',
      'import/no-extraneous-dependencies': 'off'
    }
  }
];

if (prettierConfig) {
  config.push(prettierConfig);
}

export default config;
