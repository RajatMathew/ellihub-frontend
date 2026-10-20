import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, test } from 'bun:test';

/**
 * The editorial theme hides the icon beside a sidebar route label. The rule
 * used to match any link inside a menu item, and an item with a create action
 * (RFQs, Purchase Orders, Sub Change Order, Invoices) holds that action as a
 * second link — so its "+" was hidden too, leaving an empty square on hover.
 *
 * Checked against the real stylesheet and the markup `AccordionMenuLinkItem`
 * renders for an item with a trailing action.
 */

const THEME_FILE = path.join(
  import.meta.dir,
  '..',
  'src',
  'app',
  'styles',
  'themes',
  'editorial.css'
);

/** Selectors of every rule in the theme that hides an svg. */
function svgHidingSelectors(): string[] {
  const source = readFileSync(THEME_FILE, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, , body]) => /display\s*:\s*none/.test(body!))
    .flatMap(([, selectorList]) => selectorList!.split(','))
    .map((selector) => selector.replace(/\s+/g, ' ').trim())
    .filter((selector) => /\bsvg\b/.test(selector));
}

function renderMenuItemWithCreateAction() {
  document.body.innerHTML = `
    <div class="editorial">
      <aside data-slot="app-sidebar">
        <div data-sidebar-menu="secondary">
          <div data-slot="accordion-menu-link-item" role="none">
            <a role="menuitem" href="/app/project/p1/rfqs"><svg id="route-icon"></svg><span>RFQs</span></a>
            <a aria-label="Create RFQ" data-slot="sidebar-menu-create-action" href="/app/project/p1/rfqs/create"><svg id="create-icon"></svg></a>
          </div>
        </div>
      </aside>
    </div>`;

  return {
    routeIcon: document.getElementById('route-icon')!,
    createIcon: document.getElementById('create-icon')!,
  };
}

const isHidden = (element: Element) =>
  svgHidingSelectors().some((selector) => element.matches(selector));

describe('the editorial sidebar', () => {
  test('still finds its icon-hiding rule', () => {
    expect(svgHidingSelectors().length).toBeGreaterThan(0);
  });

  test('shows the "+" of a create action', () => {
    const { createIcon } = renderMenuItemWithCreateAction();

    expect(isHidden(createIcon)).toBe(false);
  });

  test('keeps hiding the icon beside the route label', () => {
    const { routeIcon } = renderMenuItemWithCreateAction();

    expect(isHidden(routeIcon)).toBe(true);
  });
});
