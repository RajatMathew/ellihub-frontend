import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import unusedImports from 'eslint-plugin-unused-imports';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist', 'dev-dist', '**/node_modules']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { 'unused-imports': unusedImports },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      // Code quality & consistency (non-style; Prettier handles style)
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'prefer-const': 'warn',
    },
  },
  {
    // Resource lists go through the shared kit in src/app/components/data-table.
    // Type-only imports stay allowed so column files can annotate ColumnDef.
    files: ['src/modules/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@tanstack/react-table',
              allowTypeImports: true,
              message:
                'Build lists with useListState/useListTable from @/app/components/data-table. Reach for the raw table via list.table if you genuinely need it.',
            },
          ],
          // Page headers go through the shared presets. Composing the Toolbar
          // primitives by hand is what produced five competing header systems
          // and ten hand-rolled copies of the detail header.
          patterns: [
            {
              group: ['**/page-header/internal/*', '@/app/components/page-header/internal/*'],
              message:
                'Import ListPageHeader, DetailPageHeader or FormPageHeader from @/app/components/page-header. The Toolbar primitives are internal to it — if no preset fits, add the region to PageHeader rather than assembling a header in a module.',
            },
          ],
        },
      ],
      // Reaching for `!important` means a primitive is missing a variant. Adding
      // the variant is the fix; shouting over the cascade is what produced 72 of
      // these across 28 files before the card-header token scope replaced them.
      'no-restricted-syntax': [
        'error',
        {
          // Class strings arrive here with their quotes stripped, so matching a
          // `!` at the start of the value or after whitespace is enough. The
          // `[a-z[]` tail keeps it off things like `!isLoading`.
          selector: 'Literal[value=/(^|\\s)![a-z[]/]',
          message:
            'No `!important` Tailwind utilities in modules. If a control will not take the style it needs, add a variant to the primitive instead.',
        },
        {
          selector: 'TemplateElement[value.raw=/(^|\\s)![a-z[]/]',
          message:
            'No `!important` Tailwind utilities in modules. If a control will not take the style it needs, add a variant to the primitive instead.',
        },
      ],
    },
  },
  eslintConfigPrettier,
]);
