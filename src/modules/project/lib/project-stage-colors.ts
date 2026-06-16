// V6.2 editorial palette — stage swatches drawn only from navy / clay / ok /
// warn / ink so the system stays single-accent at the page level.
// (Build Principles V1.0 §11/04.)
const PROJECT_STAGE_SWATCH_CLASSES: Array<[string, string]> = [
  ['INSTALLATION', 'bg-[#1a3a5f]'],     // navy
  ['FABRICATION', 'bg-[#b8860b]'],      // warn-gold
  ['SUBMITTAL', 'bg-[#c75e40]'],        // clay
  ['BUYOUT', 'bg-[#2d6a4f]'],           // ok-green
  ['CLOSEOUT', 'bg-[#6b6359]'],         // ink-3
  ['PUNCH', 'bg-[#dc2626]'],            // required red
  ['ONBOARDING', 'bg-[#9a9286]'],       // ink-4
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
