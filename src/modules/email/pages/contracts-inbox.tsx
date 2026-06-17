import { Inbox, FileText, Send, FileEdit, XCircle, Search, RefreshCw } from 'lucide-react';

/**
 * Empty Outlook-style inbox shell for contracts@ellicorp.com. The visual
 * layout mirrors the Estimating Email tab so Peter can preview the target
 * before wiring real mailbox data. No data, no actions yet — just chrome.
 */
const FOLDERS = [
  { name: 'Inbox', icon: Inbox, count: 0, active: true },
  { name: 'Ongoing', icon: FileText, count: 0 },
  { name: 'Sent', icon: Send, count: 0 },
  { name: 'Drafts', icon: FileEdit, count: 0 },
  { name: 'Declined', icon: XCircle, count: 0 },
];

export default function ContractsInbox() {
  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* ── Pane 1: Folders ────────────────────────────────────── */}
      <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-200">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-gray-500">
            Mailbox
          </p>
          <p className="mt-0.5 text-sm font-semibold text-gray-900 truncate">
            contracts@ellicorp.com
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <p className="px-2 mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-gray-500">
            Folders
          </p>
          {FOLDERS.map(({ name, icon: Icon, count, active }) => (
            <button
              key={name}
              type="button"
              className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-[13px] font-medium text-left transition-colors ${
                active
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1 truncate">{name}</span>
              <span className="text-[11px] text-gray-400">{count}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-200">
          <button
            type="button"
            disabled
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-gray-400 border border-gray-200 rounded cursor-not-allowed"
            title="Sync runs once the Outlook connection is wired"
          >
            <RefreshCw className="size-3" />
            Sync
          </button>
        </div>
      </aside>

      {/* ── Pane 2: Message list ───────────────────────────────── */}
      <section className="w-[360px] shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <header className="px-4 py-3 border-b border-gray-200">
          <h1 className="text-sm font-semibold text-gray-900">Inbox</h1>
          <div className="mt-2 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
            <input
              type="text"
              disabled
              placeholder="Search emails..."
              className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-gray-50 border border-gray-200 rounded text-gray-500 placeholder:text-gray-400 disabled:cursor-not-allowed"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto flex items-center justify-center p-6 text-center">
          <div>
            <Inbox className="size-8 mx-auto text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-600">
              No emails to show
            </p>
            <p className="mt-1 text-[12px] text-gray-400 leading-relaxed">
              Once the Outlook connection for{' '}
              <span className="font-mono text-gray-500">contracts@ellicorp.com</span>{' '}
              is wired, mail will appear here.
            </p>
          </div>
        </div>
      </section>

      {/* ── Pane 3: Reading pane ───────────────────────────────── */}
      <section className="flex-1 bg-gray-50 flex items-center justify-center text-center p-8">
        <div>
          <FileText className="size-10 mx-auto text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-600">
            Select an email to read
          </p>
          <p className="mt-1 text-[12px] text-gray-400 max-w-sm leading-relaxed">
            Paper Trail and Documents will live here, mirroring the Estimating Email view.
          </p>
        </div>
      </section>
    </div>
  );
}
