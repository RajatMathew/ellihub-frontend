import { useState } from 'react';

import { Button } from '@app/components/ui/button';
import { Input } from '@app/components/ui/input';
import { cn } from '@app/lib/utils';

import { Field } from './format';
import {
  PROJECTS,
  addRequirement,
  getRequirementsForProject,
  removeRequirement,
  setRequirementCadence,
} from './data';

type Cadence = 'monthly' | 'oneTime';

export function DocumentsTemplateEditor() {
  const [selected, setSelected] = useState(PROJECTS[0].id);
  const [draft, setDraft] = useState<{ owner: 'us' | 'vendor'; form: string; vendorName: string; cadence: Cadence }>({
    owner: 'us', form: '', vendorName: '', cadence: 'monthly',
  });
  const [, bump] = useState(0);
  const project = PROJECTS.find(p => p.id === selected)!;
  const requirements = getRequirementsForProject(selected);

  const add = () => {
    if (!draft.form.trim()) return;
    if (draft.owner === 'vendor' && !draft.vendorName.trim()) return;
    addRequirement(selected, draft.owner, draft.form.trim(), draft.vendorName.trim() || undefined, draft.cadence);
    setDraft({ owner: 'us', form: '', vendorName: '', cadence: 'monthly' });
    bump(n => n + 1);
  };
  const remove = (id: string) => { removeRequirement(id); bump(n => n + 1); };
  const setCadence = (id: string, cadence: Cadence) => { setRequirementCadence(id, cadence); bump(n => n + 1); };

  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      <header className="px-5 py-4 border-b border-border">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Required forms · the rule
        </p>
        <h2 className="text-[16px] font-semibold mt-0.5" style={{ fontFamily: "'Fraunces','Georgia',serif" }}>
          Set once per project — inherited by every month's requisition
        </h2>
      </header>

      <div className="px-5 py-4 border-b border-border bg-muted/20 grid gap-3" style={{ gridTemplateColumns: '260px 1fr' }}>
        <Field label="Project">
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-2 text-[12px]"
          >
            {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <div className="flex items-center gap-2 self-end text-[11.5px] text-muted-foreground">
          <span>{requirements.length} required form{requirements.length === 1 ? '' : 's'} · GC {project.gc}</span>
        </div>
      </div>

      <ul className="divide-y divide-border">
        {requirements.length === 0 && (
          <li className="px-5 py-6 text-center text-[12px] text-muted-foreground italic">
            No requirements yet — add the first one below.
          </li>
        )}
        {requirements.map(r => (
          <li key={r.id} className="px-5 py-3 flex items-center gap-3">
            <span className={
              r.owner === 'vendor'
                ? 'text-[10px] font-semibold uppercase tracking-[0.05em] text-[#c75e40] bg-[#f7e9e4] px-1.5 py-0.5 rounded'
                : 'text-[10px] font-semibold uppercase tracking-[0.05em] text-primary bg-secondary px-1.5 py-0.5 rounded'
            }>
              {r.owner === 'vendor' ? `Vendor · ${r.vendorName}` : 'Ours'}
            </span>
            <span className="text-[12.5px] flex-1">{r.form}</span>
            <CadenceToggle value={r.cadence ?? 'monthly'} onChange={(v) => setCadence(r.id, v)} />
            <button
              type="button"
              onClick={() => remove(r.id)}
              className="text-muted-foreground hover:text-destructive text-[13px]"
              title="Remove requirement"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <div className="px-5 py-4 border-t border-border grid gap-2" style={{ gridTemplateColumns: '110px 1fr 200px 170px auto' }}>
        <Field label="Whose">
          <select
            value={draft.owner}
            onChange={e => setDraft(d => ({ ...d, owner: e.target.value as 'us' | 'vendor' }))}
            className="w-full h-8 rounded-md border border-input bg-background px-2 text-[12px]"
          >
            <option value="us">Ours</option>
            <option value="vendor">Vendor</option>
          </select>
        </Field>
        <Field label="Form">
          <Input value={draft.form} onChange={e => setDraft(d => ({ ...d, form: e.target.value }))}
            placeholder='e.g. "Unconditional Lien Waiver — Elli"' className="h-8 text-[12px]" />
        </Field>
        <Field label="Vendor name">
          <Input
            value={draft.vendorName}
            onChange={e => setDraft(d => ({ ...d, vendorName: e.target.value }))}
            placeholder="only if Vendor"
            disabled={draft.owner === 'us'}
            className="h-8 text-[12px]"
          />
        </Field>
        <Field label="Cadence">
          <CadenceToggle value={draft.cadence} onChange={(v) => setDraft(d => ({ ...d, cadence: v }))} />
        </Field>
        <Button onClick={add} size="sm" className="h-8 mt-5">+ Add requirement</Button>
      </div>
      <p className="px-5 pb-4 text-[11px] text-muted-foreground italic">
        Monthly rides with every final. One-time (COI, W-9) is filed once and expires.
      </p>
    </section>
  );
}

function CadenceToggle({
  value, onChange,
}: {
  value: Cadence;
  onChange: (v: Cadence) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border overflow-hidden shrink-0">
      <button
        type="button"
        onClick={() => onChange('monthly')}
        className={cn(
          'px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.03em] transition-colors',
          value === 'monthly'
            ? 'bg-secondary text-secondary-foreground'
            : 'bg-background text-muted-foreground hover:bg-accent'
        )}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange('oneTime')}
        className={cn(
          'px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.03em] border-l border-border transition-colors',
          value === 'oneTime'
            ? 'bg-secondary text-secondary-foreground'
            : 'bg-background text-muted-foreground hover:bg-accent'
        )}
      >
        One-time
      </button>
    </div>
  );
}
