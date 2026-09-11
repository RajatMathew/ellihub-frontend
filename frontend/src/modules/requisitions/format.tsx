import { cn } from '@app/lib/utils';

export const usd = (n: number) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const usdShort = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return usd(n);
};

export const fmtDate = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const fmtMonth = (yyyymm: string) => {
  const [y, m] = yyyymm.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export const todayIso = () => {
  // Fixed anchor for the demo — matches the mailbox data.ts convention (TODAY = 2026-07-07)
  return '2026-07-13';
};

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-mono uppercase tracking-[0.08em] text-muted-foreground block mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

export function ChipPill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: 'clay' | 'primary' | 'warning' | 'neutral' | 'success' | 'danger';
}) {
  const map: Record<typeof tone, string> = {
    clay: 'bg-[#f7e9e4] text-[#c75e40]',
    primary: 'bg-secondary text-secondary-foreground',
    warning: 'bg-[#f7efd9] text-[#b8860b]',
    neutral: 'bg-muted text-muted-foreground border border-border',
    success: 'bg-[#e4efe9] text-[#2d6a4f]',
    danger: 'bg-[#fdecec] text-[#dc2626]',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-semibold uppercase tracking-[0.03em]',
        map[tone]
      )}
    >
      {children}
    </span>
  );
}
