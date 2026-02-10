import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // Global ignores
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.svelte-kit/**'],
  },

  // Base JS recommended rules
  eslint.configs.recommended,

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // Svelte recommended rules
  ...svelte.configs['flat/recommended'],

  // Svelte files use TypeScript parser
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },

  // Project-wide rules for TS and Svelte files
  {
    files: ['**/*.ts', '**/*.svelte'],
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Svelte-specific rule overrides
  {
    files: ['**/*.svelte'],
    rules: {
      // Static routes don't need resolve() — this app uses simple route strings
      'svelte/no-navigation-without-resolve': 'off',
    },
  },

  // Prettier must be last to disable conflicting formatting rules
  prettier,
);
