export function VendorInitial({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0].toUpperCase())
    .slice(0, 2)
    .join('');
  return (
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {initials}
    </span>
  );
}
