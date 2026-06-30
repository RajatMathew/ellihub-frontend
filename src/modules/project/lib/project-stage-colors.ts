const PROJECT_STAGE_SWATCH_CLASSES: Array<[string, string]> = [
  ['INSTALLATION', 'bg-fieldwire-status-pending'],
  ['FABRICATION', 'bg-warning'],
  ['SUBMITTAL', 'bg-brand-clay'],
  ['BUYOUT', 'bg-success'],
  ['CLOSEOUT', 'bg-muted-foreground'],
  ['PUNCH', 'bg-destructive'],
  ['ONBOARDING', 'bg-fieldwire-status-neutral'],
];

export function getProjectStageSwatchClassName(stageName?: string | null) {
  const normalizedName = (stageName ?? '').toUpperCase();
  const stageMatch = PROJECT_STAGE_SWATCH_CLASSES.find(([key]) => normalizedName.includes(key));

  return stageMatch?.[1] ?? 'bg-fieldwire-status-neutral';
}

export function formatProjectStageLabel(stageName?: string | null) {
  if (!stageName) return '';

  return stageName.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}
