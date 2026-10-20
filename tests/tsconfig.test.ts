import { dirname, join } from 'node:path';

import { describe, expect, test } from 'bun:test';
import ts from 'typescript';

/**
 * Every tsconfig compiles its options without a diagnostic.
 *
 * `tsc -b` only reports on projects that have files, so the root tsconfig — which
 * has none, and exists for its path aliases — was never checked. Under
 * TypeScript 6 its `baseUrl` is a deprecation error (TS5101) that editors show
 * and TypeScript 7 turns into a hard failure, while `npm run build` stayed green.
 */
const ROOT = join(import.meta.dir, '..');
const CONFIGS = ['tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json'];

function optionDiagnostics(file: string): string[] {
  const path = join(ROOT, file);
  const { config, error } = ts.readConfigFile(path, ts.sys.readFile);
  if (error) return [ts.flattenDiagnosticMessageText(error.messageText, '\n')];

  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, dirname(path), undefined, path);
  const program = ts.createProgram({ rootNames: [], options: parsed.options });

  return (
    [...parsed.errors, ...program.getOptionsDiagnostics()]
      // An empty `files` list is intended for the solution config.
      .filter((diagnostic) => diagnostic.code !== 18002)
      .map(
        (diagnostic) =>
          `TS${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`
      )
  );
}

describe('tsconfig', () => {
  for (const file of CONFIGS) {
    test(`${file} has no option diagnostics, deprecations included`, () => {
      expect(optionDiagnostics(file)).toEqual([]);
    });
  }
});
