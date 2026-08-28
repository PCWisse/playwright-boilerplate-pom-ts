import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      'playwright-report/',
      'blob-report/',
      'allure-results/',
      'allure-report/',
      'test-results/',
      'demo-app/public/**/*.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // The rule the Playwright best-practices guide calls out by name:
      // it catches a missing `await` on a Playwright call.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
  {
    // Root-level config files (this one included) are not part of the
    // tsconfig "include" set, so they cannot be type-checked by the
    // project service. Lint them syntactically only.
    files: ['**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['tests/**/*.spec.ts', 'src/setup/**/*.setup.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-element-handle': 'error',
      'playwright/prefer-web-first-assertions': 'error',
      'playwright/no-force-option': 'error',
      'playwright/no-conditional-in-test': 'error',
      'playwright/expect-expect': 'error',
      'playwright/require-top-level-describe': 'off',
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      // Page objects and components must never sleep.
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='waitForTimeout']",
          message: 'waitForTimeout is banned. Use a web-first assertion or a locator wait instead.',
        },
      ],
    },
  },
  prettier,
);
