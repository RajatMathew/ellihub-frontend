import { markQuotedEmailContent } from '@/modules/email/lib/email-quoted-content';
import { withoutEmailSignature } from '@/modules/email/lib/email-signature';

/**
 * "Please find attached the invoice" — and nothing attached. Before a message
 * goes out, the composer asks whether files were meant to go with it, the way
 * Zoho Mail does.
 *
 * Only what the sender typed is read: not their signature, and not the quoted
 * history under a reply, where someone else's "see attached" is not a promise
 * this message makes.
 *
 * ## Phrases, not words (elli-ui#1338)
 *
 * The first version fired on any "attached", "attachment" or "enclosed", so
 * "I reviewed the attachments, it's good" — a reply about files someone else
 * sent — was stopped to ask about a file. The word alone cannot tell a promise
 * from a reference. So this looks for the *phrases* people use when the file
 * goes with this message:
 *
 * - an instruction to the reader: "find attached", "see attached", "please
 *   find the invoice attached", "please review the attached", "PFA";
 * - the writer doing it: "I've attached", "I have attached", "I'm attaching",
 *   "I'll attach the drawings", "we have enclosed", "I've included the file";
 * - a presentation: "Attached is/are…", "Attached please find", "Attaching the
 *   quote", "Here is the attachment", "Invoice attached.", "The drawings are
 *   attached", "details are in the attached", "Attachments: 2".
 *
 * And it stays quiet, even when one of those phrases appears, when the clause
 * around it says the file is not part of this message:
 *
 * - it belongs to someone else: "the attachment you sent", "your attached
 *   invoice", "thanks for the attachment";
 * - it is negated: "I haven't attached", "couldn't open the attachment",
 *   "no file attached";
 * - it is deferred or conditional: "I'll attach it later / in a separate
 *   email", "if needed I can attach" — the writer has said the file is *not*
 *   coming with this message, so asking would be wrong;
 * - it points at an earlier message: "I attached it to my last email";
 * - it is a question about a file: "Should I attach the invoice?";
 * - "attached" means something else: "we are attached to the project".
 */

// "attached" and the slips people make typing it. Word-bounded where used, so
// "attachedness" or "unenclosed" never match.
const ATTACHED = String.raw`(?:re-?)?(?:attached|attatched|attched|atached|attachd)`;
const ATTACHING = String.raw`(?:re-?)?(?:attaching|attatching|attching|ataching)`;
const ATTACH = String.raw`(?:re-?)?(?:attach|attatch|atach)`;
const ATTACHMENT = String.raw`(?:attachments?|attachements?|attachemnts?|attachmnts?|atachments?|attchments?)`;
const ATTACHED_OR_ENCLOSED = String.raw`(?:${ATTACHED}|enclosed)`;
const THE_ATTACHED = String.raw`(?:${ATTACHED}|enclosed|${ATTACHMENT})`;

const FILE_NOUN = String.raw`(?:files?|docs?|documents?|pdfs?|invoices?|quotes?|quotations?|estimates?|proposals?|contracts?|agreements?|drawings?|plans?|photos?|pictures?|images?|screenshots?|spreadsheets?|sheets?|reports?|receipts?|statements?|forms?|copy|copies|scans?|versions?|draft|drafts|bills?|orders?|letters?|resume|cv|schedules?|submittals?|specs?|specifications?|lists?|logs?|summary|summaries|details)`;

// Where an instruction to the reader can begin: the start of the clause, or
// after "please" / "kindly" / "you'll" anywhere in it.
const LEAD = String.raw`(?:^|\b(?:please|pls|plz|kindly)\s+|\byou(?:'ll|\s+will|\s+can|\s+may|\s+should)\s+(?:also\s+)?)(?:(?:also|just|do|now)\s+)*`;

// Things to do with a file that only make sense if it is in front of the reader.
const READER_VERB = String.raw`(?:find|see|review|check|view|open|sign|complete|fill\s+(?:out|in)|refer\s+to|look\s+at|take\s+a\s+look\s+at|have\s+a\s+look\s+at|go\s+through|print|approve|read|use|download|note)`;

// After "attached", what keeps it the email sense rather than "attached to the
// project" / "attached to my team".
const NOT_ATTACHED_TO = String.raw`(?!\s+to\b(?!\s+(?:this|the|my|our)\s+(?:e-?mail|message|mail|thread)))`;

const TAIL = String.raw`(?:\s+(?:here|herewith|below|above|too|as\s+well|for\s+(?:your\s+)?\w+(?:\s+\w+)?|to\s+(?:this|the)\s+(?:e-?mail|message|mail)))?\s*$`;

// The writer's own doing ("I've attached", "I'll attach") — the phrases that a
// deferral can undo: "I'll attach it later", "I attached it to my last email".
const WRITER_PHRASES = new WeakSet<RegExp>();
function byWriter(pattern: RegExp): RegExp {
  WRITER_PHRASES.add(pattern);
  return pattern;
}

const PROMISES: RegExp[] = [
  // PFA — "please find attached".
  /\bp\.?f\.?a\b/i,
  // "find attached", "see attached", "see the attachment", "find enclosed" —
  // anywhere, unless a pronoun makes it a statement ("I see the attachment").
  new RegExp(
    String.raw`(?<!\b(?:i|we|they|he|she|u)\s+(?:(?:can|could|did|do|don't|can't|cannot)\s+)?)\b(?:(?:please|pls|plz|kindly)\s+)?(?:find|see)\s+(?:the\s+)?${THE_ATTACHED}\b`,
    'i'
  ),
  // "Please review the attached", "you'll find our quote attached", "Please
  // sign the enclosed contract".
  new RegExp(
    String.raw`${LEAD}${READER_VERB}\s+(?:(?:the|our|my|this|these|both)\s+)?(?:[\w-]+\s+){0,4}?${THE_ATTACHED}\b${NOT_ATTACHED_TO}`,
    'i'
  ),
  // "I've attached", "I have attached", "we attached", "we have enclosed".
  byWriter(
    new RegExp(
      String.raw`\b(?:i|we)(?:'ve|'d|ve|\s+have|\s+had)?\s+(?:(?:also|just|now|already)\s+)*${ATTACHED_OR_ENCLOSED}\b${NOT_ATTACHED_TO}`,
      'i'
    )
  ),
  // "I'm attaching", "we are enclosing".
  byWriter(
    new RegExp(
      String.raw`\b(?:i|we)(?:'m|'re|m|\s+am|\s+are)\s+(?:(?:also|just|now)\s+)*(?:${ATTACHING}|enclosing)\b`,
      'i'
    )
  ),
  // "I'll attach the drawings", "I attach herewith", "we will enclose".
  byWriter(
    new RegExp(
      String.raw`\b(?:i|we)(?:'ll|ll|\s+will|\s+shall|'d\s+like\s+to|\s+would\s+like\s+to|\s+want\s+to|\s+wanted\s+to)?\s+(?:(?:also|just)\s+)*(?:${ATTACH}|enclose)\s+(?:herewith|here|the|a|an|my|our|both|all|it|them|this|these|those|copies|a\s+copy|\d+|two|three)\b`,
      'i'
    )
  ),
  // "I've included the file", "I'm including a copy of the invoice".
  byWriter(
    new RegExp(
      String.raw`\b(?:i|we)(?:'ve|ve|\s+have|'m|m|\s+am|'re|\s+are|'ll|\s+will)?\s+(?:also\s+)?(?:included|including|include)\s+(?:[\w-]+\s+){0,3}?${FILE_NOUN}\b`,
      'i'
    )
  ),
  // "Attaching the quote", "Also attached is…", "Attached please find",
  // "Enclosed are the drawings" — opening the clause.
  new RegExp(
    String.raw`^(?:(?:also|and|please\s+note)\s+)?(?:${ATTACHING}\b|${ATTACHED_OR_ENCLOSED}\s+(?:(?:please|pls|plz|kindly)(?:\s+(?:find|see))?|is|are|you'll|you\s+will|you\s+can|for|herewith|here|below|as|with|the|a|an|my|our|both|all|find|see)\b)`,
    'i'
  ),
  // "Herewith attached", "attached herewith".
  new RegExp(
    String.raw`\bherewith\s+${ATTACHED_OR_ENCLOSED}\b|\b${ATTACHED_OR_ENCLOSED}\s+herewith\b`,
    'i'
  ),
  // "Here is the attachment", "here's the attached invoice".
  new RegExp(
    String.raw`\bhere(?:'s|s|\s+is|\s+are)\s+(?:the\s+)?(?:${ATTACHED}|enclosed|${ATTACHMENT})\b`,
    'i'
  ),
  // "I'm sending you the attached".
  new RegExp(
    String.raw`\b(?:sending|forwarding|sharing)\s+(?:(?:you|over)\s+)?(?:the|our|my)\s+${ATTACHED_OR_ENCLOSED}\b`,
    'i'
  ),
  // "Sending the invoice as an attachment", "forwarding both as attachments".
  // Present tense only: "I sent it as an attachment last week" was another email.
  byWriter(
    new RegExp(
      String.raw`\b(?:sending|forwarding|sharing|including|adding)\b(?:\s+[\w'-]+){0,6}?\s+as\s+(?:an?\s+)?${ATTACHMENT}\b`,
      'i'
    )
  ),
  // "The details are in the attached", "as per the attached quote".
  new RegExp(String.raw`\b(?:in|per|according\s+to)\s+(?:the|our|my)\s+${THE_ATTACHED}\b`, 'i'),
  // "The attached invoice shows…" — opening the clause.
  new RegExp(
    String.raw`^(?:the|our|my)\s+${ATTACHED_OR_ENCLOSED}\s+(?:[\w-]+\s+){0,2}?(?:is|are|has|have|shows?|includes?|contains?|lists?|outlines?|covers?|should|will|details?|summari[sz]es?)\b`,
    'i'
  ),
  // "The drawings are attached", "it's attached for your review" — not "we
  // are attached".
  new RegExp(
    String.raw`\b(?!(?:i|we|they|you|he|she|nothing|none|neither)\b)[\w-]+(?:\s+(?:is|are)|'s|'re)\s+(?:also\s+)?${ATTACHED_OR_ENCLOSED}${TAIL}`,
    'i'
  ),
  // "Invoice attached.", "Revised drawings enclosed".
  new RegExp(String.raw`\b${FILE_NOUN}\s+${ATTACHED_OR_ENCLOSED}${TAIL}`, 'i'),
];

// A label line: "Attachments: 2", "Enclosure: signed contract".
const LABEL = new RegExp(
  String.raw`^(?:${ATTACHMENT}|${ATTACHED}|enclosures?)\s*:\s*(?!none\b|n\/?a\b|nil\b|0\b|-|$)\S`,
  'i'
);

// The file is someone else's.
const NOT_OURS = new RegExp(
  String.raw`\b(?:you|they|he|she|u)\s+(?:just\s+|have\s+|had\s+|'ve\s+|already\s+)?(?:sent|shared|forwarded|provided|attached|included|mentioned|emailed|uploaded)\b|\b(?:your|their|his|her)\s+${THE_ATTACHED}|\bthanks?\s+(?:you\s+)?for\s+(?:sending\s+(?:(?:me|us|over)\s+)?)?(?:the|your)\s+${THE_ATTACHED}`,
  'i'
);

// Negated before the phrase: "I haven't attached", "couldn't open the attachment".
const NEGATED =
  /\b(?:not|never|without|nothing|none|neither|nor|cannot|unable|forgot|forget)\b|n't\b/i;
// "no" only counts right before the phrase — "no file attached" — so that "No
// worries, please find attached" still asks.
const NEGATED_NEAR = /\bno\s+(?:\S+\s+)?$/i;

// The file is not coming with this message: later, separately, conditionally,
// or it went with an earlier one.
const DEFERRED =
  /\b(?:later|separately|separate|another\s+(?:e-?mail|message|mail)|next\s+(?:e-?mail|message|mail|one)|follow[- ]?up|tomorrow|soon|once|when|after|earlier|(?:last|previous|prior|original|other)\s+(?:e-?mail|message|mail|thread|one))\b/i;
const CONDITIONAL = /\b(?:if|unless|whether|when)\b/i;

// A question about a file rather than a file: "Should I attach the invoice?",
// "Where can I find the attachment?".
const QUESTION_OPENER =
  /^(?:should|shall|can\s+i|could\s+i|may\s+i|do|does|did|have|has|had|is|was|were|are|will\s+i|would\s+i|where|why|how|what|which|who)\b/i;

/**
 * The phrase that promised an attachment, as typed — "please find attached",
 * "I've attached" — or null when the message makes no such promise.
 */
export function findAttachmentMention(bodyHtml: string): string | null {
  for (const line of typedText(bodyHtml).split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (LABEL.test(trimmed)) return trimmed.slice(0, trimmed.indexOf(':')).trim();

    for (const sentence of trimmed.split(/(?<=[.!?])\s+/)) {
      const phrase = promiseIn(sentence);
      if (phrase) return phrase;
    }
  }
  return null;
}

/**
 * Whether sending should stop to ask. Nothing to ask when a file is already
 * there, or when the message says nothing about one.
 */
export function attachmentReminder(input: {
  bodyHtml: string;
  attachmentCount: number;
}): string | null {
  if (input.attachmentCount > 0) return null;
  return findAttachmentMention(input.bodyHtml);
}

function promiseIn(sentence: string): string | null {
  const isQuestion = /\?\s*$/.test(sentence) && QUESTION_OPENER.test(sentence.trim());
  if (isQuestion) return null;

  for (const raw of sentence.split(/[,;:()]|\s[-–—]\s/)) {
    const clause = raw.replace(/[.!?]+\s*$/, '').trim();
    if (!clause || NOT_OURS.test(clause)) continue;

    for (const pattern of PROMISES) {
      const match = pattern.exec(clause);
      if (!match) continue;
      const before = clause.slice(0, match.index);
      const after = clause.slice(match.index + match[0].length);
      if (NEGATED.test(before) || NEGATED_NEAR.test(before)) continue;
      if (CONDITIONAL.test(before)) continue;
      if (WRITER_PHRASES.has(pattern) && DEFERRED.test(after)) continue;
      return match[0].trim();
    }
  }
  return null;
}

const BLOCK_ELEMENTS = 'p,div,li,tr,h1,h2,h3,h4,h5,h6,pre,table,ul,ol';

/**
 * The message's own text, one line per block: signature and quoted history
 * taken out. Blocks are kept apart so "Thanks</p><p>See attached" does not
 * read as "ThanksSee attached".
 */
function typedText(bodyHtml: string): string {
  const document = new DOMParser().parseFromString(
    `<body>${withoutEmailSignature(bodyHtml)}</body>`,
    'text/html'
  );
  markQuotedEmailContent(document)?.remove();
  document.body.querySelectorAll('blockquote').forEach((quote) => quote.remove());
  document.body.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  document.body.querySelectorAll(BLOCK_ELEMENTS).forEach((block) => block.append('\n'));
  return (document.body.textContent ?? '').replace(/[‘’ʼ`]/g, "'").replace(/[^\S\n]+/g, ' ');
}
