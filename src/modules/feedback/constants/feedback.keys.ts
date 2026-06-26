export const feedbackKeys = {
  all: ['feedback'] as const,
  board: () => [...feedbackKeys.all, 'board'] as const,
  submit: () => [...feedbackKeys.all, 'submit'] as const,
};
