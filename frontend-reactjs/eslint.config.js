import js from '@eslint/js';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

const reactRecommended = reactPlugin.configs.flat?.recommended ?? reactPlugin.configs.recommended;

const baseLanguageOptions = {
  ecmaVersion: 'latest',
  sourceType: 'module',
  globals: {
    ...globals.browser,
    ...globals.es2021,
    describe: 'readonly',
    it: 'readonly',
    expect: 'readonly',
    beforeEach: 'readonly',
    afterEach: 'readonly',
    beforeAll: 'readonly',
    afterAll: 'readonly',
    vi: 'readonly'
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    }
  }
};

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'build/**', 'node_modules/**', 'src/pages/dashboard/**']
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks
    },
    languageOptions: baseLanguageOptions,
    rules: {
      ...reactRecommended?.rules,
      ...reactHooks.configs?.recommended?.rules,
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off'
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  {
    files: ['src/**/*.{test.js,test.jsx,spec.js,spec.jsx}', 'src/**/__tests__/**/*.{js,jsx}'],
    languageOptions: {
      ...baseLanguageOptions,
      globals: {
        ...baseLanguageOptions.globals,
        ...globals.node
      }
    }
  }
];
