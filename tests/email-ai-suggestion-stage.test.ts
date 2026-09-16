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
