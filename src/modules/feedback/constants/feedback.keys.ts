export const feedbackKeys = {
  all: ['feedback'] as const,
  board: () => [...feedbackKeys.all, 'board'] as const,
  detail: (id: string) => [...feedbackKeys.all, 'detail', id] as const,
  submit: () => [...feedbackKeys.all, 'submit'] as const,
};
