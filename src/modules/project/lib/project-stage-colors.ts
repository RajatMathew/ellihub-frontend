const PROJECT_STAGE_SWATCH_CLASSES: Array<[string, string]> = [
  ['INSTALLATION', 'bg-blue-600'],
  ['FABRICATION', 'bg-amber-600'],
  ['SUBMITTAL', 'bg-violet-600'],
  ['BUYOUT', 'bg-cyan-600'],
  ['CLOSEOUT', 'bg-slate-500'],
  ['PUNCH', 'bg-red-600'],
  ['ONBOARDING', 'bg-indigo-500'],
];

export function getProjectStageSwatchClassName(stageName?: string | null) {
  const normalizedName = (stageName ?? '').toUpperCase();
  const stageMatch = PROJECT_STAGE_SWATCH_CLASSES.find(([key]) => normalizedName.includes(key));

  return stageMatch?.[1] ?? 'bg-zinc-400';
}

export function formatProjectStageLabel(stageName?: string | null) {
  if (!stageName) return '';

  return stageName.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}
