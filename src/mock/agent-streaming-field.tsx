import 'streamdown/styles.css';

import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';

import { Input, inputVariants } from '@/app/components/ui/input';
import { Textarea, textareaVariants } from '@/app/components/ui/textarea';
import { cn } from '@/app/lib/utils';
import { useReducedMotion } from 'motion/react';

import { splitWords, wholeWordsOf } from './agent-stream-text';
import { useSmoothText } from './use-smooth-text';

/**
 * Card fields that Elliot is still writing into (elli-ui#1482). While a
 * proposal's input streams, its text fields reveal word by word with the same
 * fade Streamdown gives the chat reply, instead of the box jumping a chunk at
 * a time. The field keeps its own box the whole time — the words are drawn on
 * a copy laid over it — so nothing around it moves when the stream ends and
 * the field hands back to its own text.
 */
const FieldsStreamingContext = createContext(false);

/** Wrap a card's fields while its tool input is still streaming. */
export function AgentFieldsStreaming({
  streaming,
  children,
}: {
  streaming: boolean;
  children: ReactNode;
}) {
  return (
    <FieldsStreamingContext.Provider value={streaming}>{children}</FieldsStreamingContext.Provider>
  );
}

function useStreamingReveal(value: string) {
  const streaming = useContext(FieldsStreamingContext);
  const reduceMotion = useReducedMotion() ?? false;
  const shown = useSmoothText(value, streaming);
  // Once the stream has finished and been caught up, the field is the user's:
  // their typing must not be paced like Elliot's.
  const [settled, setSettled] = useState(!streaming);
  if (!settled && !streaming && shown.length >= value.length) setSettled(true);
  const revealing = !settled && !reduceMotion;
  return { revealing, visible: revealing ? wholeWordsOf(shown, streaming) : value };
}

function StreamingWords({ text }: { text: string }) {
  return splitWords(text).map((word, index) => (
    // Words only ever append, so the index is a stable identity and a word
    // already on screen never fades in twice.
    <span key={index} data-sd-animate="">
      {word}
    </span>
  ));
}

/** Drawn over the field while it streams; the field's own text is hidden. */
const OVERLAY =
  'pointer-events-none absolute inset-0 overflow-hidden border-transparent bg-transparent';
const HIDDEN_TEXT = 'text-transparent caret-transparent';
const ignoreEdit = () => undefined;

/** Put any margin on a wrapper: the copy is laid over this box exactly. */
export function AgentTextarea({
  value,
  onChange,
  className,
  variant,
  ...props
}: ComponentProps<typeof Textarea> & { value: string }) {
  const { revealing, visible } = useStreamingReveal(value);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Follow the newest words, and keep the copy scrolled with the field so the
  // hand-back lands on the same lines.
  useLayoutEffect(() => {
    const area = areaRef.current;
    const overlay = overlayRef.current;
    if (!revealing || !area || !overlay) return;
    area.scrollTop = area.scrollHeight;
    overlay.scrollTop = area.scrollTop;
  }, [revealing, visible]);

  return (
    <div className="relative">
      <Textarea
        ref={areaRef}
        value={visible}
        variant={variant}
        aria-busy={revealing || undefined}
        className={cn(className, revealing && HIDDEN_TEXT)}
        {...props}
        // Nothing to edit until Elliot has finished writing it.
        onChange={revealing ? ignoreEdit : onChange}
      />
      {revealing ? (
        <div
          ref={overlayRef}
          aria-hidden="true"
          className={cn(textareaVariants({ variant }), OVERLAY, 'whitespace-pre-wrap break-words')}
        >
          <StreamingWords text={visible} />
        </div>
      ) : null}
    </div>
  );
}

/** Put any margin on a wrapper: the copy is laid over this box exactly. */
export function AgentInput({
  value,
  onChange,
  className,
  variant,
  ...props
}: ComponentProps<typeof Input> & { value: string }) {
  const { revealing, visible } = useStreamingReveal(value);
  return (
    <div className="relative min-w-0 flex-1">
      <Input
        value={visible}
        variant={variant}
        aria-busy={revealing || undefined}
        className={cn(className, revealing && HIDDEN_TEXT)}
        {...props}
        onChange={revealing ? ignoreEdit : onChange}
      />
      {revealing ? (
        <div
          aria-hidden="true"
          // The input's own type and padding, so the words sit where its text will.
          className={cn(
            inputVariants({ variant }),
            className,
            OVERLAY,
            'flex items-center overflow-hidden whitespace-pre text-foreground'
          )}
        >
          <StreamingWords text={visible} />
        </div>
      ) : null}
    </div>
  );
}
