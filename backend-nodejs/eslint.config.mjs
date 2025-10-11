import js from '@eslint/js';
import eslintPluginImport from 'eslint-plugin-import';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

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
    'newlines-between': 'always'
  }
];

export default [
  {
    ignores: ['**/node_modules/**', 'coverage/**', 'dist/**', 'build/**']
  },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    settings: importSettings,
    plugins: {
      import: eslintPluginImport
    },
    rules: {
      ...js.configs.recommended.rules,
      ...eslintPluginImport.configs.recommended.rules,
      'import/order': importOrderRule,
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ]
    }
  },
  eslintConfigPrettier
];
