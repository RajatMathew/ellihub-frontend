import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'bun:test';

import { deriveEmailAiSuggestionStage } from '../src/modules/email/lib/email-ai-suggestion-stage';

/**
 * The AI banner's state machine (elli-ui#921).
 *
 * The first test is the one that matters: it pins the absence of a loading
 * stage. An earlier version had one, and the details card rendered a shimmer
 * in place of the thread's real assignee, court and links until the guess
 * arrived — a stall the reader saw on every mail they opened.
 */
describe('deriveEmailAiSuggestionStage', () => {
  test('a suggestion still in flight is not a state the panel can wait on', () => {
    expect(
      deriveEmailAiSuggestionStage({ enabled: true, isResolved: false, hasSuggestion: false })
    ).toBe('idle');
  });

  test('a suggestion that has landed asks for a decision', () => {
    expect(
      deriveEmailAiSuggestionStage({ enabled: true, isResolved: false, hasSuggestion: true })
    ).toBe('pending');
  });

  test('accepting, dismissing or editing retires the banner', () => {
    expect(
      deriveEmailAiSuggestionStage({ enabled: true, isResolved: true, hasSuggestion: true })
    ).toBe('resolved');
  });

  test('a thread someone has already filed is never asked about', () => {
    // `enabled` is false once the thread has an assignee, a classification or a
    // reference — a guess about work already done is noise over the top of it.
    expect(
      deriveEmailAiSuggestionStage({ enabled: false, isResolved: false, hasSuggestion: true })
    ).toBe('idle');
  });

  test('being switched off outranks having been resolved', () => {
    expect(
      deriveEmailAiSuggestionStage({ enabled: false, isResolved: true, hasSuggestion: true })
    ).toBe('idle');
  });
});

/**
 * On since Elliot's readings exist (`GET /elliot/readings`); it replaced the
 * off switch of elli-ui#1161. The hook is the one place a reading is fetched.
 */
describe('the AI suggestion request', () => {
  const HOOK = readFileSync(
    new URL('../src/modules/email/hooks/use-email-ai-suggestion.ts', import.meta.url),
    'utf8'
  );

  test('is made for every opened thread, filed or not', () => {
    // Elliot files an unfiled thread itself, so a filed thread is exactly the
    // one whose strip says so — filing state cannot gate the request.
    const enabledLine = HOOK.split('\n').find((line) => line.includes('const enabled ='));

    expect(enabledLine).toBeDefined();
    expect(enabledLine).toContain('accountId && conversationKey');
    expect(enabledLine).not.toContain('eligible');
  });

  test('uses the shared key factory, not an inline key', () => {
    expect(HOOK).toContain('emailKeys.aiSuggestion(');
  });
});
