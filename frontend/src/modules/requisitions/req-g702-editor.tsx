import { useMemo, useState } from 'react';

import { Button } from '@app/components/ui/button';
import { cn } from '@app/lib/utils';

import { usd, fmtMonth } from './format';
import {
  getApprovedCoValueForProject,
  getProject,
  getSov,
  priorLinePct,
  priorLineStored,
  saveReqLinePcts,
  type Requisition,
} from './data';

/**
 * The G702 editor. Opens as a full-screen overlay above the drawer.
 * TWO editable columns per line — This % (cumulative % complete) and
 * Stored $ (material on site, not yet installed) — everything else
 * (Completed $, Total completed & stored $, Balance, Retainage, and the
 * G702 certificate above the grid) recalculates live from the SOV, this
 * period's entries, and the prior requisition's certified % / stored $.
 *
 * This mirrors the SCA G702/G703 spreadsheet Peter's team edits every
 * month — two columns of edits, everything else derives.
 */
export function ReqG702Editor({ req, onClose }: { req: Requisition; onClose: () => void }) {
  const project = getProject(req.projectId);
  const sov = getSov(req.projectId);

  // Local edit buffers — copies of the req's current linePcts / lineStored,
  // mutated in place and committed on Save.
  const [buf, setBuf] = useState<Record<string, number>>(() => ({ ...(req.linePcts ?? {}) }));
  const [storedBuf, setStoredBuf] = useState<Record<string, number>>(() => ({ ...(req.lineStored ?? {}) }));
  const [dirty, setDirty] = useState(false);

  // Default is the requisition's own override, else the project's rate —
  // never a hardcoded 10 (Hollis bills at 5%).
  const retainagePct = req.retainagePct ?? project?.retainagePct ?? 10;

  const rows = useMemo(() => {
    if (!sov) return [];
    return sov.lines.map(line => {
      const prior = priorLinePct(req.projectId, line.id, req.month);
      const thisPct = typeof buf[line.id] === 'number' ? buf[line.id] : prior;
      const completedToDate = line.scheduled * (thisPct / 100);
      const priorAmt = line.scheduled * (prior / 100);

      const priorStored = priorLineStored(req.projectId, line.id, req.month);
      const stored = typeof storedBuf[line.id] === 'number' ? storedBuf[line.id] : priorStored;

      const total = completedToDate + stored;
      const pctOfScheduled = line.scheduled > 0 ? (total / line.scheduled) * 100 : 0;
      const balanceToFinish = line.scheduled - total;
      const lineRetainage = (retainagePct / 100) * completedToDate + (retainagePct / 100) * stored;

      return {
        line, prior, thisPct, completedToDate, priorAmt,
        stored, priorStored, total, pctOfScheduled, balanceToFinish, lineRetainage,
      };
    });
  }, [sov, buf, storedBuf, req.projectId, req.month, retainagePct]);

  const totals = useMemo(() => {
    const scheduled = rows.reduce((s, r) => s + r.line.scheduled, 0);
    const completedToDate = rows.reduce((s, r) => s + r.completedToDate, 0);
    const stored = rows.reduce((s, r) => s + r.stored, 0);
    const total = rows.reduce((s, r) => s + r.total, 0);
    const balanceToFinish = rows.reduce((s, r) => s + r.balanceToFinish, 0);

    // 5a / 5b / 5 — retainage split by completed work vs. stored material
    const retainageOnCompleted = (retainagePct / 100) * completedToDate;
    const retainageOnStored = (retainagePct / 100) * stored;
    const retainageTotal = retainageOnCompleted + retainageOnStored;
    // 6 — total earned less retainage
    const earnedLessRetainage = total - retainageTotal;

    // 7 — less previous certificates: same per-line prior-% / prior-stored
    // walk the grid already uses, retainage applied the same way as above.
    const priorCompletedSum = rows.reduce((s, r) => s + r.priorAmt, 0);
    const priorStoredSum = rows.reduce((s, r) => s + r.priorStored, 0);
    const priorTotal = priorCompletedSum + priorStoredSum;
    const priorRetainage = (retainagePct / 100) * priorCompletedSum + (retainagePct / 100) * priorStoredSum;
    const priorNet = priorTotal - priorRetainage;

    // 8 — current payment due
    const currentPaymentDue = earnedLessRetainage - priorNet;

    return {
      scheduled, completedToDate, stored, total, balanceToFinish,
      retainageOnCompleted, retainageOnStored, retainageTotal, earnedLessRetainage,
      priorNet, currentPaymentDue,
    };
  }, [rows, retainagePct]);

  if (!project || !sov) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="rounded-lg border border-border bg-card p-6 max-w-md text-center">
          <p className="text-[13px] text-muted-foreground">
            Can't open the G702 editor — this requisition's project doesn't have an approved SOV yet.
          </p>
          <Button onClick={onClose} className="mt-4">Close</Button>
        </div>
      </div>
    );
  }

  const approvedCoDelta = getApprovedCoValueForProject(project.id);
  const contractToDate = project.contractValue + approvedCoDelta;
  // 9 — balance to finish, including retainage (Contract Sum to Date − Total Earned Less Retainage)
  const balanceInclRetainage = contractToDate - totals.earnedLessRetainage;

  const updatePct = (lineId: string, raw: string) => {
    const n = parseFloat(raw);
    setBuf(prev => ({ ...prev, [lineId]: isFinite(n) ? Math.max(0, Math.min(100, n)) : 0 }));
    setDirty(true);
  };

  const updateStored = (lineId: string, raw: string) => {
    const n = parseFloat(raw);
    setStoredBuf(prev => ({ ...prev, [lineId]: isFinite(n) ? Math.max(0, n) : 0 }));
    setDirty(true);
  };

  const save = () => {
    // Build a COMPLETE stored-$ map (every line, 0 allowed) from the same
    // effective value the grid displays — a line the user never touched
    // still carries its prior stored $ forward instead of silently
    // dropping to 0 (which would falsely "unstore" untouched material).
    const lineStored: Record<string, number> = {};
    rows.forEach(r => { lineStored[r.line.id] = r.stored; });
    saveReqLinePcts(req.id, buf, 'AC', lineStored);
    setDirty(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#f8f4ed] flex flex-col">
      <header className="shrink-0 px-6 py-4 border-b border-border bg-card flex items-baseline gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            G702 · SCA Requisition & Certificate for Payment
          </p>
          <h2 className="text-[20px] font-semibold" style={{ fontFamily: "'Fraunces','Georgia',serif" }}>
            {project.name} — Req #{String(req.seq).padStart(3, '0')} — {fmtMonth(req.month)}
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Edit the <b className="text-foreground">This %</b> and <b className="text-foreground">Stored $</b> columns. Everything else is computed live from the SOV and last month's certified numbers.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!dirty}>Save</Button>
        </div>
      </header>

      {project.notes && (
        <div className="shrink-0 px-6 py-2 border-b border-border bg-[#fdf9ee] flex items-baseline gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground shrink-0">Project note</span>
          <span className="text-[11.5px] text-foreground">{project.notes}</span>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto p-6 space-y-4">
          {/* G702 certificate summary — recalculates live */}
          <section className="rounded-lg border border-border bg-card overflow-hidden">
            <header className="px-4 py-2 border-b border-border bg-muted/40">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                G702 Certificate — this recalculates as you edit
              </p>
            </header>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 p-5 text-[12px]">
              <CertRow n={1} label="Original Contract Sum"          value={project.contractValue} />
              <CertRow n={2} label="Net change by Change Orders"    value={approvedCoDelta} tone={approvedCoDelta >= 0 ? 'ok' : 'clay'} />
              <CertRow n={3} label="Contract Sum to Date"           value={contractToDate}     bold />
              <CertRow n={4} label="Total Completed & Stored to Date" value={totals.total} />
              <CertRow n="5a" label={`Retainage on Completed Work (${retainagePct}%)`} value={totals.retainageOnCompleted} tone="mute" />
              <CertRow n="5b" label={`Retainage on Stored Material (${retainagePct}%)`} value={totals.retainageOnStored} tone="mute" />
              <CertRow n={5} label="Total Retainage"                value={totals.retainageTotal} tone="clay" />
              <CertRow n={6} label="Total Earned Less Retainage"    value={totals.earnedLessRetainage} bold />
              <CertRow n={7} label="Less Previous Certificates for Payment" value={totals.priorNet} tone="mute" />
              <CertRow
                n={8}
                label="Current Payment Due"
                value={totals.currentPaymentDue}
                tone={totals.currentPaymentDue > 0 ? 'ok' : 'mute'}
                big
              />
              <CertRow n={9} label="Balance to Finish (Including Retainage)" value={balanceInclRetainage} />
            </div>
          </section>

          {/* Line-item grid */}
          <section className="rounded-lg border border-border bg-card overflow-hidden">
            <header className="px-4 py-2 border-b border-border bg-muted/40 flex items-center gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Line items — the SOV, one row per line
              </p>
              <span className="ml-auto text-[11px] text-muted-foreground font-mono">
                {rows.length} lines · {usd(totals.scheduled)} scheduled
              </span>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] min-w-[1500px]">
                <thead className="bg-muted/30 text-muted-foreground">
                  <tr>
                    <Th className="w-[100px]">Code</Th>
                    <Th>Description</Th>
                    <Th className="text-right w-[110px]">Scheduled</Th>
                    <Th className="text-right w-[80px]">Prior %</Th>
                    <Th className="text-right w-[110px] bg-[#fdf9ee]">This % ✎</Th>
                    <Th className="text-right w-[120px]">Completed $</Th>
                    <Th className="text-right w-[130px] bg-[#fdf9ee]">Stored $ ✎</Th>
                    <Th className="text-right w-[120px]">Total $</Th>
                    <Th className="text-right w-[70px]">%</Th>
                    <Th className="text-right w-[110px]">Balance $</Th>
                    <Th className="text-right w-[110px]">Retainage</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const isEdited =
                      (typeof buf[r.line.id] === 'number' && buf[r.line.id] !== r.prior) ||
                      (typeof storedBuf[r.line.id] === 'number' && storedBuf[r.line.id] !== r.priorStored);
                    return (
                      <tr key={r.line.id} className={cn('border-t border-border/60 hover:bg-muted/20', isEdited && 'bg-[#fdf9ee]/40')}>
                        <td className="px-3 py-1.5 font-mono text-[11px]">{r.line.code}</td>
                        <td className="px-3 py-1.5">{r.line.description}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{usd(r.line.scheduled)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{r.prior.toFixed(1)}%</td>
                        <td className="px-2 py-1 text-right bg-[#fdf9ee]">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={r.thisPct}
                            onChange={(e) => updatePct(r.line.id, e.target.value)}
                            className="w-20 text-right tabular-nums font-semibold bg-transparent border border-[#e0d19c] rounded px-2 py-1 focus:outline-none focus:border-[#b8860b] focus:bg-white"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{usd(r.completedToDate)}</td>
                        <td className="px-2 py-1 text-right bg-[#fdf9ee]">
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={r.stored}
                            onChange={(e) => updateStored(r.line.id, e.target.value)}
                            className="w-28 text-right tabular-nums font-semibold bg-transparent border border-[#e0d19c] rounded px-2 py-1 focus:outline-none focus:border-[#b8860b] focus:bg-white"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{usd(r.total)}</td>
                        <td className={cn(
                          'px-3 py-1.5 text-right tabular-nums',
                          r.pctOfScheduled > 100 ? 'text-[#c75e40] font-semibold' : 'text-muted-foreground'
                        )}>
                          {r.pctOfScheduled.toFixed(1)}%
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{usd(r.balanceToFinish)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{usd(r.lineRetainage)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                    <td className="px-3 py-2" colSpan={2}>TOTALS</td>
                    <td className="px-3 py-2 text-right tabular-nums">{usd(totals.scheduled)}</td>
                    <td />
                    <td />
                    <td className="px-3 py-2 text-right tabular-nums">{usd(totals.completedToDate)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{usd(totals.stored)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{usd(totals.total)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {totals.scheduled > 0 ? ((totals.total / totals.scheduled) * 100).toFixed(1) : '0.0'}%
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{usd(totals.balanceToFinish)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{usd(totals.retainageTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <footer className="flex items-center gap-3 pt-2">
            <p className="text-[11px] text-muted-foreground italic">
              {dirty ? 'Unsaved changes — click Save to write back to Req #' + String(req.seq).padStart(3, '0') + '.' : 'No changes yet.'}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={save} disabled={!dirty}>Save</Button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

function CertRow({
  n, label, value, tone, bold, big,
}: {
  n: number | string; label: string; value: number;
  tone?: 'ok' | 'clay' | 'mute'; bold?: boolean; big?: boolean;
}) {
  const color = tone === 'ok' ? '#2d6a4f' : tone === 'clay' ? '#c75e40' : tone === 'mute' ? '#6b6359' : '#1a1410';
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-mono text-[10px] text-muted-foreground w-6">{n}.</span>
      <span className="text-[11px] text-muted-foreground flex-1">{label}</span>
      <span
        className={cn('tabular-nums font-semibold', bold && 'font-bold', big && 'text-[16px]')}
        style={{ color, fontFamily: big ? "'Fraunces','Georgia',serif" : undefined }}
      >
        {usd(value)}
      </span>
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn('px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.1em] font-semibold', className)}>
      {children}
    </th>
  );
}
