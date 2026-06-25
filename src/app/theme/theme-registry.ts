export const THEME_GROUPS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

export const THEME_OPTIONS = [
  { value: 'light', label: 'Light Theme', group: 'light' },
  { value: 'editorial', label: 'Editorial', group: 'light' },
  { value: 'dark', label: 'Dark Theme (Black)', group: 'dark' },
  { value: 'dark-blue', label: 'Dark Theme (Blue)', group: 'dark' },
  { value: 'genz', label: 'Catppuccin', group: 'dark' },
] as const;

export type AppTheme = (typeof THEME_OPTIONS)[number]['value'];
export type AppThemeGroup = (typeof THEME_GROUPS)[number]['value'];

export const DEFAULT_THEME: AppTheme = 'editorial';
export const THEME_STORAGE_KEY = 'vite-theme';
export const THEME_DEFAULT_MIGRATION_KEY = 'vite-theme-editorial-default-migrated';
export const THEME_VALUES = THEME_OPTIONS.map((theme) => theme.value);
export const DARK_THEME_VALUES: AppTheme[] = ['dark', 'dark-blue', 'genz'];
const THEME_VALUE_SET = new Set<string>(THEME_VALUES);
const DARK_THEME_VALUE_SET = new Set<string>(DARK_THEME_VALUES);

export function isAppTheme(value: string | null | undefined): value is AppTheme {
  return Boolean(value && THEME_VALUE_SET.has(value));
}

export function isDarkAppTheme(value: AppTheme): boolean {
  return DARK_THEME_VALUE_SET.has(value);
}

export const CHART_THEME_SELECTORS: Record<AppTheme, string> = {
  light: '',
  editorial: '.editorial',
  dark: '.dark',
  'dark-blue': '.dark-blue',
  genz: '.genz',
};
function isEnabledEnvValue(value: unknown): boolean {
  return ['true', '1', 'yes', 'on', 'enabled'].includes(
    String(value ?? '')
      .trim()
      .toLowerCase()
  );
}

export const THEME_SWITCHER_ENABLED = isEnabledEnvValue(import.meta.env.VITE_ENABLE_THEME_SWITCHER);
