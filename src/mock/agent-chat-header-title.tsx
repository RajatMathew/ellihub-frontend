import { useLayoutEffect, useRef, useState } from 'react';

import { cn } from '@/app/lib/utils';

import { MAX_CHAT_TITLE_CHARS, renamedTitle } from './agent-chat-titles';

// A new name (the generated one replacing "New chat") is written in from left
// to right while the heading eases open to fit it — both on the same curve, so
// the chevron after it glides with the text. Keyed on the title, so it plays on
// each change, not on every render.
const WRITE_IN = 'motion-safe:animate-title-write-in';
const WIDTH_EASE =
  'motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]';

/**
 * The open chat's name in Elliot's header, editable in place (elli-ui#1410).
 *
 * Clicking the name turns it into a field, the way the chats list renames one
 * (`AgentRailChatItem`): Enter or leaving the field saves, Escape puts the old
 * name back. A chat that does not exist yet ("New chat") has nothing to rename,
 * so it stays plain text. Set in Public Sans, not the theme's serif heading face.
 */
export function AgentChatHeaderTitle({
  title,
  editable,
  onRename,
  className,
}: {
  title: string;
  editable: boolean;
  onRename: (title: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  // The name the panel opened on is already there; only a new one writes in.
  const [openedWith] = useState(title);
  const writeIn = title === openedWith ? undefined : WRITE_IN;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nameRef = useRef<HTMLElement>(null);

  // Size the heading to its name explicitly, so a new name slides the chevron
  // and buttons beside it over instead of snapping them (elli-ui#1516). A width
  // of `auto` cannot be transitioned; a measured one can. The name still
  // truncates when the header is too narrow for it: the heading may shrink.
  useLayoutEffect(() => {
    const measure = () => {
      if (headingRef.current && nameRef.current) {
        headingRef.current.style.width = `${nameRef.current.scrollWidth}px`;
      }
    };
    measure();
    // The name's face may still be loading on the first measure.
    void document.fonts?.ready.then(measure);
  }, [title, draft, editable]);

  const commit = () => {
    if (draft === null) return;
    const next = renamedTitle(draft, title);
    setDraft(null);
    if (next) onRename(next);
  };

  const text = 'font-public-sans text-sm font-semibold tracking-normal';

  if (draft !== null) {
    return (
      <input
        autoFocus
        value={draft}
        maxLength={MAX_CHAT_TITLE_CHARS}
        aria-label="Chat name"
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          } else if (event.key === 'Escape') {
            // Only cancels the rename — not the panel's own Escape.
            event.preventDefault();
            event.stopPropagation();
            setDraft(null);
          }
        }}
        className={cn(
          // No border, ring or fill: the name just becomes editable where it
          // sits, with the caret and selection as the only sign of it.
          'h-8 min-w-0 bg-transparent px-2 py-1 text-foreground outline-none focus:outline-none focus-visible:outline-none',
          text,
          className
        )}
      />
    );
  }

  return (
    <h2 ref={headingRef} className={cn('flex min-w-0', WIDTH_EASE, className)}>
      {editable ? (
        <button
          ref={(node) => {
            nameRef.current = node;
          }}
          type="button"
          title="Rename chat"
          aria-label={`${title}. Rename chat`}
          onClick={() => setDraft(title)}
          className={cn(
            'min-w-0 cursor-text truncate rounded-md px-2 py-1 text-left text-foreground transition-colors hover:bg-surface-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
            text
          )}
        >
          <span key={title} className={writeIn}>
            {title}
          </span>
        </button>
      ) : (
        <span
          key={title}
          ref={(node) => {
            nameRef.current = node;
          }}
          className={cn('min-w-0 truncate px-2 py-1', text, writeIn)}
        >
          {title}
        </span>
      )}
    </h2>
  );
}
