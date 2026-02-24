export function QuoteDocument({
  vendor,
  total,
  accentColor,
  companyColor,
}: {
  vendor: string;
  total: string;
  accentColor: string;
  companyColor: string;
}) {
  const lineItems = [
    { desc: 'Instructor Station — Type L1', unit: 'EA', qty: 2, unitPrice: 7840.0, ext: 15680.0 },
    { desc: 'Student Workstation — Type S4', unit: 'EA', qty: 12, unitPrice: 1875.0, ext: 22500.0 },
    { desc: 'Storage Cabinet — Type C2 (Tall)', unit: 'EA', qty: 6, unitPrice: 2340.0, ext: 14040.0 },
    { desc: 'Solid Surface Countertop — Black Pearl', unit: 'LF', qty: 112, unitPrice: 52.0, ext: 5824.0 },
    { desc: 'Hardware Kit — Premium Grade', unit: 'SET', qty: 40, unitPrice: 24.5, ext: 980.0 },
  ];
  const subtotal = lineItems.reduce((s, r) => s + r.ext, 0);
  const delivery = parseFloat(total.replace(/[^0-9.]/g, '')) - subtotal;

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(n);

  const shortVendor = vendor.split(' ').slice(0, 2).join(' ');

  return (
    <div className="rounded-lg bg-white shadow-sm text-[11px] overflow-hidden border border-gray-100">
      {/* Company header */}
      <div className="px-5 pt-5 pb-4" style={{ borderTop: `4px solid ${accentColor}` }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div
              className="mb-2 flex size-10 items-center justify-center rounded-md text-white text-sm font-black"
              style={{ background: companyColor }}
            >
              {vendor.charAt(0)}
            </div>
            <div className="font-bold uppercase tracking-wide text-[13px] text-gray-900">
              {vendor}
            </div>
            <div className="text-[10px] text-gray-500 leading-relaxed mt-0.5">
              411 Industrial Blvd, Suite 200<br />
              Brooklyn, NY 11237<br />
              Tel: (718) 555-0194
            </div>
          </div>
          <div className="text-right">
            <div
              className="text-[15px] font-black uppercase tracking-widest mb-1"
              style={{ color: accentColor }}
            >
              Quotation
            </div>
            <div className="text-[10px] text-gray-500 leading-loose">
              <span className="font-semibold text-gray-700">Quote #:</span> QT-{Math.floor(Math.random() * 9000) + 1000}<br />
              <span className="font-semibold text-gray-700">RFQ #:</span> 2025-101<br />
              <span className="font-semibold text-gray-700">Date:</span> Jan 16, 2022<br />
              <span className="font-semibold text-gray-700">Valid Until:</span> Feb 16, 2022
            </div>
          </div>
        </div>
      </div>

      {/* Bill To / Ship To */}
      <div className="grid grid-cols-2 gap-3 mx-5 mb-4 p-3 bg-gray-50 rounded-md border border-gray-100">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Bill To</div>
          <div className="font-semibold text-gray-800">P.S. 397B School Project</div>
          <div className="text-gray-500 leading-relaxed">
            c/o John Martinez, Asst. PM<br />
            30 Court St, Brooklyn NY 11201<br />
            jmartinez@sca.nyc.gov
          </div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Ship To</div>
          <div className="font-semibold text-gray-800">P.S. 397B — Job Site</div>
          <div className="text-gray-500 leading-relaxed">
            1060 Myrtle Ave<br />
            Brooklyn, NY 11206<br />
            Contact: Site Superintendent
          </div>
        </div>
      </div>

      {/* Line items table */}
      <div className="mx-5 mb-4 overflow-hidden rounded-md border border-gray-200">
        <table className="w-full">
          <thead>
            <tr style={{ background: accentColor }}>
              <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-white">
                Description
              </th>
              <th className="px-2 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-white w-10">
                Unit
              </th>
              <th className="px-2 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-white w-8">
                Qty
              </th>
              <th className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-wider text-white w-20">
                Unit Price
              </th>
              <th className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-wider text-white w-20">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, i) => (
              <tr
                key={i}
                className="border-b border-gray-100 last:border-0"
                style={{ background: i % 2 === 0 ? '#ffffff' : '#fafafa' }}
              >
                <td className="px-3 py-2 text-gray-700">{item.desc}</td>
                <td className="px-2 py-2 text-center text-gray-500">{item.unit}</td>
                <td className="px-2 py-2 text-center text-gray-700 font-medium">{item.qty}</td>
                <td className="px-2 py-2 text-right text-gray-700 tabular-nums">{fmt(item.unitPrice)}</td>
                <td className="px-2 py-2 text-right font-semibold text-gray-900 tabular-nums">{fmt(item.ext)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="mx-5 mb-5">
        <div className="ml-auto w-56">
          <div className="flex justify-between py-1 text-gray-600">
            <span>Subtotal</span>
            <span className="tabular-nums">{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between py-1 text-gray-600">
            <span>Delivery &amp; Handling</span>
            <span className="tabular-nums">{fmt(delivery > 0 ? delivery : 857.25)}</span>
          </div>
          <div className="flex justify-between py-1 text-gray-600">
            <span>Tax (0%)</span>
            <span className="tabular-nums">$0.00</span>
          </div>
          <div
            className="mt-1 flex justify-between rounded-md px-2 py-2 font-black text-white text-[12px]"
            style={{ background: accentColor }}
          >
            <span>GRAND TOTAL</span>
            <span className="tabular-nums">{total}</span>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="mx-5 mb-5 rounded-md bg-gray-50 border border-gray-100 p-3">
        <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
          Terms &amp; Conditions
        </div>
        <div className="text-[10px] text-gray-500 leading-relaxed">
          Payment Terms: Net 30 days from invoice date. All materials meeting AWI Premium Grade
          specifications. Lead time begins upon receipt of signed contract and approved submittals.
          Pricing valid for 30 days. {shortVendor} carries full general liability insurance.
        </div>
      </div>

      {/* Signature block */}
      <div className="mx-5 mb-5 grid grid-cols-2 gap-4">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-3">
            Authorized Signature
          </div>
          <div className="border-b border-gray-300 w-full mb-1" />
          <div className="text-[9px] text-gray-400">Signature &amp; Date</div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-3">
            Print Name &amp; Title
          </div>
          <div className="border-b border-gray-300 w-full mb-1" />
          <div className="text-[9px] text-gray-400">Name &amp; Title</div>
        </div>
      </div>
    </div>
  );
}
