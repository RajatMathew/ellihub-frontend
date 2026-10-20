// Carlito: Calibri's free metric twin, so Calibri workbooks lay out at Excel's
// widths without Office installed. Bundled with this lazy chunk, and only the
// faces a sheet uses are downloaded.

import '@fontsource/carlito/400.css';
import '@fontsource/carlito/400-italic.css';
import '@fontsource/carlito/700.css';
import '@fontsource/carlito/700-italic.css';

const FACES = ['400 11pt Carlito', '700 11pt Carlito'];
/** A font that never arrives must not hold the preview; it draws with the fallback. */
const TIMEOUT_MS = 3000;

/**
 * Waits for Carlito before the grid is measured. Column widths come from the
 * rendered font's digit width, so measuring while the fallback is still
 * showing would size every column for the wrong font.
 */
export async function loadSheetFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.race([
      Promise.all(FACES.map((face) => document.fonts.load(face))),
      new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS)),
    ]);
  } catch (error: unknown) {
    console.warn('spreadsheet fonts did not load; using the fallback', error);
  }
}
