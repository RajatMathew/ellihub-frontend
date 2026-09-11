import { useState } from 'react';

import { Button } from '@app/components/ui/button';
import { cn } from '@app/lib/utils';

import { ChipPill, fmtDate, fmtMonth, usd } from './format';
import {
  advanceReqStage,
  contactFor,
  effectiveFlags,
  getProject,
  getRecordsForReq,
  getSov,
  markDocFiled,
  markReqPaid,
  missingDocsForReq,
  reqAging,
  toggleReqFlag,
  type GcContact,
  type Requisition,
} from './data';
import { STAGE_META, STAGE_ORDER, FLAG_META, DOC_STATUS_META, type Stage } from './stages';
import { ReqG702Editor } from './req-g702-editor';

function ReqFilePreview({ fileUri, fileName }: { fileUri: string; fileName: string }) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const isPdf = ext === 'pdf';
  const isXlsx = ext === 'xlsx' || ext === 'xls';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  return (
    <section className="rounded-md border border-border bg-muted/30 overflow-hidden">
      <div className="p-3 flex items-center gap-3 flex-wrap border-b border-border/60">
        <span className="text-[20px]">{isPdf ? '📄' : isXlsx ? '📊' : isImage ? '🖼️' : '📎'}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold truncate">{fileName}</p>
          <p className="text-[10.5px] text-muted-foreground font-mono">
            {isXlsx ? 'SCA G702 spreadsheet — % Completed column is edited each month' : isPdf ? 'PDF · rendered below' : 'File'}
          </p>
        </div>
        <a href={fileUri} className="text-[11.5px] font-semibold px-2.5 py-1 rounded bg-primary text-primary-foreground hover:opacity-90">↓ Download</a>
        <a href={fileUri} target="_blank" rel="noreferrer" className="text-[11.5px] font-semibold px-2.5 py-1 rounded border border-border hover:bg-accent">Open</a>
      </div>
      {isPdf && (
        <iframe
          src={fileUri + '#toolbar=1&view=FitH'}
          title={fileName}
          className="w-full"
          style={{ height: 420, border: 'none' }}
        />
      )}
      {isImage && (
        // eslint-disable-next-line jsx-a11y/img-redundant-alt
        <img src={fileUri} alt="file preview" className="w-full max-h-[420px] object-contain bg-black/5" />
      )}
      {isXlsx && (
        <div className="p-4 text-[11.5px] text-muted-foreground italic text-center bg-background/60">
          Excel can't render inline in browsers. Click <b>Open</b> above to view/edit in Excel.
          An in-app % Completed editor is on the roadmap.
        </div>
      )}
    </section>
  );
}

type PaidVia = NonNullable<Requisition['paidVia']>;

const PAID_VIA_OPTIONS: { value: PaidVia; label: string }[] = [
  { value: 'check',   label: 'Check'   },
  { value: 'ach',     label: 'ACH'     },
  { value: 'textura', label: 'Textura' },
  { value: 'procore', label: 'Procore' },
];

// One line of the aging strip — mono label, value beside it.
function AgingBit({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <span className="text-[11.5px] font-semibold tabular-nums">{children}</span>
    </span>
  );
}

// Who this goes to at the GC. No contact routed = say so plainly.
function ContactLine({ label, contact }: { label: string; contact?: GcContact }) {
  return (
    <p className="flex items-baseline gap-2 flex-wrap text-[11.5px]">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      {contact ? (
        <span>
          {contact.name} · {contact.role} ·{' '}
          <a href={`mailto:${contact.email}`} className="text-primary font-semibold hover:underline">
            {contact.email}
          </a>
        </span>
      ) : (
        <span className="text-muted-foreground italic">No contact routed — add one on the project</span>
      )}
    </p>
  );
}

export function ReqDetail({ req, onClose }: { req: Requisition; onClose: () => void }) {
  const project = getProject(req.projectId);
  const sov = getSov(req.projectId);
  const [, bump] = useState(0);
  const [g702Open, setG702Open] = useState(false);
  const [paidVia, setPaidVia] = useState<PaidVia>(project?.channel === 'TEXTURA' ? 'textura' : 'check');
  const rerender = () => bump(n => n + 1);
  if (!project) return null;

  const records = getRecordsForReq(req);
  const missing = missingDocsForReq(req);
  const stage = STAGE_META[req.stage];
  const flags = effectiveFlags(req);
  const aging = reqAging(req);
  const sendToContact = contactFor(req.projectId, 'requisition');
  const paymentContact = contactFor(req.projectId, 'payment');
  const showSendTo = req.stage === 'draft' || req.stage === 'pencil' || req.stage === 'returned' || req.stage === 'final';
  const showChase  = req.stage === 'final' || req.stage === 'approved';

  const nextStage = (s: Stage): Stage | null => {
    const i = STAGE_ORDER.indexOf(s);
    return i >= 0 && i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1] : null;
  };
  const advance = () => {
    const n = nextStage(req.stage);
    if (n) advanceReqStage(req.id, n, 'AC', 'manual');
    rerender();
  };

  const canGoFinal = missing === 0;

  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 w-[520px] bg-card border-l border-border shadow-xl flex flex-col"
      role="dialog"
      aria-label={`Req ${req.seq} — ${project.name}`}
    >
      <header className="shrink-0 px-5 py-4 border-b border-border flex items-baseline gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {project.gc} · {fmtMonth(req.month)}
            </p>
            {req.isRetentionBill && <ChipPill tone="primary">Retention bill</ChipPill>}
          </div>
          <h2
            className="text-[18px] font-semibold truncate"
            style={{ fontFamily: "'Fraunces','Georgia',serif" }}
            title={project.name}
          >
            Req #{req.seq} — {project.name.split('—')[0].trim()}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto text-muted-foreground hover:text-foreground text-[16px]"
          title="Close"
        >
          ×
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
        {project.notes && (
          <section className="rounded-md border border-border bg-muted/40 px-3 py-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
              Project note
            </p>
            <p className="text-[12px] leading-snug">{project.notes}</p>
          </section>
        )}

        <section className="space-y-2.5">
          <div className="flex items-baseline gap-3 flex-wrap">
            <p
              className="text-[28px] font-semibold tabular-nums leading-none"
              style={{ fontFamily: "'Fraunces','Georgia',serif" }}
            >
              {req.amount > 0 ? usd(req.amount) : <span className="text-muted-foreground text-[18px]">no billing yet</span>}
            </p>
            {typeof req.storedTotal === 'number' && req.storedTotal > 0 && (
              <span className="font-mono text-[10.5px] text-muted-foreground">
                incl. stored materials {usd(req.storedTotal)}
              </span>
            )}
            <ChipPill tone={stage.tone as any}>{stage.label}</ChipPill>
            {flags.map(f => (
              <ChipPill key={f} tone={FLAG_META[f].tone}>{FLAG_META[f].label}</ChipPill>
            ))}
          </div>

          {req.isRetentionBill && (
            <p className="text-[11.5px] text-muted-foreground">
              Bills the retention held on the completed contract.
            </p>
          )}

          {aging.submittedOn && (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
              <AgingBit label="Submitted">{fmtDate(aging.submittedOn)}</AgingBit>
              <AgingBit label={`Due · net ${project.billing.netDays}`}>
                {aging.dueOn ? fmtDate(aging.dueOn) : '—'}
              </AgingBit>
              <AgingBit label="Days late">
                {aging.daysLate > 0
                  ? <span className="text-[#c75e40]">{aging.daysLate}</span>
                  : <span className="font-normal text-muted-foreground">on time</span>}
              </AgingBit>
              <AgingBit label="Predicted paid">
                {aging.predictedPaidOn ? fmtDate(aging.predictedPaidOn) : '—'}
              </AgingBit>
            </div>
          )}

          {(showSendTo || showChase) && (
            <div className="space-y-1">
              {showSendTo && <ContactLine label="Send to" contact={sendToContact} />}
              {showChase  && <ContactLine label="Chase payment with" contact={paymentContact} />}
            </div>
          )}
        </section>

        {sov ? (
          <section className="rounded-md border border-primary/40 bg-primary/[0.06] p-3 flex items-center gap-3">
            <span className="text-[20px]">✎</span>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold">Edit the % Completed column</p>
              <p className="text-[10.5px] text-muted-foreground">
                In-app G702 editor · one column edits, everything else recalculates live
              </p>
            </div>
            <Button size="sm" onClick={() => setG702Open(true)}>Open G702 →</Button>
          </section>
        ) : (
          <p className="text-[11px] text-muted-foreground italic">
            No approved SOV for this project yet — G702 editor unavailable.
          </p>
        )}

        {req.fileUri && <ReqFilePreview fileUri={req.fileUri} fileName={req.fileName ?? 'requisition'} />}

        <section>
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2">
            Documents for this month
            {missing > 0 && (
              <span className="ml-2 text-[#c75e40] normal-case">· {missing} missing</span>
            )}
          </h3>
          <ul className="space-y-1.5">
            {records.map(({ requirement, record }) => {
              const s = DOC_STATUS_META[record.status];
              return (
                <li
                  key={requirement.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded border',
                    record.status === 'filed'   && 'bg-[#e4efe9] border-[#e4efe9]',
                    record.status === 'received' && 'bg-[#f7efd9] border-[#f7efd9]',
                    record.status === 'missing'  && 'bg-[#fdecec] border-[#fdecec]'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-medium truncate">{requirement.form}</p>
                    <p className="text-[10.5px] text-muted-foreground truncate">
                      {requirement.owner === 'vendor'
                        ? `vendor · ${requirement.vendorName}`
                        : 'ours'}
                      {record.filedAt && ` · ${record.filedAt}`}
                    </p>
                  </div>
                  <ChipPill tone={s.tone}>{s.label}</ChipPill>
                  {record.status !== 'filed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { markDocFiled(requirement.id, req.month, req.projectId); rerender(); }}
                    >
                      Mark filed
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2">
            Advance the stage
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={advance}
              disabled={
                nextStage(req.stage) === null ||
                (nextStage(req.stage) === 'final' && !canGoFinal)
              }
              title={
                nextStage(req.stage) === 'final' && !canGoFinal
                  ? 'All documents must be filed before Final'
                  : ''
              }
            >
              → {nextStage(req.stage) ? STAGE_META[nextStage(req.stage)!].label : 'End of pipeline'}
            </Button>
            {(req.stage === 'final' || req.stage === 'approved') && (
              <>
                <select
                  value={paidVia}
                  onChange={e => setPaidVia(e.target.value as PaidVia)}
                  aria-label="Paid by"
                  className="h-8 rounded border border-border bg-background px-2 text-[11px] font-semibold"
                >
                  {PAID_VIA_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  onClick={() => { markReqPaid(req.id, paidVia); rerender(); }}
                >
                  Mark as paid
                </Button>
              </>
            )}
            <button
              type="button"
              onClick={() => { toggleReqFlag(req.id, 'hold'); rerender(); }}
              className={cn(
                'px-2 py-1 rounded border text-[11px] font-semibold',
                req.flags.includes('hold')
                  ? 'bg-[#f7efd9] text-[#b8860b] border-[#e0d19c]'
                  : 'border-border text-muted-foreground hover:bg-accent'
              )}
            >
              {req.flags.includes('hold') ? 'Clear Hold' : 'Flag On hold'}
            </button>
          </div>
        </section>

        <section>
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2">
            History
          </h3>
          <ul className="space-y-1.5 text-[12px]">
            {req.history.map((h, i) => (
              <li key={i} className="flex items-baseline gap-3">
                <span className="font-mono text-[11px] text-muted-foreground w-24">{h.at}</span>
                <span className="font-semibold w-40">{STAGE_META[h.stage].label}</span>
                <span className="text-muted-foreground text-[11.5px]">
                  {h.by === 'system' ? 'system' : `by ${h.by}`}
                  {h.cause && ` · ${h.cause}`}
                </span>
              </li>
            ))}
            {req.history.length === 0 && (
              <li className="text-muted-foreground italic text-[12px]">No history yet.</li>
            )}
          </ul>
        </section>
      </div>

      {g702Open && <ReqG702Editor req={req} onClose={() => { setG702Open(false); rerender(); }} />}
    </aside>
  );
}
