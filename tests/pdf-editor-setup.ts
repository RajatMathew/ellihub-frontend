import { mock } from 'bun:test';

/**
 * What the PDF editor's tests need from the DOM that the test DOM does not
 * have. Loaded by `bunfig.toml`'s preload, beside `setup-dom.ts`.
 *
 * Two gaps, both from the same cause -- there is no renderer here. There is no
 * 2D canvas backend, so `@scena/react-ruler` throws the moment it draws on
 * mount; and there is no layout, so nothing supplies `elementFromPoint`, which
 * is how a table handle works out which cell a press belongs to.
 *
 * A preload rather than an import in each file, because bun does not hoist
 * `mock.module` above the imports around it: registered inside a test file, it
 * arrives after the module it is replacing has already loaded.
 */

mock.module('@scena/react-ruler', () => ({ default: () => null }));

if (typeof document !== 'undefined' && typeof document.elementFromPoint !== 'function') {
  document.elementFromPoint = () => null;
}
