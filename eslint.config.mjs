import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import checkFile from 'eslint-plugin-check-file';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

const TS_FILES = ['**/*.ts', '**/*.tsx'];
const TEST_FILES = ['**/*.spec.{ts,tsx}', '**/*.test.{ts,tsx}', 'e2e/**/*.ts'];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/playwright-report/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        // Chaque projet (backend, frontend, e2e) a son tsconfig : le service trouve le plus proche.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Les fichiers JS (configs d'outillage) ne sont dans aucun tsconfig : pas de règles typées.
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },

  {
    files: TS_FILES,
    plugins: { import: importPlugin, 'check-file': checkFile },
    rules: {
      // Typage : pas de contournement du compilateur (`as const` reste permis).
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',

      // Taille : fonctions courtes, simples, fichiers lisibles.
      'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      complexity: ['error', 10],

      // Un `catch` vide avale l'erreur en silence.
      'no-empty': ['error', { allowEmptyCatch: false }],

      // Nommage.
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'function', format: ['camelCase'] },
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE'], leadingUnderscore: 'allow' },
      ],
      'check-file/filename-naming-convention': [
        'error',
        { '**/*.{ts,tsx}': 'KEBAB_CASE' },
        { ignoreMiddleExtensions: true },
      ],

      // Exports nommés uniquement ; imports ordonnés.
      'import/no-default-export': 'error',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },

  // Un module Nest est une classe vide portée par son décorateur : c'est le fonctionnement normal.
  {
    files: ['**/*.module.ts'],
    rules: { '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }] },
  },

  // Composants React : fonctions et constantes en PascalCase.
  {
    files: ['**/*.tsx'],
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        {
          selector: 'variable',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
        },
      ],
    },
  },

  // La logique pure ne dépend jamais des couches d'effets (NestJS, React, TypeORM).
  {
    files: ['**/*.pure.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@nestjs/*', 'react', 'react-dom', 'typeorm', 'pg'],
              message: 'Un fichier *.pure.ts ne dépend ni du framework ni de la base.',
            },
          ],
        },
      ],
    },
  },

  // Les suites de tests sont de longs `describe` : la limite de taille de fonction n'a pas de sens.
  {
    files: TEST_FILES,
    rules: { 'max-lines-per-function': 'off' },
  },

  // Les outils (Vite, Playwright, Jest...) exigent un export par défaut dans leur fichier de config.
  {
    files: ['**/*.config.{ts,mjs,js}'],
    rules: { 'import/no-default-export': 'off' },
  },

  // Doit rester en dernier : désactive les règles de style qui entrent en conflit avec Prettier.
  prettier,
);
