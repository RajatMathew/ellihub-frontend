/**
 * Who is speaking, above each of Elliot's replies (elli-ui#1408) — the way
 * Copilot names its turns. The same mark as the header's Elliot button, so the
 * panel and the button read as one thing. Decorative to a screen reader: the
 * reply itself is announced, and a name before every turn would be noise.
 */
export function AgentReplyHeader() {
  return (
    <div aria-hidden="true" className="mb-1.5 flex items-center gap-1.5 select-none">
      <img
        src="/favicon/apple-touch-icon.png"
        alt=""
        className="size-4 shrink-0 rounded-[4px] object-contain"
      />
      <span className="text-[13px] font-semibold text-foreground">Elliot</span>
    </div>
  );
}
