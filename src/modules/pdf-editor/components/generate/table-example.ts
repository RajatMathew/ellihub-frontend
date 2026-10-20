import type { FillTargets } from './check-columns';

/**
 * The shape to write, spelled out with this file's own names -- a shorter
 * road to a working file than any wording of the rule.
 *
 * Beside `data-summary.tsx` rather than inside it: a file exporting both a
 * component and a function breaks fast refresh for the component.
 */
export function tableExample(targets: FillTargets): string {
  const slot = targets.slotNames[0];
  const table = targets.tables[0];
  const row = (table?.columns ?? []).slice(0, 2);
  const cells =
    row.length > 0 ? row.map((c, i) => `"${c}": "${i + 1}"`).join(', ') : '"Column 1": "1"';
  const lines = [
    '[',
    '  {',
    ...(slot ? [`    "${slot}": "…",`] : []),
    `    "${table?.name ?? 'Table 1'}": [`,
    `      { ${cells} }`,
    '    ]',
    '  }',
    ']',
  ];
  return lines.join('\n');
}
