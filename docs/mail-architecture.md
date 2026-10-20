# Mail architecture

The mailbox is the largest feature in the client after `project`: 138 files, 67 components and 42
pure helpers. It is also the one most likely to be changed by someone who has not read it, because
every bug arrives phrased as a small visual complaint. This file is the orientation the module never
had.

Read `.claude/rules/data-fetching.md` and `performance.md` first — everything here assumes them.

## Two things are called mail, and they are not related

| | `src/modules/email/` (138 files) | `src/modules/mail/` (6 files) |
| --- | --- | --- |
| What | the mailbox — read, reply, search, calendar | outbound *feature* mail |
| Server | `/api/v1/email/*`, which talks to **Aurinko** | `/api/v1/mail/*`, which talks to **Microsoft Graph** |
| Used by | the Mail section | RFQ, PO and change-order pages, to send a templated document |
| Entry | `pages/mailbox-page.tsx` | `hooks/mail.hooks.ts`, `EmailComposePreviewForm` |

They share a word and nothing else. `modules/mail` has no inbox, no folders and no sync; it drafts,
previews and sends one templated message on behalf of a record. If you are fixing something in the
mailbox, `modules/mail` is not it.

## The read path is cache-first, and that is deliberate

`elli-core` does not read the provider to answer a list. It answers from its own Postgres cache and
revalidates behind the response:

```
GET /email/accounts/:id/messages
  ├─ cache has rows  → answer now, sync in the background
  └─ cache is empty  → read the provider once, write the cache, answer
```

Two consequences the client is built around:

- **A list can be stale, and says so.** Every page carries `freshness`. The list renders immediately
  and is corrected later; it never blocks on a provider round trip.
- **The correction arrives over a WebSocket, not a poll.** See below.

Only the Inbox (and every folder of a *shared* mailbox) is cache-covered server-side. Other folders
read through to the provider, which is why Sent and Drafts can feel slower on a personal account.

## Realtime: `email.synced`, and why a bare one is ignored

`hooks/use-email-realtime.ts` holds one WebSocket to `/api/v1/email/realtime`, authenticated by the
session cookie.

- Every event is scoped before it is acted on (`decideEmailRealtimeScope`). The server fans events
  out per organization, so an event for another user's mailbox can reach this socket; one this
  session is not entitled to is dropped before it touches the cache.
- **The client acts on `email.synced` only when it carries `changed: true`.** The server publishes
  after every sync run, and refetching on all of them put a quiet mailbox into a request loop. A
  publisher that forgets the flag is invisible — mail lands in Postgres and the reader never sees it
  until they navigate. That has shipped before.
- A `newMailItem` on the event is spliced straight into the open Inbox list, so new mail appears
  without waiting for a refetch. Everything else is reconciled by an invalidation coalesced over
  `REFETCH_COALESCE_MS` (1.5s).

## Query keys and cache windows

Keys are built by the `emailKeys` factory in `hooks/email.hooks.ts` — never hand-assembled, or you
silently create a second cache entry and a second request. The message-list key carries **ten**
parts (account, folder, size, search, project, classification, unread, flagged, hasAttachments,
status), because each of those changes what the server returns. It grows: check the factory rather
than trusting this list.

| Data | `staleTime` | Why |
| --- | --- | --- |
| accounts, folders, tags, config, signatures | 5 min | reference data; changes when the user acts |
| messages, conversations | 1 min | corrected by the socket anyway |
| all of the above | 15 min `gcTime` | switching folders and back should not refetch |

## Signatures

The composer offers the `MAIL_SIGNATURE` templates admins keep under Settings → Templates →
Signature. `GET /email/accounts/:id/signatures` returns each one **already rendered** for the
signed-in user — their own name, role and email, never the template author's — plus their choice for
that mailbox (which template, and whether it goes on new mail and on replies/forwards). It is guarded
by `mail:send`, not `template:read`, and loaded once with the mailbox (`useEmailSignaturesQuery`).

- **The signature lives in the body**, wrapped in `<div class="elli-signature">`
  (`lib/email-signature.ts`). That class is the only one the composer's cleaner keeps
  (`sanitizeEmailClass`); it survives a draft round-trip through Outlook and Gmail, and it is how the
  menu swaps or removes the signature. The reading pane treats it as a signature, never as quoted
  text.
- **"Has the user written anything" ignores it.** Use `isEmptyEmailBody`, not `isEmptyEmailHtml`,
  for anything that decides whether a composer is untouched — the send gate on a reply, whether
  closing keeps a draft, whether Escape asks first, the placeholder. A body holding only its
  signature is empty.
- **Images are links in the editor, attachments in the sent mail.** The composer links them to
  `GET /mail/signature-assets/:file` (public, no session), so the editor and a saved draft show
  them. As a message leaves, elli-core swaps each link for an inline `cid:` attachment carrying the
  same image — how PO and RFQ emails carry theirs — so recipients see them without fetching
  anything, and Outlook desktop does not hold them back. A draft whose send stopped after that step
  opens with its links restored (`linkSignatureImages`).
- **Drafts never get one added.** They already hold whatever signature they were written with.

## Traps

These each cost real time to find. They are not obvious from reading the code around them.

### `folder` on a list row is the folder **id**, not the well-known key

`mailbox-page.tsx` maps server rows into `EmailListItem` and overwrites `folder` with
`email.folderId`. By the time a row reaches `EmailRowCard`, `folder` is a ULID and no longer says
whether this is the Inbox or Sent. The server's key is preserved alongside it as **`folderKey`** —
read that.

This is why the first attempt at elli-ui#1115 rendered nothing at all while the API was already
returning the right data. If you need to know what *kind* of folder a row is in, use `folderKey`;
`folder` is for identity.

### Money is a string, and so is every `Decimal`

Covered in `data-fetching.md`, repeated here because the mail module now carries money too (the
reference picker's meta line). Parse with `z.string()`, never `z.number()`.

### The two repos deploy separately

A field added to an `elli-core` response is **optional on the client** until both sides have shipped.
The alternative is that a client which deploys first throws on every row. When you add one, decide
what the UI does without it and make that the fallback — and prefer a fallback that looks obviously
empty over one that looks plausibly wrong.

### Sent and Drafts are labelled by recipient

Every message in them is from the account holder, so labelling by sender prints the same name on
every row. `lib/email-row-correspondent.ts` owns that decision, keyed off the row's own folder
rather than the folder being viewed — so a sent message found by a cross-folder search still reads
as one.

### The recipient count is not part of the truncating label

`label` is the name and truncates; `othersCount` renders in its own unshrinking span, the way the
thread count does. Concatenating them put `+2` at the end of a truncating span, so the rows that
most needed it were exactly the long ones that lost it.

## Where the logic lives

The module is deliberately shallow in its components and deep in `lib/` — 42 pure helpers, each
testable without a renderer. That is not incidental: the unit suite has **no React renderer**, so a
decision left inside a component cannot be tested at all. (It does have a DOM — happy-dom is
preloaded — which is why the body pipeline is testable; see `.claude/rules/testing.md`.) When you
find yourself writing a conditional in JSX, move it to `lib/` and test it there. `email-row-correspondent.ts`, `email-synced-actions.ts` and
`mailbox-url-state.ts` are the shape to copy.

## URL state

Folder and open conversation live in the **path**
(`/app/email/accounts/:accountSlug/:folder/id/:messageId`), so a thread is linkable. The workspace
view and everything that narrows the folder — search, filters, project, classification — live in the
**query string**. `hooks/use-mailbox-url-state.ts` is the only
place that mapping is written; do not parse `useSearchParams` for mail state anywhere else.
