/**
 * The dot-matrix loader's patterns (elli-ui#817): which dots light, in what
 * order, on a square grid. Each returns one value per dot, row by row — when
 * in the cycle that dot lights (0 to 1), or null for a dot left dim. Pure, so
 * the patterns are tested without rendering.
 *
 * Inspired by the dot-matrix loaders at dotmatrix.zzzzshawn.cloud; written
 * here from scratch rather than copied.
 */

export const DOT_MATRIX_PATTERNS = ['spiral', 'wave', 'ripple', 'rain', 'scan', 'orbit'] as const;
export type DotMatrixPattern = (typeof DOT_MATRIX_PATTERNS)[number];

type Cell = { row: number; col: number };

const cells = (size: number): Cell[] =>
  Array.from({ length: size * size }, (_, index) => ({
    row: Math.floor(index / size),
    col: index % size,
  }));

/** The border, clockwise from the top-left corner. */
function perimeter(size: number): Cell[] {
  const last = size - 1;
  const ring: Cell[] = [];
  for (let col = 0; col <= last; col++) ring.push({ row: 0, col });
  for (let row = 1; row <= last; row++) ring.push({ row, col: last });
  for (let col = last - 1; col >= 0; col--) ring.push({ row: last, col });
  for (let row = last - 1; row >= 1; row--) ring.push({ row, col: 0 });
  return ring;
}

/** Every dot in spiral order: around the border, then each ring inside it. */
function spiralOrder(size: number): Cell[] {
  const order: Cell[] = [];
  for (let ring = 0; ring * 2 < size; ring++) {
    const inner = size - ring * 2;
    if (inner === 1) {
      order.push({ row: ring, col: ring });
      break;
    }
    for (const cell of perimeter(inner)) {
      order.push({ row: cell.row + ring, col: cell.col + ring });
    }
  }
  return order;
}

const indexOf = (order: Cell[], { row, col }: Cell) =>
  order.findIndex((cell) => cell.row === row && cell.col === col);

export function dotMatrixDelays(pattern: DotMatrixPattern, size: number): Array<number | null> {
  const last = size - 1;
  const center = last / 2;
  switch (pattern) {
    case 'spiral': {
      const order = spiralOrder(size);
      return cells(size).map((cell) => indexOf(order, cell) / (order.length - 1));
    }
    case 'wave':
      return cells(size).map(({ row, col }) => (row + col) / (2 * last));
    case 'ripple': {
      const far = Math.max(center, 0.5);
      return cells(size).map(
        ({ row, col }) => Math.max(Math.abs(row - center), Math.abs(col - center)) / far
      );
    }
    case 'rain':
      return cells(size).map(({ row, col }) => (col * size + row) / (size * size - 1));
    case 'scan':
      return cells(size).map(({ row }) => row / last);
    case 'orbit': {
      const ring = perimeter(size);
      return cells(size).map((cell) => {
        const at = indexOf(ring, cell);
        return at === -1 ? null : at / ring.length;
      });
    }
  }
}

/** One pattern at random — each loader picks its own, as the issue asks. */
export function randomDotMatrixPattern(random: () => number = Math.random): DotMatrixPattern {
  return DOT_MATRIX_PATTERNS[Math.floor(random() * DOT_MATRIX_PATTERNS.length)]!;
}
