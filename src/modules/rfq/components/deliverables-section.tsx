interface Deliverable {
  id: string;
  description: string;
  unit: string;
  qty: number;
}

export function DeliverablesSection({ deliverables }: { deliverables: Deliverable[] }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Dark header */}
      <div className="flex items-center gap-2 bg-foreground/90 px-5 py-3">
        <span className="text-xs font-bold uppercase tracking-widest text-white">
          Project Information &amp; Scope
        </span>
      </div>

      <div className="bg-background px-6 py-6 flex flex-col gap-8">
        {/* Required Deliverables */}
        <div>
          <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-foreground">
            Required Deliverables
          </h3>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="w-14 px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                    S/N
                  </th>
                  <th className="px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Product / Description
                  </th>
                  <th className="w-20 px-4 py-2.5 text-center text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Unit
                  </th>
                  <th className="w-16 px-4 py-2.5 text-right text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                    QTY
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {deliverables.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">
                      {String(idx + 1).padStart(2, '0')}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {item.description}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-foreground">
                      {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-foreground tabular-nums">
                      {item.qty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Scope */}
        <div>
          <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-foreground">
            Detailed Scope
          </h3>
          <div className="flex flex-col gap-4">
            <p className="text-[15px] leading-[1.7] text-foreground/80">
              Fabrication and delivery of custom millwork casework for computer lab
              renovation. This includes instructor stations, student workstations, and
              integrated storage solutions across the primary teaching areas.
            </p>
            <p className="text-[15px] leading-[1.7] text-foreground/80">
              The project requires strict adherence to architectural drawings A-301 through
              A-305. All surfaces must meet AWI Premium Grade standards, specifically
              regarding veneer matching and hardware installation. Coordination with
              electrical contractors for integrated power grommets is essential.
            </p>
            <p className="text-[15px] leading-[1.7] text-foreground/80">
              Material procurement should prioritize lead times for solid surface countertops
              to ensure alignment with the overarching project schedule. Samples must be
              submitted for approval prior to the commencement of fabrication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
