import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, test } from 'bun:test';
import ts from 'typescript';

/**
 * Every <title> rendered in src has exactly one child.
 *
 * React 19 renders <title> itself and hoists it to <head>, and react-helmet-async 3
 * hands titles to it on React 19. React needs the title's text as a single string:
 * `<title>{title} | ElliHub</title>` is two children — the expression and the text
 * after it — and the element is left empty, so the tab shows no title at all.
 * Build it as one string: `<title>{`${title} | ElliHub`}</title>`.
 */
const ROOT = join(import.meta.dir, '..');

function tsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

/** The children React sees: whitespace-only text between tags is dropped. */
function meaningfulChildren(element: ts.JsxElement) {
  return element.children.filter(
    (child) => !(ts.isJsxText(child) && child.containsOnlyTriviaWhiteSpaces)
  );
}

function titlesWithoutASingleChild(file: string): string[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const found: string[] = [];

  const visit = (node: ts.Node) => {
    if (
      ts.isJsxElement(node) &&
      node.openingElement.tagName.getText(source) === 'title' &&
      meaningfulChildren(node).length !== 1
    ) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
      found.push(`${relative(ROOT, file)}:${line + 1}  ${node.getText(source)}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  return found;
}

describe('document titles', () => {
  test('every <title> is a single string child', () => {
    const offenders = tsxFiles(join(ROOT, 'src')).flatMap(titlesWithoutASingleChild);

    expect(offenders).toEqual([]);
  });
});
