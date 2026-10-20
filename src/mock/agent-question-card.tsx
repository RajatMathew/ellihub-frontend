import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';
import { Check, MessageCircleQuestion } from 'lucide-react';

import {
  confirmableAnswer,
  readAnswer,
  readQuestion,
  splitFileNames,
  type AgentQuestionPart,
} from './agent-question';

/** The question, with each file name truncated in the middle of its stem. */
function QuestionText({ text }: { text: string }) {
  return (
    <span className="min-w-0">
      {splitFileNames(text).map((part, index) =>
        part.kind === 'file' ? (
          <span key={index} className="inline-flex max-w-full align-bottom" title={part.text}>
            <span className="truncate">{part.stem}</span>
            <span className="shrink-0">{part.extension}</span>
          </span>
        ) : (
          part.text
        )
      )}
    </span>
  );
}

/**
 * Elliot's mid-task question (agent-question.ts): the question, one row per
 * option, and a Confirm button that sends the pick — choosing an option only
 * selects it, so a misclick does not answer for you (elli-ui#1462). The
 * composer answers it too. Once answered it keeps the question and shows the
 * pick, so the history still reads.
 */
export function AgentQuestionCard({
  part,
  disabled,
  onAnswer,
}: {
  part: AgentQuestionPart;
  /** Elliot is still writing the turn, or the chat is not live. */
  disabled: boolean;
  onAnswer: (answer: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const question = readQuestion(part.input);
  if (!question) {
    return (
      <div
        className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground"
        role="status"
      >
        Preparing a question…
      </div>
    );
  }
  const answer = readAnswer(part);
  const failed = part.state === 'output-error';
  const open = answer === null && !failed;
  const toConfirm = open ? confirmableAnswer(question, selected) : null;

  return (
    <div
      className="flex flex-col gap-2 rounded-md border border-border bg-card p-3"
      role="group"
      aria-label={question.question}
    >
      <p className="flex gap-2 text-sm font-medium leading-6">
        <MessageCircleQuestion
          className="mt-1 size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <QuestionText text={question.question} />
      </p>
      {question.options.length > 0 ? (
        <div className="flex flex-col gap-1.5" role="radiogroup" aria-label={question.question}>
          {question.options.map((option) => {
            const chosen = open ? toConfirm === option.label : answer === option.label;
            return (
              <button
                key={option.label}
                type="button"
                role="radio"
                disabled={!open || disabled}
                aria-checked={chosen}
                onClick={() => setSelected(option.label)}
                className={cn(
                  'flex items-start gap-2.5 rounded-md border bg-background px-3 py-2 text-left text-sm transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                  open && !disabled && 'hover:border-primary/40 hover:bg-accent/60',
                  chosen ? 'border-primary/50 bg-accent/40' : 'border-border',
                  !open && !chosen && 'opacity-60'
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{option.label}</span>
                  {option.detail ? (
                    <span className="block text-xs text-muted-foreground">{option.detail}</span>
                  ) : null}
                </span>
                {chosen ? (
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-label={open ? 'Selected' : 'Chosen'}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
      {open ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {question.options.length > 0
              ? 'Pick one and confirm, or type a different answer below.'
              : 'Type your answer below.'}
          </p>
          {question.options.length > 0 ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={disabled || toConfirm === null}
              onClick={() => {
                if (toConfirm !== null) onAnswer(toConfirm);
              }}
            >
              Confirm
            </Button>
          ) : null}
        </div>
      ) : answer !== null && !question.options.some((option) => option.label === answer) ? (
        <p className="text-xs text-muted-foreground">
          You answered: <span className="text-foreground">{answer}</span>
        </p>
      ) : failed ? (
        <p className="text-xs text-muted-foreground">This question was not answered.</p>
      ) : null}
    </div>
  );
}
