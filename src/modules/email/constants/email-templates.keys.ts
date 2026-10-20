export const emailTemplateKeys = {
  all: ['email-templates'] as const,
  list: () => [...emailTemplateKeys.all, 'list'] as const,
};
