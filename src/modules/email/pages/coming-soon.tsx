import { Mail } from 'lucide-react';

/**
 * Generic "Coming soon" page for accounting mailbox stubs (procurement /
 * requisitions). The contracts mailbox uses a more developed empty-inbox
 * shell so Peter can preview the target layout.
 */
export default function ComingSoonPage({ mailbox }: { mailbox: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
      <div className="size-14 rounded-full bg-muted flex items-center justify-center">
        <Mail className="size-6 text-muted-foreground" />
      </div>
      <div>
        <h1 className="text-xl font-semibold text-foreground">{mailbox}</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">
          Coming soon. This mailbox will open here once the Outlook connection
          is wired up.
        </p>
      </div>
    </div>
  );
}
