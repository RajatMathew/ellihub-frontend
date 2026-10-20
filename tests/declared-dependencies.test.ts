import { readdirSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { join, relative } from 'node:path';

import { describe, expect, test } from 'bun:test';
import ts from 'typescript';

/**
 * Every package `src/` imports must be declared in package.json.
 *
 * An undeclared import still resolves when some other dependency happens to pull the
 * package in, so it builds and runs until that dependency drops it, or moves it to a
 * version with a different API — and then it fails far from the change that caused it.
 * `framer-motion`, `react-router`, `@dnd-kit/utilities` and three `@radix-ui/react-*`
 * packages were all imported this way.
 */

const ROOT = join(import.meta.dir, '..');
const SOURCE = join(ROOT, 'src');
/** Build configuration that imports packages the bundle does not. */
const BUILD_CONFIG = ['vite.config.ts', 'vite-elli-config.ts'];

const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const declared = new Set([
  ...Object.keys(manifest.dependencies ?? {}),
  ...Object.keys(manifest.devDependencies ?? {}),
]);

/**
 * Runtime dependencies that neither src nor the build configuration imports, each with the reason it stays.
 * Anything else src does not import is dead weight — `@dnd-kit/modifiers` sat
 * here unused until it was removed.
 */
const USED_WITHOUT_IMPORT: Record<string, string> = {
  '@tiptap/core': 'exact-version peer of @tiptap/react, declared so it cannot fall below 3.30.5',
  '@tiptap/pm': 'exact-version peer of @tiptap/react; tiptap install docs list it',
  'baseline-browser-mapping': 'browser data read by browserslist at build time',
  'caniuse-lite': 'browser data read by browserslist at build time',
};

/** The path aliases from tsconfig.app.json, and Vite's virtual modules. */
const isLocal = (specifier: string) =>
  specifier.startsWith('.') ||
  /^@(app|core|modules)?\//.test(specifier) ||
  specifier.startsWith('virtual:');

/** `@scope/name/sub/path` → `@scope/name`; `name/sub/path` → `name`. */
function packageName(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]!;
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|css)$/.test(entry.name) ? [path] : [];
  });
}

/**
 * Static imports, re-exports and dynamic `import()`, as the compiler reads them;
 * for a stylesheet, its `@import` and `@plugin` specifiers.
 */
function importsOf(file: string): string[] {
  const text = readFileSync(file, 'utf8');
  if (file.endsWith('.css')) {
    return [...text.matchAll(/@(?:import|plugin)\s+['"]([^'"]+)['"]/g)].map((match) => match[1]!);
  }
  return ts.preProcessFile(text, true, true).importedFiles.map(({ fileName }) => fileName);
}

describe('package names', () => {
  test('keeps the scope of a scoped package', () => {
    expect(packageName('@radix-ui/react-dialog')).toBe('@radix-ui/react-dialog');
    expect(packageName('@tiptap/react/menus')).toBe('@tiptap/react');
  });

  test('drops the subpath of an unscoped package', () => {
    expect(packageName('motion/react')).toBe('motion');
    expect(packageName('react-dom/client')).toBe('react-dom');
  });
});

describe('declared dependencies', () => {
  test('src imports no package that package.json does not declare', () => {
    const undeclared = sourceFiles(SOURCE).flatMap((file) =>
      importsOf(file)
        .filter((specifier) => !isLocal(specifier))
        .map(packageName)
        .filter((name) => !name.startsWith('node:') && !builtinModules.includes(name))
        .filter((name) => !declared.has(name))
        .map((name) => `${relative(ROOT, file)} → ${name}`)
    );

    expect(undeclared).toEqual([]);
  });

  test('every runtime dependency is imported by src or the build, or says why not', () => {
    const buildConfig = BUILD_CONFIG.map((file) => join(ROOT, file));
    const imported = new Set(
      [...sourceFiles(SOURCE), ...buildConfig].flatMap((file) =>
        importsOf(file)
          .filter((specifier) => !isLocal(specifier))
          .map(packageName)
      )
    );

    const unused = Object.keys(manifest.dependencies ?? {}).filter(
      (name) => !imported.has(name) && !(name in USED_WITHOUT_IMPORT)
    );

    expect(unused).toEqual([]);
  });
});
