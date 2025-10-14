import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'build/**',
      'tmp/**',
      'database/**',
      'seeds/**',
      'test/**',
      'knexfile.cjs'
    ]
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      'no-implicit-coercion': 'error',
      'prefer-const': [
        'error',
        {
          destructuring: 'all'
        }
      ]
    }
  }
];
