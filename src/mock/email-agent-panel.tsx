import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ChangeEvent as ReactChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import api from '@/app/api';
import { DotMatrixLoader } from '@/app/components/dot-matrix-loader';
import { FileFormatBadge } from '@/app/components/file-format-badge';
import { Button } from '@/app/components/ui/button';
import {
  InfiniteMultiSearchSelect,
  type InfiniteMultiSearchSelectOption,
} from '@/app/components/ui/infinite-multi-search-select';
import { Textarea } from '@/app/components/ui/textarea';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { useDismissOnOutside } from '@/app/hooks/use-dismiss-on-outside';
import { useLayout } from '@/app/hooks/use-layout';
import { useLingering } from '@/app/hooks/use-lingering';
import { useIsMobile } from '@/app/hooks/use-mobile';
import { toDateOnly } from '@/app/lib/dates';
import { getApiErrorMessage } from '@/app/lib/toast-api-error';
import { cn } from '@/app/lib/utils';
import { AgentChatHistoryMenu } from '@/mock/agent-chat-history-menu';
import { AgentReplyHeader } from '@/mock/agent-reply-header';
import { useVendorPickerOptions } from '@/modules/directory/hooks';
import type { ConnectedEmailFolder, ConnectedEmailTag } from '@/modules/email/api';
import { emailApi, type EmailMessageSearchResult } from '@/modules/email/api';
import type { EmailListItem } from '@/modules/email/components/email-row-card';
import {
  useArchiveEmailMessageMutation,
  useDeleteEmailMessageMutation,
  useMoveEmailMessageMutation,
  useReplyConnectedEmailMutation,
  useSaveEmailThreadClassificationMutation,
  useUpdateEmailMessageStatusMutation,
  useUpdateEmailMessageTagsMutation,
} from '@/modules/email/hooks';
import { useEmailMessageSearchQuery } from '@/modules/email/hooks/email.hooks';
import { withElliotProposal } from '@/modules/email/lib/email-action-source';
import { isElliotAgentDisabled } from '@/modules/email/lib/email-agent-availability';
import { filesApi } from '@/modules/files/api/files.api';
import { useUploadManager } from '@/modules/files/uploads/upload-manager-context';
import {
  useCreateScheduleEntryMutation,
  useDeleteScheduleEntryMutation,
  useUpdateScheduleEntryMutation,
} from '@/modules/project/hooks';
import {
  useAddVendorMutation,
  useEditQuoteMutation,
  usePublishRFQMutation,
  useRemoveQuoteMutation,
  useRemoveVendorMutation,
  useSubmitQuoteMutation,
} from '@/modules/project/hooks/rfq/rfq.hooks';
import { useChat } from '@ai-sdk/react';
import { useQuery } from '@tanstack/react-query';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from 'ai';
import {
  Archive,
  ArrowUp,
  CalendarClock,
  Check,
  FileText,
  FolderInput,
  GripVertical,
  Mail,
  PanelLeftOpen,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { toast } from 'sonner';
import { useStickToBottomContext } from 'use-stick-to-bottom';

import { AgentActionButtons, AgentActionNote, AgentActionResult } from './agent-action-controls';
import { AgentActionShell } from './agent-action-shell';
import { groupActivitySteps } from './agent-activity';
import { AgentActivityTimeline } from './agent-activity-timeline';
import { agentCardStatus } from './agent-card-status';
import { describeAgentChatError } from './agent-chat-error';
import { AgentChatHeaderTitle } from './agent-chat-header-title';
import { chatHeaderTitle, withConversationTitle, withProvisionalTitles } from './agent-chat-titles';
import { compactBody, withThreadBodies, type ThreadBodyState } from './agent-context-rules';
import { AgentEmailPane } from './agent-email-pane';
import {
  CardDateField,
  CardFieldRow,
  CardFields,
  CardReadOnlyField,
  CardTextField,
} from './agent-fields';
import { getSilencedTextParts } from './agent-follow-up';
import { AgentFollowUpChipRow, KeepLatestAnswerInView } from './agent-follow-up-chip-row';
import { followUpAnchor } from './agent-follow-up-chips';
import { AgentFullscreenRail } from './agent-fullscreen-rail';
import { fillEmailPrompt, type ContextThread } from './agent-fullscreen-rules';
import { AgentJumpToLatest } from './agent-jump-to-latest';
import { MentionPills } from './agent-mention-pills';
import {
  matchesWords,
  MENTION_TABS,
  mentionCandidates,
  mentionMenuHeading,
  mentionMenuRows,
  mentionTabSearches,
  nextMentionTab,
  parseRecordMentions,
  readMentions,
  readRecordMentions,
  RECORD_KIND_ICONS,
  recordMentionKey,
  withMentionedRecords,
  withRecordMention,
  type MentionMenuRow,
  type MentionRef,
  type MentionTab,
  type RecordMention,
  type RecordMentionKind,
} from './agent-mentions';
import { enterTransition } from './agent-motion';
import {
  agentPanelLayout,
  agentPanelSize,
  halfPanelWidth,
  type AgentPanelSize,
} from './agent-panel-layout';
import { findMailProposalBatches } from './agent-proposal-batch';
import { AgentProposalBatchCard } from './agent-proposal-batch-card';
import { answerOutput, ASK_TOOL_NAME, isQuestionPart, pendingQuestion } from './agent-question';
import { AgentQuestionCard } from './agent-question-card';
import { EmailActionChooser, NEEDS_THREAD } from './agent-rail-actions';
import {
  awaitsDecision,
  elliotAskedQuestion,
  failedMessageCoversPendingCard,
  holdsEnterWhileRunning,
  isEmailRequest,
  needsAThread,
  queueStep,
  sendBlockedReason,
  shouldShowThinkingIndicator,
  withPendingRevised,
  type ActionQueue,
} from './agent-send-rules';
import { AgentSizeMenu } from './agent-size-menu';
import {
  matchAgentSlashCommands,
  type AgentSlashCommand,
  type AgentSlashCommandMatch,
} from './agent-slash-commands';
import { AgentStreamingMarkdown } from './agent-streaming-markdown';
import { fixedSuggestionKey } from './agent-suggestions';
import { AgentWhichEmail, type WhichEmailQuestion } from './agent-which-email';
import { AgentWorkingIndicator } from './agent-working-indicator';
import { Conversation, ConversationContent } from './ai-elements/conversation';
import { Message, MessageContent } from './ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputController,
} from './ai-elements/prompt-input';
import { parseCardNumber } from './card-number';
import { isQuoteEdit, quoteActionBlocker, quoteAttachmentIds } from './quote-action-rules';
import { RecordActionCard } from './record-action-card';
import {
  isRecordActionReady,
  RECORD_TOOL_NAME,
  recordActionCopy,
  type RecordAgentAction,
} from './record-actions';
import { ReplyActionFields } from './reply-action-fields';
import { isMailActionReady, replyActionBlocker } from './reply-action-rules';
import { useAgentArchive } from './use-agent-archive';
import { useContextThreadBodies, type ContextThreadRef } from './use-context-thread-bodies';
import { useFollowUpSuggestions } from './use-follow-up-suggestions';
import { useRecordActionExecutor } from './use-record-action-executor';
import { useThreadSuggestions } from './use-thread-suggestions';

export type EmailAgentLayout = {
  open: boolean;
  width: number;
  pushesContent: boolean;
  hidesEmailList: boolean;
  /** Elliot covers the whole mail workspace: a rail, the chat, and the mail beside it. */
  fullscreen: boolean;
};

type MockAgentAction = {
  action: 'reply' | 'archive' | 'move' | 'tag' | 'mark_read' | 'delete' | 'set_status';
  summary: string;
  messageIds: string[];
  subject?: string;
  to?: Array<{ address: string; name?: string }>;
  cc?: Array<{ address: string; name?: string }>;
  /** Added on the card; Elliot does not propose blind copies. */
  bcc?: Array<{ address: string; name?: string }>;
  body?: string;
  targetFolderKey?: string;
  targetFolderName?: string;
  tagNames?: string[];
  status?: 'open' | 'closed';
  conversationKey?: string;
};

type MailToolPart = {
  toolCallId: string;
  state: string;
  input?: MockAgentAction;
  output?: string;
  errorText?: string;
};

type PendingMailBatch = {
  ids: string[];
  startedAt: number;
  delayMs: number;
  phase: 'countdown' | 'sending';
  /** The change being applied right now. */
  activeId: string | null;
  cancel: () => void;
};

type ScheduleAttachmentSelection =
  | {
      source: 'email_attachment';
      /**
       * Which mailbox the file lives in. Optional for back-compat: legacy
       * schedule proposals only know about the currently-opened thread and omit
       * this — the materializer falls back to the panel's `accountId`.
       */
      accountId?: string;
      messageId: string;
      attachmentId: string;
      attachmentName: string;
    }
  | { source: 'existing_file'; fileId: string; fileName: string };

type ScheduleActionBaseFields = {
  projectId: string;
  projectName?: string;
  date: string;
  description: string;
  adjustedFinishDate?: string | null;
  notes?: string | null;
  primeChangeOrderId?: string | null;
  primeChangeOrderLabel?: string | null;
  attachment?: ScheduleAttachmentSelection | null;
};

type ScheduleAgentAction =
  | ({ action: 'add_schedule'; summary: string } & ScheduleActionBaseFields)
  | ({
      action: 'update_schedule';
      scheduleId: string;
      summary: string;
    } & ScheduleActionBaseFields)
  | {
      action: 'remove_schedule';
      scheduleId: string;
      projectId: string;
      projectName?: string;
      scheduleDescription?: string;
      scheduleDate?: string;
      summary: string;
    };

type QuoteUploadAgentAction = {
  action: 'upload_quote';
  quoteId: string;
  rfqId: string;
  rfqNumber: string;
  vendorName: string;
  projectId: string;
  quotedAmount?: number | null;
  negotiationAmount?: number | null;
  leadTimeDays?: number | null;
  attachment?: ScheduleAttachmentSelection | null;
  /** 'edit' corrects a quote already submitted; absent means a new quote. */
  mode?: 'submit' | 'edit';
  /** Edit mode: the files already on the quote. They are kept. */
  existingAttachments?: Array<{ fileId: string; fileName: string }>;
  summary: string;
};

interface RfqRemoveAgentActionBase {
  quoteId: string;
  rfqId: string;
  rfqNumber: string;
  vendorName: string;
  summary: string;
}
type QuoteRemoveAgentAction = RfqRemoveAgentActionBase & { action: 'remove_quote' };
type VendorRemoveAgentAction = RfqRemoveAgentActionBase & { action: 'remove_vendor' };

type RfqPublishVendor = { vendorId: string; vendorName: string; vendorEmail?: string | null };

type RfqPublishAgentAction = {
  action: 'publish_rfq';
  rfqId: string;
  rfqNumber: string;
  rfqTitle: string;
  projectName?: string | null;
  vendors: RfqPublishVendor[];
  summary: string;
};

type RfqAgentAction =
  | QuoteUploadAgentAction
  | QuoteRemoveAgentAction
  | VendorRemoveAgentAction
  | RfqPublishAgentAction;

type MockAgentPanelProps = {
  open: boolean;
  email: EmailListItem | null;
  mailboxAddress: string;
  accountId?: string;
  threadKey?: string | null;
  contextEmails: EmailListItem[];
  folders?: ConnectedEmailFolder[];
  tags?: ConnectedEmailTag[];
  onOpenChange: (open: boolean) => void;
  onLayoutChange: (layout: EmailAgentLayout) => void;
  onRequestMailboxCollapse?: () => void;
  /** Where the mailbox fetches inline images from, for the email pane. */
  inlineImageBaseUrl?: string | null;
  /** Elliot is archiving these messages; the mailbox lets go of them first. */
  onArchiveStart?: (messageIds: readonly string[]) => void;
};

type ConversationSummary = {
  id: string;
  accountId: string | null;
  threadKey: string | null;
  title: string;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
};

type StoredConversation = ConversationSummary & {
  messages: UIMessage[];
  context?: { activeThread?: unknown; availableThreads?: Array<{ messageId?: string }> };
};

const DEFAULT_WIDTH = 448;
const MIN_WIDTH = 340;
const MAX_WIDTH = 720;

// Summarise and draft are the suggestion chips above, so only the one command
// with no chip is offered here. `{email}` would mark a command about a thread.
const QUICK_COMMANDS = [
  { command: '/tools', label: 'See available tools', template: '/tools', multi: false },
] as const;
const SLASH_COMMAND_ICONS: Record<AgentSlashCommand['command'], LucideIcon> = {
  '/tools': Wrench,
  '/summarize': FileText,
  '/draft': Pencil,
  '/schedule': CalendarClock,
};

function folderLabelFromKey(key: string | undefined) {
  return key ? key.charAt(0).toUpperCase() + key.slice(1).toLowerCase() : '';
}

/** One row of the menu that opens on "/": a model suggestion or a quick command. */
type SlashItem = {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  template: string;
  multi?: boolean;
  /** Picked by the model for the attached mail; the row shows the sparkle. */
  fromModel?: boolean;
};

function getMessageId(email: EmailListItem) {
  return email.latestMessageId ?? email.id;
}

function getEmailContext(
  email: EmailListItem | null,
  contextEmails: EmailListItem[],
  folders: ConnectedEmailFolder[],
  tags: ConnectedEmailTag[],
  mailboxAddress: string,
  includeActiveContext: boolean,
  accountId: string | undefined,
  threadBodies: ReadonlyMap<string, ThreadBodyState>
) {
  const selected =
    includeActiveContext && email
      ? [email, ...contextEmails.filter((item) => item.id !== email.id)]
      : contextEmails;
  return {
    mailboxAddress,
    activeThread:
      includeActiveContext && email
        ? {
            messageId: getMessageId(email),
            threadId: email.threadId ?? email.conversationKey ?? null,
            conversationKey: email.conversationKey ?? email.threadId ?? null,
            accountId: accountId ?? null,
            subject: email.subject,
            sender: { name: email.senderName, address: email.senderEmail },
            to: email.to ?? [],
            cc: email.cc ?? [],
            // The list row may be a preview-only stand-in; the fetched body fills in.
            body: activeThreadBody(email, threadBodies),
            receivedAt: email.receivedAt,
            keywords: email.keywords ?? [],
            tags: email.tags ?? [],
            attachments: collectActiveThreadAttachments(email),
          }
        : null,
    // Added threads carry their full message once it has loaded, so Elliot can
    // work from one the way it works from the open mail.
    availableThreads: withThreadBodies(
      selected.slice(0, 40).map((item) => ({
        messageId: getMessageId(item),
        threadId: item.threadId ?? item.conversationKey ?? null,
        conversationKey: item.conversationKey ?? item.threadId ?? item.id,
        subject: item.subject,
        sender: { name: item.senderName, address: item.senderEmail },
        preview: item.preview,
        keywords: item.keywords ?? [],
        tags: item.tags ?? [],
      })),
      threadBodies
    ),
    folders: folders.map((folder) => ({ id: folder.id, key: folder.key, name: folder.name })),
    tags: tags.map((tag) => ({ id: tag.id, name: tag.name, source: tag.source })),
  };
}

function activeThreadBody(
  email: EmailListItem,
  threadBodies: ReadonlyMap<string, ThreadBodyState>
): string[] {
  const own = email.threadMessages?.flatMap((message) => message.body) ?? email.body ?? [];
  if (own.length) return compactBody(own);
  const fetched = threadBodies.get(getMessageId(email));
  return fetched?.status === 'loaded' ? compactBody(fetched.body) : [];
}

function collectActiveThreadAttachments(email: EmailListItem) {
  const attachments: Array<{
    messageId: string;
    id: string;
    name: string;
    size?: number | null;
    mimeType?: string | null;
  }> = [];
  const seen = new Set<string>();
  const addFrom = (messageId: string, list: EmailListItem['attachments']) => {
    if (!list?.length) return;
    for (const attachment of list) {
      if (attachment.inline) continue;
      if (!attachment.id || !attachment.name) continue;
      const key = `${messageId}::${attachment.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      attachments.push({
        messageId,
        id: attachment.id,
        name: attachment.name,
        size: attachment.sizeBytes ?? null,
        mimeType: attachment.mimeType ?? null,
      });
    }
  };

  if (email.threadMessages?.length) {
    for (const message of email.threadMessages) {
      addFrom(message.id, message.attachments);
    }
  } else {
    addFrom(getMessageId(email), email.attachments);
  }
  return attachments;
}

/**
 * The backend returns a 409 Conflict with the message
 * "Vendor already added to this RFQ" when re-adding a vendor that's already
 * on the RFQ. Treat it as a benign no-op instead of a hard failure — the
 * desired end state (the vendor is on the RFQ) is already met.
 */
function isVendorAlreadyAddedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as {
    response?: { status?: number; data?: { message?: unknown } };
    message?: unknown;
  };
  const status = err.response?.status;
  const serverMessage =
    typeof err.response?.data?.message === 'string' ? err.response.data.message : '';
  const errorMessage = typeof err.message === 'string' ? err.message : '';
  const combined = `${serverMessage} ${errorMessage}`.toLowerCase();
  if (combined.includes('already added')) return true;
  if (status === 409 && combined.includes('vendor')) return true;
  return false;
}

const MAIL_ACTION_COPY: Record<MockAgentAction['action'], { title: string; approveLabel: string }> =
  {
    reply: { title: 'Email Reply Draft', approveLabel: 'Approve & Send Email' },
    archive: { title: 'Archive Email', approveLabel: 'Approve & Archive' },
    move: { title: 'Move Email', approveLabel: 'Approve & Move' },
    tag: { title: 'Tag Email', approveLabel: 'Approve & Tag' },
    mark_read: { title: 'Mark as Read', approveLabel: 'Approve & Mark Read' },
    delete: { title: 'Delete Email', approveLabel: 'Approve & Delete' },
    set_status: { title: 'Set Thread Status', approveLabel: 'Approve' },
  };

// "user": every motion animation in the panel honours the reader's
// reduced-motion setting.
export function EmailAgentPanel(props: MockAgentPanelProps) {
  return (
    <MotionConfig reducedMotion="user">
      <EmailAgentPanelContent {...props} />
    </MotionConfig>
  );
}

function EmailAgentPanelContent({
  open,
  email,
  mailboxAddress,
  accountId,
  threadKey,
  contextEmails: listedContextEmails,
  folders = [],
  tags = [],
  onOpenChange,
  onLayoutChange,
  onRequestMailboxCollapse,
  inlineImageBaseUrl,
  onArchiveStart,
}: MockAgentPanelProps) {
  // Mails found by searching the mailbox from the @ menu, fetched in full so
  // they behave like a loaded row. Kept per mailbox.
  const [fetchedMails, setFetchedMails] = useState<{ accountId?: string; items: EmailListItem[] }>({
    items: [],
  });
  const contextEmails = useMemo(() => {
    const extra = fetchedMails.accountId === accountId ? fetchedMails.items : [];
    const listed = new Set(listedContextEmails.map((item) => item.id));
    return [...listedContextEmails, ...extra.filter((item) => !listed.has(item.id))];
  }, [accountId, fetchedMails, listedContextEmails]);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const panelRef = useRef<HTMLElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  // Elliot opens as the side panel; the ⤢ button in its header goes full screen.
  const [fullscreen, setFullscreen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  // Below md the rail is a drawer over the chat, opened from the top bar.
  const [railDrawerOpen, setRailDrawerOpen] = useState(false);
  // The backdrop stays for its fade-out after the drawer starts sliding away.
  const railBackdropShown = useLingering(railDrawerOpen, 220);
  const [showEmailPane, setShowEmailPane] = useState(false);
  const [paneEmailId, setPaneEmailId] = useState<string | null>(null);
  // An action clicked with several threads in context: Elliot asks which, in the chat.
  const [whichEmail, setWhichEmail] = useState<WhichEmailQuestion | null>(null);
  // A mail request typed with nothing attached: what was asked, so the note can repeat it.
  const [noThreadNotice, setNoThreadNotice] = useState<string | null>(null);
  // "All of them": the threads still to do, sent one at a time.
  const [actionQueue, setActionQueue] = useState<ActionQueue | null>(null);
  const { isSidebarOpen, setSidebarOpen } = useLayout();
  const restoreSidebarRef = useRef(false);
  // Closing Elliot while full screen restores the sidebar as leaving would.
  useEffect(
    () => () => {
      if (restoreSidebarRef.current) setSidebarOpen(true);
    },
    [setSidebarOpen]
  );
  const contextPopoverRef = useRef<HTMLDivElement | null>(null);
  const [contextOpen, setContextOpen] = useState(false);
  const [contextSearch, setContextSearch] = useState('');
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
  const [draftMentionContextIds, setDraftMentionContextIds] = useState<string[]>([]);
  // Records picked with @ for the message being written: projects, RFQs, POs…
  const [draftRecordMentions, setDraftRecordMentions] = useState<RecordMention[]>([]);
  const [includeActiveContext, setIncludeActiveContext] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, MockAgentAction>>({});
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<string, ScheduleAgentAction>>({});
  const [quoteDrafts, setQuoteDrafts] = useState<Record<string, RfqAgentAction>>({});
  const [recordDrafts, setRecordDrafts] = useState<Record<string, RecordAgentAction>>({});
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [history, setHistory] = useState<ConversationSummary[]>([]);
  // Each chat's newest name this session (streamed or renamed), by chat id.
  const [liveTitles, setLiveTitles] = useState<Record<string, string>>({});
  const renamedChatsRef = useRef(new Set<string>());
  // A new chat's stand-in name (its email's subject), held back while the
  // model's name for it is on the way so the header changes once, not twice.
  const provisionalTitlesRef = useRef<Record<string, string>>({});
  const [actionsDisabled, setActionsDisabled] = useState<boolean | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  /**
   * The proposal an approval carries out, named on the requests it makes so
   * the server records the change as Elliot's, approved by you (elli-ui#1309).
   * Read when the approval runs — a ref, so the newest conversation id.
   */
  const proposalFor = useCallback(
    (toolCallId: string) =>
      conversationIdRef.current ? { conversationId: conversationIdRef.current, toolCallId } : null,
    []
  );
  const contextRef = useRef<Record<string, unknown>>({});
  const mailboxKeyRef = useRef<string | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
  const preserveConversationOnThreadChangeRef = useRef(false);
  const [pendingApproval, setPendingApproval] = useState<{ id: string; approved: boolean } | null>(
    null
  );
  /**
   * The Elliot action the user just approved is being held for a short
   * cancellation window. Presence of this state means the ActionCard for
   * `toolCallId` should render the inline PendingActionBar instead of its
   * normal buttons. The bar owns the entire lifecycle: `countdown` while the
   * user can still cancel, then `sending` while the actual mutations are in
   * flight. It's cleared in the same batch as the tool output, so the card
   * transitions bar → confirmation without a "Working…" interstitial.
   *
   * Tone drives the palette:
   *   - `success`      → emerald (reply — additive)
   *   - `destructive`  → destructive tokens (delete / archive / move —
   *                       reversible-during-window actions that remove the
   *                       message from the current folder)
   */
  /** Elliot archives the user took back from the toast; their cards say so. */
  const [undoneArchives, setUndoneArchives] = useState<ReadonlySet<string>>(() => new Set());
  const [pendingDeferredAction, setPendingDeferredAction] = useState<{
    toolCallId: string;
    startedAt: number;
    delayMs: number;
    phase: 'countdown' | 'sending';
    tone: 'success' | 'destructive';
    actionType: MockAgentAction['action'];
    label: string;
    cancel: () => void;
  } | null>(null);
  /** An "Approve all" on a batch of mail changes: one undo window, then each in turn. */
  const [pendingBatch, setPendingBatch] = useState<PendingMailBatch | null>(null);
  const isMobile = useIsMobile();
  // The side panel's layout (phones included), with full screen on top of it:
  // full screen fills the mailbox, hides its list and offers no resizing.
  const sideLayout = agentPanelLayout({ open, width, isMobile });
  const pushesContent = !fullscreen && sideLayout.pushesContent;
  const hidesEmailList = open && (fullscreen || sideLayout.hidesEmailList);
  const canResize = !fullscreen && sideLayout.canResize;
  const cssWidth = sideLayout.cssWidth;
  const defaultSuggestions = useMemo(
    () =>
      email
        ? [
            {
              label: 'Draft a concise reply',
              icon: Pencil,
              template: 'Draft a concise reply to {email}.',
              multi: true,
            },
            {
              label: 'Summarise this thread',
              icon: FileText,
              template: 'Summarise {email}.',
              multi: true,
            },
            {
              label: 'Archive this email',
              icon: Archive,
              template: 'Archive {email}.',
              multi: true,
            },
          ]
        : [
            {
              label: 'Find recent key emails',
              icon: Search,
              template: 'Find recent key emails',
              multi: false,
            },
            {
              label: 'Summarise unread messages',
              icon: FileText,
              template: 'Summarise unread messages',
              multi: false,
            },
            {
              label: 'Show emails with attachments',
              icon: Paperclip,
              template: 'Show emails with attachments',
              multi: false,
            },
          ],
    [email]
  );
  // Mails picked with @ for the message being written, shown as pills over the box.
  const pendingMentions = useMemo<MentionRef[]>(
    () =>
      draftMentionContextIds.flatMap((id) => {
        const item = contextEmails.find((candidate) => candidate.id === id);
        return item
          ? [
              {
                id: item.id,
                messageId: getMessageId(item),
                subject: item.subject,
                senderName: item.senderName,
                receivedAt: item.receivedAt ?? null,
              },
            ]
          : [];
      }),
    [contextEmails, draftMentionContextIds]
  );
  const contextIdsForAgent = useMemo(
    () => [...new Set([...selectedContextIds, ...draftMentionContextIds])],
    [draftMentionContextIds, selectedContextIds]
  );
  const contextEmailsForAgent = contextEmails.filter((item) =>
    contextIdsForAgent.includes(item.id)
  );
  const contextThreadRefs = useMemo(() => {
    const seen = new Set<string>();
    const refs: ContextThreadRef[] = [];
    for (const item of [
      ...(includeActiveContext && email ? [email] : []),
      ...contextEmailsForAgent,
    ]) {
      const messageId = getMessageId(item);
      if (seen.has(messageId)) continue;
      seen.add(messageId);
      refs.push({ messageId, threadId: item.threadId, conversationKey: item.conversationKey });
    }
    return refs;
  }, [contextEmailsForAgent, email, includeActiveContext]);
  const threadBodies = useContextThreadBodies(accountId, contextThreadRefs);
  /** The open mail first, then the threads added to the chat. */
  const threadsInContext = useMemo<ContextThread[]>(
    () =>
      [
        ...(includeActiveContext && email ? [email] : []),
        ...contextEmailsForAgent.filter((item) => item.id !== email?.id),
      ].map((item) => ({
        id: item.id,
        messageId: getMessageId(item),
        subject: item.subject,
        senderName: item.senderName,
      })),
    [contextEmailsForAgent, email, includeActiveContext]
  );
  // Content-aware suggestions want exactly one mail to read; with several,
  // the rail keeps its fixed actions.
  const suggestionSource = useMemo(() => {
    if (threadsInContext.length !== 1) return undefined;
    const only = threadsInContext[0]!;
    const item = [...(includeActiveContext && email ? [email] : []), ...contextEmailsForAgent].find(
      (candidate) => candidate.id === only.id
    );
    return {
      ...only,
      senderEmail: item?.senderEmail ?? null,
      attachments: (item?.attachments ?? [])
        .filter((attachment) => !attachment.inline && attachment.name)
        .map((attachment) => attachment.name!),
    };
  }, [contextEmailsForAgent, email, includeActiveContext, threadsInContext]);
  const threadSuggestions = useThreadSuggestions(
    suggestionSource,
    suggestionSource ? threadBodies.get(suggestionSource.messageId) : undefined,
    accountId
  );
  // What the empty chat offers: Elliot's reading of the one attached mail
  // first, then the fixed actions it did not already cover.
  const suggestions = useMemo(() => {
    const found = threadSuggestions.status === 'ready' ? threadSuggestions.items : [];
    // The side panel has room for one good pick; full screen shows every one.
    const suggested = fullscreen ? found : found.slice(0, 1);
    if (suggested.length === 0) return defaultSuggestions;
    const fixed = defaultSuggestions.filter(
      (action) => !suggested.some((item) => item.key === fixedSuggestionKey(action.label))
    );
    return [...suggested.map((item) => ({ ...item, multi: false })), ...fixed];
  }, [defaultSuggestions, fullscreen, threadSuggestions]);
  const suggestionsLoading = threadSuggestions.status === 'loading';
  // What "/" in the box adds above the commands: Elliot's suggestions for the mail.
  const slashItems = useMemo<SlashItem[]>(
    () =>
      (threadSuggestions.status === 'ready' ? threadSuggestions.items : []).map((item) => ({
        id: `suggest-${item.key}`,
        label: item.label,
        description: item.reason,
        icon: item.icon,
        template: item.template,
        multi: false,
        fromModel: true,
      })),
    [threadSuggestions]
  );
  const hasSuggestions = threadSuggestions.status === 'ready' && threadSuggestions.items.length > 0;
  // Re-keys the chip list when the picks change, so they animate in together.
  const suggestionsKey = suggestions.map((item) => item.label).join('|');
  const context = useMemo(
    () =>
      getEmailContext(
        email,
        contextEmailsForAgent,
        folders,
        tags,
        mailboxAddress,
        includeActiveContext,
        accountId,
        threadBodies
      ),
    [
      accountId,
      contextEmailsForAgent,
      email,
      folders,
      includeActiveContext,
      mailboxAddress,
      tags,
      threadBodies,
    ]
  );
  useEffect(() => {
    contextRef.current = context;
  }, [context]);
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);
  const loadHistory = useCallback(async () => {
    if (!accountId) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const response = await api.get<{ data: ConversationSummary[] }>('/mock/agent/conversations', {
        params: { accountId },
      });
      setHistory(response.data.data ?? []);
    } finally {
      setHistoryLoading(false);
    }
  }, [accountId]);
  useEffect(() => {
    let active = true;
    void api
      .get<{ data: { actionsDisabled?: boolean } }>('/mock/agent/config')
      .then((response) => {
        if (active) setActionsDisabled(response.data.data?.actionsDisabled === true);
      })
      .catch(() => {
        // The chat endpoint also sends this flag with each stream. Approval
        // fails closed if neither request can confirm the execution mode.
      });
    return () => {
      active = false;
    };
  }, []);
  // `body` runs when a message is sent — including the SDK's automatic resend
  // after a tool result — never while rendering, so its ref reads are not the
  // render-time reads react-hooks/refs is about. The compiler cannot see that
  // through a third-party constructor, and reports it on the construction.
  // The mails the latest user message pointed at with @. Read when a request
  // is built, so the automatic resend after a tool result keeps the same turn.
  const latestMentionsRef = useRef<MentionRef[]>([]);
  // The records it tagged, handed over by kind and id for the same reason.
  const latestRecordsRef = useRef<RecordMention[]>([]);
  const transport = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs
      new DefaultChatTransport({
        api: `${(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')}/api/v1/mock/agent/chat`,
        // The API is on another origin (localhost:9000 locally). fetch only
        // sends the session cookie there when asked, unlike the axios client
        // (`withCredentials: true`); without it every turn is a 401.
        credentials: 'include',
        body: () => ({
          context: withMentionedRecords(
            latestRecordsRef.current,
            latestMentionsRef.current.length
              ? {
                  // First, so it survives when a long context is cut at the end.
                  // The message's text no longer names these mails, so this says
                  // which threads in context it means, by message id.
                  mentionedInLatestMessage: latestMentionsRef.current.map((mention) => ({
                    messageId: mention.messageId,
                    subject: mention.subject,
                    senderName: mention.senderName,
                  })),
                  ...contextRef.current,
                }
              : contextRef.current
          ),
          conversationId: conversationIdRef.current,
          accountId: accountId ?? null,
          threadKey: threadKey ?? null,
        }),
      }),
    [accountId, threadKey]
  );
  /**
   * A lone archive runs without approval (elli-ui#651). Whether it is lone is
   * only known once its step has finished — more proposals can follow it, and
   * then it belongs to a batch the user reviews as one — so streaming only
   * notes the live archive calls, and the finished step decides. Read through
   * refs because `useChat` takes its callbacks before the handlers below exist.
   */
  const noteToolCallRef = useRef<
    (toolCall: { toolName: string; toolCallId: string; input: unknown }) => void
  >(() => undefined);
  const finishStepRef = useRef<
    (event: { message: UIMessage; isAbort: boolean; isError: boolean }) => void
  >(() => undefined);
  /** Live archive calls waiting for their step to finish. */
  const [autoArchiveIds, setAutoArchiveIds] = useState<ReadonlySet<string>>(() => new Set());
  const { messages, sendMessage, addToolOutput, status, error, stop, setMessages } = useChat({
    transport,
    // Apply streamed chunks at most every 50ms. Every chunk used to re-render
    // this whole panel and every message in it — dozens of times a second at
    // the model's pace — which is what made streaming stutter. The text itself
    // still moves every frame: useSmoothText reveals it between updates.
    throttle: 50,
    // Only calls streamed live land here, never ones reloaded from history,
    // so an old unanswered proposal is not archived just by reopening it.
    onToolCall: ({ toolCall }) => noteToolCallRef.current(toolCall),
    onFinish: (event) => {
      // The stream closes only after the generated name is sent, or its
      // deadline passes — so a stand-in still held now has no name coming.
      const held = provisionalTitlesRef.current;
      provisionalTitlesRef.current = {};
      setLiveTitles((current) => withProvisionalTitles(current, held));
      finishStepRef.current(event);
    },
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onData: (part) => {
      // The chat's generated name, sent while Elliot answers (elli-ui#1370).
      if (part.type === 'data-conversation-title') {
        const named = part.data as { conversationId?: string; title?: string };
        // A chat the reader has already renamed keeps the reader's name.
        if (
          named.conversationId &&
          named.title &&
          !renamedChatsRef.current.has(named.conversationId)
        ) {
          const { conversationId: id, title } = named;
          delete provisionalTitlesRef.current[id];
          setLiveTitles((current) => ({ ...current, [id]: title }));
          setHistory((current) => withConversationTitle(current, { id, title }));
        }
        return;
      }
      if (part.type !== 'data-conversation-metadata') return;
      const metadata = part.data as {
        conversationId?: string;
        title?: string;
        actionsDisabled?: boolean;
      };
      // The name the chat has now. A generated one may follow within moments,
      // so it waits for that rather than flashing in the header first.
      if (metadata.conversationId && metadata.title) {
        provisionalTitlesRef.current[metadata.conversationId] = metadata.title;
      }
      if (metadata.conversationId) {
        setConversationId(metadata.conversationId);
        conversationIdRef.current = metadata.conversationId;
      }
      if (typeof metadata.actionsDisabled === 'boolean') {
        setActionsDisabled(metadata.actionsDisabled);
      }
    },
  });
  // A chat started in this session is in the list with its name but not its
  // summary, which is written as its first answer is saved. Fetch the list once
  // that answer is in — only then, so a chat costs one refresh, not one a turn.
  const activeChatLacksSummary =
    conversationId != null &&
    history.some((item) => item.id === conversationId && item.summary == null);
  useEffect(() => {
    if (status !== 'ready' || !activeChatLacksSummary) return;
    const timer = window.setTimeout(() => void loadHistory(), 800);
    return () => window.clearTimeout(timer);
  }, [activeChatLacksSummary, loadHistory, status]);
  const replyMutation = useReplyConnectedEmailMutation();
  const archiveMutation = useArchiveEmailMessageMutation();
  const archiveWithUndo = useAgentArchive(accountId, folders);
  const moveMutation = useMoveEmailMessageMutation();
  const deleteMutation = useDeleteEmailMessageMutation();
  const statusMutation = useUpdateEmailMessageStatusMutation();
  const tagsMutation = useUpdateEmailMessageTagsMutation();
  const classificationMutation = useSaveEmailThreadClassificationMutation();
  const createScheduleMutation = useCreateScheduleEntryMutation();
  const updateScheduleMutation = useUpdateScheduleEntryMutation();
  const deleteScheduleMutation = useDeleteScheduleEntryMutation();
  const submitQuoteMutation = useSubmitQuoteMutation();
  const editQuoteMutation = useEditQuoteMutation();
  const removeQuoteMutation = useRemoveQuoteMutation();
  const removeVendorMutation = useRemoveVendorMutation();
  const publishRfqMutation = usePublishRFQMutation();
  const addVendorMutation = useAddVendorMutation();
  const uploadManager = useUploadManager();
  const executeRecordAction = useRecordActionExecutor(accountId);

  useEffect(() => {
    onLayoutChange({ open, width, pushesContent, hidesEmailList, fullscreen });
  }, [fullscreen, hidesEmailList, onLayoutChange, open, pushesContent, width]);

  useEffect(() => {
    const mailboxKey = `${accountId ?? ''}:${threadKey ?? email?.id ?? ''}`;
    const isNewMailboxThread =
      mailboxKeyRef.current !== null && mailboxKeyRef.current !== mailboxKey;
    mailboxKeyRef.current = mailboxKey;
    const timer = window.setTimeout(() => {
      const preserveConversation = preserveConversationOnThreadChangeRef.current;
      preserveConversationOnThreadChangeRef.current = false;
      if (isNewMailboxThread && !preserveConversation) {
        stop();
        setMessages([]);
        setConversationId(null);
        conversationIdRef.current = null;
        setSelectedContextIds([]);
        setDraftMentionContextIds([]);
        setDraftRecordMentions([]);
        setIncludeActiveContext(true);
        setDrafts({});
        setScheduleDrafts({});
        setQuoteDrafts({});
        setRecordDrafts({});
        setContextOpen(false);
        setRailDrawerOpen(false);
      }
      void loadHistory();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [accountId, email?.id, loadHistory, setMessages, stop, threadKey]);

  // Stable, so the history list's outside-click listener is not re-bound on
  // every render of the panel.

  const handleLoadConversation = async (id: string) => {
    setLoadingConversationId(id);
    try {
      const response = await api.get<{ data: StoredConversation }>(
        `/mock/agent/conversations/${id}`
      );
      const stored = response.data.data;
      setMessages(stored.messages ?? []);
      setConversationId(stored.id);
      conversationIdRef.current = stored.id;
      const storedMessageIds = new Set(
        (stored.context?.availableThreads ?? []).map((item) => item.messageId)
      );
      setIncludeActiveContext(Boolean(stored.context?.activeThread));
      setSelectedContextIds(
        contextEmails
          .filter((item) => storedMessageIds.has(getMessageId(item)) && item.id !== email?.id)
          .map((item) => item.id)
      );
      setDraftMentionContextIds([]);
      setDraftRecordMentions([]);
      setDrafts({});
      setScheduleDrafts({});
      setQuoteDrafts({});
      setRecordDrafts({});
      setRailDrawerOpen(false);
    } finally {
      setLoadingConversationId(null);
    }
  };

  const renameConversation = async (id: string, title: string) => {
    const previousHistory = history;
    const previousTitles = liveTitles;
    setHistory((current) => withConversationTitle(current, { id, title }));
    setLiveTitles((current) => ({ ...current, [id]: title }));
    renamedChatsRef.current.add(id);
    try {
      await api.patch(`/mock/agent/conversations/${id}`, { title });
    } catch {
      setHistory(previousHistory);
      setLiveTitles(previousTitles);
      toast.error("Couldn't rename that chat. Try again.");
    }
  };

  const handleNewConversation = () => {
    stop();
    setActionQueue(null);
    setMessages([]);
    setConversationId(null);
    conversationIdRef.current = null;
    setDraftMentionContextIds([]);
    setDraftRecordMentions([]);
    setDrafts({});
    setScheduleDrafts({});
    setQuoteDrafts({});
    setRecordDrafts({});
    setRailDrawerOpen(false);
  };

  const handleResizeStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const startX = event.clientX;
    const startWidth = width;
    setIsResizing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + startX - moveEvent.clientX)));
    };
    const handlePointerUp = () => {
      setIsResizing(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const runBulkAgent = useCallback(
    async <T,>(ids: string[], perId: (messageId: string) => Promise<T>) => {
      // Small concurrency: fast enough for a few dozen, gentle on the provider.
      const CONCURRENCY = 4;
      for (let index = 0; index < ids.length; index += CONCURRENCY) {
        const batch = ids.slice(index, index + CONCURRENCY);
        await Promise.all(batch.map((id) => perId(id)));
      }
    },
    []
  );

  const executeAction = useCallback(
    async (action: MockAgentAction) => {
      if (!accountId) throw new Error('Connect a mailbox before running an action.');
      const messageIds = action.messageIds ?? [];
      if (messageIds.length === 0) throw new Error('The agent did not identify any emails.');
      const primaryMessageId = messageIds[0]!;
      // Suffix appended when bulk actions succeed across many messages.
      const bulkSuffix = messageIds.length > 1 ? ` (${messageIds.length} emails)` : '';

      let shouldDisableActions = actionsDisabled;
      if (shouldDisableActions === null) {
        try {
          const response = await api.get<{ data: { actionsDisabled?: boolean } }>(
            '/mock/agent/config'
          );
          shouldDisableActions = response.data.data?.actionsDisabled === true;
          setActionsDisabled(shouldDisableActions);
        } catch {
          shouldDisableActions = true;
          setActionsDisabled(true);
        }
      }

      if (shouldDisableActions) {
        if (action.action === 'reply') return 'Reply simulated successfully.';
        if (action.action === 'archive')
          return `Email archive simulated successfully${bulkSuffix}.`;
        if (action.action === 'move')
          return `Email move to ${action.targetFolderName ?? 'the target folder'} simulated successfully${bulkSuffix}.`;
        if (action.action === 'tag')
          return `Adding ${(action.tagNames ?? []).join(', ') || 'the requested tags'} simulated successfully${bulkSuffix}.`;
        if (action.action === 'set_status')
          return `Thread status change to ${action.status ?? 'open'} simulated successfully.`;
        if (action.action === 'mark_read')
          return `Mark-as-read simulated successfully${bulkSuffix}.`;
        return `Delete simulated successfully${bulkSuffix}.`;
      }

      if (action.action === 'archive' || action.action === 'move' || action.action === 'delete') {
        preserveConversationOnThreadChangeRef.current = true;
      }

      if (action.action === 'reply') {
        // Non-deferred path (preview mode / no account). handleApproval handles
        // the normal case via runDeferredReply; if we get here, just fire the
        // reply immediately.
        await replyMutation.mutateAsync({
          accountId,
          messageId: primaryMessageId,
          body: action.body ?? '',
          bodyType: 'html',
          subject: action.subject,
          to: action.to,
          cc: action.cc,
          bcc: action.bcc,
        });
        return 'Reply sent successfully.';
      }
      if (action.action === 'archive') {
        const targetFolderId = folders.find((folder) => folder.key === 'archive')?.id;
        await runBulkAgent(messageIds, (messageId) =>
          archiveMutation.mutateAsync({ accountId, messageId, targetFolderId })
        );
        return `Email archived successfully${bulkSuffix}.`;
      }
      if (action.action === 'move') {
        const target = folders.find(
          (folder) =>
            folder.key?.toLowerCase() === action.targetFolderKey?.toLowerCase() ||
            folder.name.toLowerCase() === action.targetFolderName?.toLowerCase()
        );
        if (!target)
          throw new Error(`I could not find the ${action.targetFolderName ?? 'target'} folder.`);
        await runBulkAgent(messageIds, (messageId) =>
          moveMutation.mutateAsync({ accountId, messageId, folderId: target.id })
        );
        return `Email moved to ${target.name}${bulkSuffix}.`;
      }
      if (action.action === 'tag') {
        // Only Elli's own tags can be applied; provider categories are read-only.
        const matchedTags = tags.filter(
          (tag) =>
            tag.source === 'custom' &&
            (action.tagNames ?? []).some((name) => name.toLowerCase() === tag.name.toLowerCase())
        );
        if (!matchedTags.length) throw new Error('I could not match the requested tag.');
        const add = matchedTags.map((tag) => tag.id);
        const addNames = matchedTags.map((tag) => tag.name);
        await runBulkAgent(messageIds, (messageId) =>
          tagsMutation.mutateAsync({ accountId, messageId, add, addNames })
        );
        return `Added ${matchedTags.map((tag) => tag.name).join(', ')}${bulkSuffix}.`;
      }
      if (action.action === 'set_status') {
        // set_status is per-conversation — dedupe by conversationKey so multi-
        // message selections in the same thread don't fire the mutation twice.
        const candidateEmails = email ? [email, ...contextEmails] : contextEmails;
        const uniqueTargets = new Map<
          string,
          { conversationKey: string; threadId: string | null; references: unknown }
        >();
        for (const id of messageIds) {
          const targetEmail =
            candidateEmails.find(
              (item) =>
                getMessageId(item) === id ||
                item.conversationKey === action.conversationKey ||
                item.threadId === action.conversationKey
            ) ?? email;
          const key =
            action.conversationKey ?? targetEmail?.conversationKey ?? targetEmail?.threadId;
          if (!key) continue;
          if (uniqueTargets.has(key)) continue;
          uniqueTargets.set(key, {
            conversationKey: key,
            threadId: targetEmail?.threadId ?? null,
            references: targetEmail?.classification?.references ?? [],
          });
        }
        if (uniqueTargets.size === 0) throw new Error('I could not identify the email thread.');
        const nextStatus = action.status ?? 'open';
        for (const target of uniqueTargets.values()) {
          await classificationMutation.mutateAsync({
            accountId,
            conversationKey: target.conversationKey,
            threadId: target.threadId,
            status: nextStatus,
            references: (target.references as never[]) ?? [],
          });
        }
        const suffix = uniqueTargets.size > 1 ? ` (${uniqueTargets.size} threads)` : '';
        return `Thread marked ${nextStatus}${suffix}.`;
      }
      if (action.action === 'mark_read') {
        await runBulkAgent(messageIds, (messageId) =>
          statusMutation.mutateAsync({ accountId, messageId, unread: false })
        );
        return `Email marked as read${bulkSuffix}.`;
      }
      const targetFolderId = folders.find((folder) => folder.key === 'deleted')?.id;
      await runBulkAgent(messageIds, (messageId) =>
        deleteMutation.mutateAsync({ accountId, messageId, targetFolderId })
      );
      return `Email moved to deleted items${bulkSuffix}.`;
    },
    [
      accountId,
      actionsDisabled,
      archiveMutation,
      classificationMutation,
      contextEmails,
      deleteMutation,
      email,
      folders,
      moveMutation,
      replyMutation,
      statusMutation,
      tags,
      tagsMutation,
    ]
  );

  /**
   * Full lifecycle for an agent-approved Elliot action that we want to hold
   * for a cancellation window: countdown → sending → tool output. The bar
   * renders continuously through all phases and the confirmation replaces it
   * in the same batch as the tool output, so the ActionCard never falls back
   * to the "Working…" button state between the bar disappearing and the
   * success/error message appearing.
   *
   * Currently used for reply (success tone) and delete / move
   * (destructive tone). Other actions (tag, mark_read, set_status) run
   * immediately through the standard executeAction path.
   */
  const runDeferredAction = useCallback(
    (config: {
      toolCallId: string;
      actionType: MockAgentAction['action'];
      tone: 'success' | 'destructive';
      label: string;
      execute: () => Promise<void>;
      successOutput: string;
      cancelOutput: string;
      errorFallback: string;
    }) => {
      const {
        toolCallId,
        actionType,
        tone,
        label,
        execute,
        successOutput,
        cancelOutput,
        errorFallback,
      } = config;
      const delayMs = 5000;

      let settled = false;

      const cancel = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timerId);
        // Single batch: bar disappears AND the rejection lands in the same
        // render — no gap where the card would flash back to buttons.
        setPendingDeferredAction(null);
        addToolOutput({
          tool: 'proposeEmailAction',
          toolCallId,
          state: 'output-available',
          output: `REJECTED: ${cancelOutput}`,
        });
      };

      const timerId = window.setTimeout(async () => {
        if (settled) return;
        settled = true;
        // Flip the bar into "sending" — cancel is gone, progress bar full,
        // subtle pulse while the mutation(s) run.
        setPendingDeferredAction((prev) =>
          prev && prev.toolCallId === toolCallId
            ? { ...prev, phase: 'sending', cancel: () => undefined }
            : prev
        );
        try {
          await withElliotProposal(proposalFor(toolCallId), execute);
          setPendingDeferredAction(null);
          addToolOutput({
            tool: 'proposeEmailAction',
            toolCallId,
            state: 'output-available',
            output: `SUCCESS: ${successOutput}`,
          });
        } catch (error) {
          setPendingDeferredAction(null);
          addToolOutput({
            tool: 'proposeEmailAction',
            toolCallId,
            state: 'output-error',
            errorText: error instanceof Error ? error.message : errorFallback,
          });
        }
      }, delayMs);

      setPendingDeferredAction({
        toolCallId,
        startedAt: Date.now(),
        delayMs,
        phase: 'countdown',
        tone,
        actionType,
        label,
        cancel,
      });
    },
    [addToolOutput, proposalFor]
  );

  /**
   * Elliot's archive, straight through (elli-ui#651): no approval and no
   * cancellation window — the rows fade out and the toast carries the undo.
   * The card shows the bar's working state while the archive runs.
   */
  const runAgentArchive = useCallback(
    async (toolCallId: string, action: MockAgentAction) => {
      const messageIds = [...action.messageIds];
      const bulkSuffix = messageIds.length > 1 ? ` (${messageIds.length} emails)` : '';
      const clearBar = () =>
        setPendingDeferredAction((current) =>
          current?.toolCallId === toolCallId ? null : current
        );
      preserveConversationOnThreadChangeRef.current = true;
      onArchiveStart?.(messageIds);
      setPendingDeferredAction({
        toolCallId,
        startedAt: Date.now(),
        delayMs: 0,
        phase: 'sending',
        tone: 'destructive',
        actionType: 'archive',
        label: messageIds.length > 1 ? 'Archiving emails' : 'Archiving email',
        cancel: () => undefined,
      });
      try {
        await archiveWithUndo({
          messageIds,
          proposal: proposalFor(toolCallId),
          // Putting the mail back moves the open thread again; keep this chat.
          onUndoStart: () => {
            preserveConversationOnThreadChangeRef.current = true;
          },
          onUndone: () => setUndoneArchives((current) => new Set(current).add(toolCallId)),
        });
        clearBar();
        addToolOutput({
          tool: 'proposeEmailAction',
          toolCallId,
          state: 'output-available',
          output: `SUCCESS: Email archived successfully${bulkSuffix}.`,
        });
      } catch (archiveError) {
        preserveConversationOnThreadChangeRef.current = false;
        clearBar();
        addToolOutput({
          tool: 'proposeEmailAction',
          toolCallId,
          state: 'output-error',
          errorText: archiveError instanceof Error ? archiveError.message : 'The archive failed.',
        });
      }
    },
    [addToolOutput, archiveWithUndo, onArchiveStart, proposalFor]
  );

  useEffect(() => {
    noteToolCallRef.current = (toolCall) => {
      if (toolCall.toolName !== 'proposeEmailAction') return;
      const action = toolCall.input as MockAgentAction | undefined;
      if (action?.action !== 'archive' || !action.messageIds?.length) return;
      // Preview mode, or no mailbox: the card stays, and approving it simulates.
      if (!accountId || actionsDisabled !== false) return;
      setAutoArchiveIds((current) => new Set(current).add(toolCall.toolCallId));
    };
    finishStepRef.current = ({ message, isAbort, isError }) => {
      const batched = new Set(findMailProposalBatches(message).flat());
      const waiting: Array<{ toolCallId: string; action: MockAgentAction }> = [];
      for (const part of message.parts) {
        if (part.type !== 'tool-proposeEmailAction' || !('toolCallId' in part)) continue;
        const toolPart = part as unknown as MailToolPart;
        if (!autoArchiveIds.has(toolPart.toolCallId)) continue;
        if (isAbort || isError || batched.has(toolPart.toolCallId)) continue;
        if (toolPart.state !== 'input-available' || !toolPart.input) continue;
        waiting.push({ toolCallId: toolPart.toolCallId, action: toolPart.input });
      }
      // Cleared in the same batch as each run starts, so the card goes from
      // waiting straight to working. A batched one now shows in its batch.
      setAutoArchiveIds(new Set());
      for (const { toolCallId, action } of waiting) void runAgentArchive(toolCallId, action);
    };
  }, [accountId, actionsDisabled, autoArchiveIds, runAgentArchive]);

  const handleApproval = useCallback(
    async (toolCallId: string, action: MockAgentAction, approved: boolean) => {
      setPendingApproval({ id: toolCallId, approved });
      try {
        if (!approved) {
          addToolOutput({
            tool: 'proposeEmailAction',
            toolCallId,
            state: 'output-available',
            output: 'REJECTED: No mailbox change was made.',
          });
          return;
        }
        // Certain actions are held for a short cancellation window using the
        // inline PendingActionBar. runDeferredAction owns the entire
        // lifecycle — countdown, actual mutation, and adding the tool output —
        // so the card transitions bar → confirmation without ever falling
        // back to the "Working…" button state.
        //
        // Actions with a bar:
        //   - reply           → success tone (green), we're sending
        //   - delete / move   → destructive tone (red), we're
        //                       relocating/removing from the current folder
        // Archive has no window: it runs at once and is undone from its toast.
        // Live-preview mode (actionsDisabled === true) still runs the plain
        // executeAction path — deferring a simulated action would be silly.
        const canDefer = accountId && actionsDisabled === false && action.messageIds.length > 0;
        if (canDefer && action.action === 'reply') {
          runDeferredAction({
            toolCallId,
            actionType: 'reply',
            tone: 'success',
            label: 'Sending email',
            execute: async () => {
              await replyMutation.mutateAsync({
                accountId,
                messageId: action.messageIds[0]!,
                body: action.body ?? '',
                bodyType: 'html',
                subject: action.subject,
                to: action.to,
                cc: action.cc,
                bcc: action.bcc,
                silent: true,
              });
            },
            successOutput: 'Reply sent successfully.',
            cancelOutput: 'Reply cancelled before it went out.',
            errorFallback: 'The reply failed.',
          });
          return;
        }
        if (canDefer && action.action === 'delete') {
          const targetFolderId = folders.find((folder) => folder.key === 'deleted')?.id;
          const messageIds = [...action.messageIds];
          const bulkSuffix = messageIds.length > 1 ? ` (${messageIds.length} emails)` : '';
          preserveConversationOnThreadChangeRef.current = true;
          runDeferredAction({
            toolCallId,
            actionType: 'delete',
            tone: 'destructive',
            label: messageIds.length > 1 ? 'Deleting emails' : 'Deleting email',
            execute: () =>
              runBulkAgent(messageIds, (messageId) =>
                deleteMutation.mutateAsync({ accountId, messageId, targetFolderId })
              ),
            successOutput: `Email moved to deleted items${bulkSuffix}.`,
            cancelOutput: 'Delete cancelled before anything moved.',
            errorFallback: 'The delete failed.',
          });
          return;
        }
        // Only an archive proposed before this, or reopened from history,
        // still has a card to approve; it runs the same way as a fresh one.
        if (canDefer && action.action === 'archive') {
          await runAgentArchive(toolCallId, action);
          return;
        }
        if (canDefer && action.action === 'move') {
          const target = folders.find(
            (folder) =>
              folder.key?.toLowerCase() === action.targetFolderKey?.toLowerCase() ||
              folder.name.toLowerCase() === action.targetFolderName?.toLowerCase()
          );
          if (!target)
            throw new Error(`I could not find the ${action.targetFolderName ?? 'target'} folder.`);
          const messageIds = [...action.messageIds];
          const bulkSuffix = messageIds.length > 1 ? ` (${messageIds.length} emails)` : '';
          preserveConversationOnThreadChangeRef.current = true;
          runDeferredAction({
            toolCallId,
            actionType: 'move',
            tone: 'destructive',
            label: `Moving to ${target.name}`,
            execute: () =>
              runBulkAgent(messageIds, (messageId) =>
                moveMutation.mutateAsync({ accountId, messageId, folderId: target.id })
              ),
            successOutput: `Email moved to ${target.name}${bulkSuffix}.`,
            cancelOutput: 'Move cancelled before anything moved.',
            errorFallback: 'The move failed.',
          });
          return;
        }
        const result = await withElliotProposal(proposalFor(toolCallId), () =>
          executeAction(action)
        );
        if (result.toLowerCase().includes('simulated successfully')) {
          toast('PREVIEW MODE: EMAIL NOT SENT', {
            description: 'The approved action was simulated for this demo.',
          });
        }
        addToolOutput({
          tool: 'proposeEmailAction',
          toolCallId,
          state: 'output-available',
          output: `SUCCESS: ${result}${result.toLowerCase().includes('simulated successfully') ? ' No mailbox change was made.' : ''}`,
        });
      } catch (actionError) {
        preserveConversationOnThreadChangeRef.current = false;
        addToolOutput({
          tool: 'proposeEmailAction',
          toolCallId,
          state: 'output-error',
          errorText: actionError instanceof Error ? actionError.message : 'The action failed.',
        });
      } finally {
        setPendingApproval(null);
      }
    },
    [
      proposalFor,
      accountId,
      actionsDisabled,
      addToolOutput,
      deleteMutation,
      executeAction,
      folders,
      moveMutation,
      replyMutation,
      runAgentArchive,
      runBulkAgent,
      runDeferredAction,
    ]
  );

  /**
   * "Approve all" / "Reject all" on a batch of mail changes (elli-ui#650).
   *
   * One cancellable countdown covers the whole batch — five seconds per card
   * would make three changes take fifteen — and then each change runs through
   * the same `executeAction` a single card uses, in order, so the rows report
   * as they land. Cancelling in the window rejects every change; nothing has
   * run yet. Preview mode runs at once, as a single card does there.
   */
  const handleBatchDecision = useCallback(
    (items: Array<{ toolCallId: string; action: MockAgentAction }>, approved: boolean) => {
      if (items.length === 0) return;
      if (!approved) {
        for (const { toolCallId } of items) {
          addToolOutput({
            tool: 'proposeEmailAction',
            toolCallId,
            state: 'output-available',
            output: 'REJECTED: No mailbox change was made.',
          });
        }
        return;
      }

      const ids = items.map((item) => item.toolCallId);
      let settled = false;
      const apply = async () => {
        let simulated = false;
        for (const { toolCallId, action } of items) {
          setPendingBatch((prev) =>
            prev
              ? { ...prev, phase: 'sending', activeId: toolCallId, cancel: () => undefined }
              : prev
          );
          try {
            const result = await withElliotProposal(proposalFor(toolCallId), () =>
              executeAction(action)
            );
            const preview = result.toLowerCase().includes('simulated successfully');
            simulated ||= preview;
            addToolOutput({
              tool: 'proposeEmailAction',
              toolCallId,
              state: 'output-available',
              output: `SUCCESS: ${result}${preview ? ' No mailbox change was made.' : ''}`,
            });
          } catch (actionError) {
            addToolOutput({
              tool: 'proposeEmailAction',
              toolCallId,
              state: 'output-error',
              errorText: actionError instanceof Error ? actionError.message : 'The action failed.',
            });
          }
        }
        setPendingBatch(null);
        if (simulated) {
          toast('PREVIEW MODE: NO MAILBOX CHANGE', {
            description: 'The approved changes were simulated for this demo.',
          });
        }
      };

      if (actionsDisabled !== false || !accountId) {
        settled = true;
        setPendingBatch({
          ids,
          startedAt: Date.now(),
          delayMs: 0,
          phase: 'sending',
          activeId: null,
          cancel: () => undefined,
        });
        void apply();
        return;
      }

      const delayMs = 5000;
      const timerId = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        void apply();
      }, delayMs);
      const cancel = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timerId);
        setPendingBatch(null);
        for (const toolCallId of ids) {
          addToolOutput({
            tool: 'proposeEmailAction',
            toolCallId,
            state: 'output-available',
            output: 'REJECTED: Cancelled before anything changed.',
          });
        }
      };
      setPendingBatch({
        ids,
        startedAt: Date.now(),
        delayMs,
        phase: 'countdown',
        activeId: null,
        cancel,
      });
    },
    [accountId, actionsDisabled, addToolOutput, executeAction, proposalFor]
  );

  const materializeScheduleAttachment = useCallback(
    async (
      attachment: ScheduleAttachmentSelection | null | undefined,
      projectId: string
    ): Promise<string | undefined> => {
      if (!attachment) return undefined;
      if (attachment.source === 'existing_file') return attachment.fileId;
      if (attachment.source !== 'email_attachment') return undefined;
      const sourceAccountId = attachment.accountId ?? accountId;
      if (!sourceAccountId) throw new Error('Connect a mailbox before attaching an email file.');

      const attachmentName = attachment.attachmentName;
      try {
        const folderId = await filesApi.getProjectSubFolderId(projectId, 'SCHEDULE');
        const blob = await emailApi.getAttachment(
          sourceAccountId,
          attachment.messageId,
          attachment.attachmentId
        );
        const file = new File([blob], attachmentName, {
          type: blob.type || 'application/octet-stream',
        });
        const uploaded = await uploadManager.enqueueUploadsAndWait(
          [
            {
              file,
              data: {
                name: attachmentName,
                parentId: folderId,
                mimeType: file.type || undefined,
                size: file.size,
              },
            },
          ],
          { label: `Schedule attachment: ${attachmentName}` }
        );
        const [fileItem] = uploaded;
        if (!fileItem?.id) {
          throw new Error('The attachment upload finished without a file id.');
        }
        return fileItem.id;
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'unknown error';
        throw new Error(
          `Couldn't attach ${attachmentName} from email (${reason}). The schedule entry was not created. Try again without an attachment, then use the Attach button on the card to upload the file from your computer.`,
          { cause: error }
        );
      }
    },
    [accountId, uploadManager]
  );

  const uploadLocalFileForSchedule = useCallback(
    async (file: File, projectId: string): Promise<{ fileId: string; fileName: string }> => {
      const folderId = await filesApi.getProjectSubFolderId(projectId, 'SCHEDULE');
      const uploaded = await uploadManager.enqueueUploadsAndWait(
        [
          {
            file,
            data: {
              name: file.name,
              parentId: folderId,
              mimeType: file.type || undefined,
              size: file.size,
            },
          },
        ],
        { label: `Schedule attachment: ${file.name}` }
      );
      const [fileItem] = uploaded;
      if (!fileItem?.id) throw new Error('The file could not be uploaded.');
      return { fileId: fileItem.id, fileName: file.name };
    },
    [uploadManager]
  );

  const uploadLocalFileForQuote = useCallback(
    async (
      file: File,
      projectId: string,
      rfqId: string
    ): Promise<{ fileId: string; fileName: string }> => {
      const folderId = await filesApi.getProjectEntityFolderId(projectId, 'RFQ', rfqId);
      const uploaded = await uploadManager.enqueueUploadsAndWait(
        [
          {
            file,
            data: {
              name: file.name,
              parentId: folderId,
              mimeType: file.type || undefined,
              size: file.size,
            },
          },
        ],
        { label: `Quote attachment: ${file.name}` }
      );
      const [fileItem] = uploaded;
      if (!fileItem?.id) throw new Error('The file could not be uploaded.');
      return { fileId: fileItem.id, fileName: file.name };
    },
    [uploadManager]
  );

  const materializeQuoteAttachment = useCallback(
    async (
      attachment: ScheduleAttachmentSelection | null | undefined,
      projectId: string,
      rfqId: string
    ): Promise<string | undefined> => {
      if (!attachment) return undefined;
      if (attachment.source === 'existing_file') return attachment.fileId;
      if (attachment.source !== 'email_attachment') return undefined;
      const sourceAccountId = attachment.accountId ?? accountId;
      if (!sourceAccountId) throw new Error('Connect a mailbox before attaching an email file.');

      const attachmentName = attachment.attachmentName;
      try {
        const folderId = await filesApi.getProjectEntityFolderId(projectId, 'RFQ', rfqId);
        const blob = await emailApi.getAttachment(
          sourceAccountId,
          attachment.messageId,
          attachment.attachmentId
        );
        const file = new File([blob], attachmentName, {
          type: blob.type || 'application/octet-stream',
        });
        const uploaded = await uploadManager.enqueueUploadsAndWait(
          [
            {
              file,
              data: {
                name: attachmentName,
                parentId: folderId,
                mimeType: file.type || undefined,
                size: file.size,
              },
            },
          ],
          { label: `Quote attachment: ${attachmentName}` }
        );
        const [fileItem] = uploaded;
        if (!fileItem?.id) {
          throw new Error('The attachment upload finished without a file id.');
        }
        return fileItem.id;
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'unknown error';
        throw new Error(
          `Couldn't attach ${attachmentName} from email (${reason}). The quote was not submitted. Try again without an attachment, then use the Attach button on the card to upload the file from your computer.`,
          { cause: error }
        );
      }
    },
    [accountId, uploadManager]
  );

  const executeRfqAction = useCallback(
    async (action: RfqAgentAction): Promise<string> => {
      if (action.action === 'remove_quote') {
        await removeQuoteMutation.mutateAsync({ rfqId: action.rfqId, id: action.quoteId });
        return `Quote from ${action.vendorName} on ${action.rfqNumber} removed.`;
      }
      if (action.action === 'remove_vendor') {
        await removeVendorMutation.mutateAsync({ rfqId: action.rfqId, quoteId: action.quoteId });
        return `${action.vendorName} removed from ${action.rfqNumber}.`;
      }
      if (action.action === 'publish_rfq') {
        const vendors = action.vendors ?? [];
        if (vendors.length === 0) {
          throw new Error('Add at least one vendor to invite before publishing.');
        }
        // Mirrors the existing rfq-detail Publish & Invite flow: publish
        // first, then invite each vendor (silent so we don't fire 20 toasts).
        // The publish step itself is a no-op when the RFQ is already
        // PUBLISHED; if it does fail for another reason, throwing here stops
        // the flow before we touch any vendor rows.
        await publishRfqMutation.mutateAsync(action.rfqId);

        // Use allSettled so a benign 409 ("Vendor already added to this RFQ")
        // doesn't undo the whole approval. Split fulfilled / benign / hard
        // failures so we can summarize accurately.
        const results = await Promise.allSettled(
          vendors.map((vendor) =>
            addVendorMutation.mutateAsync({
              rfqId: action.rfqId,
              vendorId: vendor.vendorId,
              silent: true,
            })
          )
        );

        let invited = 0;
        let alreadyPresent = 0;
        const hardFailures: string[] = [];
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            invited += 1;
            return;
          }
          if (isVendorAlreadyAddedError(result.reason)) {
            alreadyPresent += 1;
            return;
          }
          hardFailures.push(vendors[index]?.vendorName ?? 'a vendor');
        });

        if (hardFailures.length > 0) {
          // Publish succeeded; report both facts so the user knows the RFQ is
          // live and which invites still need attention.
          throw new Error(
            `${action.rfqNumber} is published, but couldn't invite ${hardFailures.join(', ')}. Try again from the RFQ page.`
          );
        }

        const parts: string[] = [];
        if (invited > 0) parts.push(`${invited} vendor${invited === 1 ? '' : 's'} invited`);
        if (alreadyPresent > 0) {
          parts.push(`${alreadyPresent} already on the RFQ`);
        }
        return `${action.rfqNumber} published${parts.length ? ` — ${parts.join(', ')}` : ''}.`;
      }
      // upload_quote — a new quote, or (mode 'edit') one already submitted
      const blocker = quoteActionBlocker({
        mode: action.mode,
        quotedAmount: action.quotedAmount,
        hasNewAttachment: !!action.attachment,
        existingAttachments: action.existingAttachments,
      });
      if (blocker) throw new Error(blocker);
      const newFileId = action.attachment
        ? await materializeQuoteAttachment(action.attachment, action.projectId, action.rfqId)
        : null;
      const attachments = quoteAttachmentIds(action.existingAttachments, newFileId);
      if (attachments.length === 0) {
        throw new Error('Attach a file before submitting this quote.');
      }
      const data = {
        id: action.quoteId,
        quotedAmount: action.quotedAmount ?? 0,
        negotiationAmount: action.negotiationAmount ?? null,
        leadTime: action.leadTimeDays ? `${action.leadTimeDays} days` : undefined,
        attachments,
      };
      if (isQuoteEdit(action)) {
        await editQuoteMutation.mutateAsync({ rfqId: action.rfqId, data });
        return `Quote from ${action.vendorName} on ${action.rfqNumber} updated.`;
      }
      await submitQuoteMutation.mutateAsync({ rfqId: action.rfqId, data });
      return `Quote from ${action.vendorName} on ${action.rfqNumber} submitted.`;
    },
    [
      addVendorMutation,
      materializeQuoteAttachment,
      publishRfqMutation,
      removeQuoteMutation,
      removeVendorMutation,
      submitQuoteMutation,
      editQuoteMutation,
    ]
  );

  const handleRfqActionApproval = useCallback(
    async (toolCallId: string, action: RfqAgentAction, approved: boolean) => {
      setPendingApproval({ id: toolCallId, approved });
      try {
        if (!approved) {
          const rejected =
            action.action === 'upload_quote'
              ? 'REJECTED: No quote was submitted.'
              : action.action === 'remove_quote'
                ? 'REJECTED: The quote was not removed.'
                : action.action === 'remove_vendor'
                  ? 'REJECTED: The vendor was not removed.'
                  : 'REJECTED: The RFQ was not published.';
          addToolOutput({
            tool: 'proposeUploadRfqQuote',
            toolCallId,
            state: 'output-available',
            output: rejected,
          });
          return;
        }
        const result = await withElliotProposal(proposalFor(toolCallId), () =>
          executeRfqAction(action)
        );
        addToolOutput({
          tool: 'proposeUploadRfqQuote',
          toolCallId,
          state: 'output-available',
          output: `SUCCESS: ${result}`,
        });
      } catch (actionError) {
        const fallback =
          action.action === 'upload_quote'
            ? 'The quote submission failed.'
            : action.action === 'remove_quote'
              ? 'Removing the quote failed.'
              : action.action === 'remove_vendor'
                ? 'Removing the vendor failed.'
                : 'Publishing the RFQ failed.';
        const message =
          actionError instanceof Error && actionError.message.startsWith("Couldn't attach ")
            ? actionError.message
            : getApiErrorMessage(actionError, fallback);
        toast.error(message);
        addToolOutput({
          tool: 'proposeUploadRfqQuote',
          toolCallId,
          state: 'output-error',
          errorText: message,
        });
      } finally {
        setPendingApproval(null);
      }
    },
    [addToolOutput, executeRfqAction, proposalFor]
  );

  const executeScheduleAction = useCallback(
    async (action: ScheduleAgentAction): Promise<string> => {
      if (action.action === 'remove_schedule') {
        await deleteScheduleMutation.mutateAsync({
          projectId: action.projectId,
          id: action.scheduleId,
        });
        return `Schedule entry removed from ${action.projectName ?? 'the project'}.`;
      }

      const fileId = await materializeScheduleAttachment(action.attachment, action.projectId);

      if (action.action === 'add_schedule') {
        if (!fileId) {
          // The card disables Approve without an attachment, but guard here so
          // the mutation type (fileId: string) is honoured and any race is
          // caught with a clear message instead of a Zod 400 from the server.
          throw new Error('Attach a file before creating this schedule entry.');
        }
        await createScheduleMutation.mutateAsync({
          projectId: action.projectId,
          date: action.date,
          description: action.description,
          adjustedFinishDate: action.adjustedFinishDate ?? undefined,
          notes: action.notes ?? undefined,
          fileId,
          primeChangeOrderId: action.primeChangeOrderId ?? undefined,
        });
        return `Schedule entry added to ${action.projectName ?? 'the project'}.`;
      }

      await updateScheduleMutation.mutateAsync({
        projectId: action.projectId,
        id: action.scheduleId,
        date: action.date,
        description: action.description,
        adjustedFinishDate: action.adjustedFinishDate ?? undefined,
        notes: action.notes ?? undefined,
        fileId: fileId ?? undefined,
        primeChangeOrderId: action.primeChangeOrderId ?? null,
      });
      return `Schedule entry updated in ${action.projectName ?? 'the project'}.`;
    },
    [
      createScheduleMutation,
      deleteScheduleMutation,
      materializeScheduleAttachment,
      updateScheduleMutation,
    ]
  );

  const handleScheduleApproval = useCallback(
    async (toolCallId: string, action: ScheduleAgentAction, approved: boolean) => {
      setPendingApproval({ id: toolCallId, approved });
      try {
        if (!approved) {
          addToolOutput({
            tool: 'proposeProjectScheduleAction',
            toolCallId,
            state: 'output-available',
            output: 'REJECTED: No schedule change was made.',
          });
          return;
        }
        const result = await withElliotProposal(proposalFor(toolCallId), () =>
          executeScheduleAction(action)
        );
        addToolOutput({
          tool: 'proposeProjectScheduleAction',
          toolCallId,
          state: 'output-available',
          output: `SUCCESS: ${result}`,
        });
      } catch (actionError) {
        // Prefer an axios-derived message (e.g. server 400 payload) — falls back
        // to the Error message for our own thrown strings.
        const message =
          actionError instanceof Error && actionError.message.startsWith("Couldn't attach ")
            ? actionError.message
            : getApiErrorMessage(actionError, 'The schedule action failed.');
        toast.error(message);
        addToolOutput({
          tool: 'proposeProjectScheduleAction',
          toolCallId,
          state: 'output-error',
          errorText: message,
        });
      } finally {
        setPendingApproval(null);
      }
    },
    [addToolOutput, executeScheduleAction, proposalFor]
  );

  const handleRecordApproval = useCallback(
    async (toolCallId: string, action: RecordAgentAction, approved: boolean) => {
      const copy = recordActionCopy(action.action);
      setPendingApproval({ id: toolCallId, approved });
      try {
        if (!approved) {
          addToolOutput({
            tool: RECORD_TOOL_NAME,
            toolCallId,
            state: 'output-available',
            output: copy.rejectedOutput,
          });
          return;
        }
        const result = await withElliotProposal(proposalFor(toolCallId), () =>
          executeRecordAction(action)
        );
        if (result.warning) toast.warning(result.warning);
        addToolOutput({
          tool: RECORD_TOOL_NAME,
          toolCallId,
          state: 'output-available',
          output: `SUCCESS: ${result.output}${result.warning ? ` ${result.warning}` : ''}`,
        });
      } catch (actionError) {
        // The mutation hooks toast their own API failures; a file that would
        // not attach is ours to report.
        const isAttachError =
          actionError instanceof Error && actionError.message.startsWith("Couldn't attach ");
        const message = isAttachError
          ? actionError.message
          : getApiErrorMessage(actionError, copy.failureFallback);
        if (isAttachError) toast.error(message);
        addToolOutput({
          tool: RECORD_TOOL_NAME,
          toolCallId,
          state: 'output-error',
          errorText: message,
        });
      } finally {
        setPendingApproval(null);
      }
    },
    [addToolOutput, executeRecordAction, proposalFor]
  );

  // A thread whose body is still on its way would reach Elliot as a preview.
  const bodiesLoading = [...threadBodies.values()].some((state) => state.status === 'loading');
  const sendBlocked =
    sendBlockedReason(status, messages[messages.length - 1]) ??
    (bodiesLoading ? 'Loading the emails in context…' : null);
  // The composer stays open while a card waits: typing asks Elliot to change it.
  const composerBlocked =
    status === 'submitted' || status === 'streaming'
      ? 'Elliot is still working.'
      : bodiesLoading
        ? 'Loading the emails in context…'
        : null;
  const composerHint = pendingQuestion(messages[messages.length - 1])
    ? 'Pick an option above and confirm, or type your answer.'
    : null;
  // What the reader might ask next, once Elliot has finished an answer
  // (elli-ui#1035). Asked once per answer; a newer answer replaces them.
  const followUpKey = followUpAnchor(status, messages);
  const followUps = useFollowUpSuggestions(
    followUpKey,
    messages,
    threadsInContext.map((thread) => thread.subject)
  );
  // Not while a run is stepping through emails, or while Elliot is asking which
  // email: the chips would answer a different question.
  const showFollowUps = followUps.length > 0 && !actionQueue && !whichEmail && !noThreadNotice;
  /** One thread, or several to work through one at a time. */
  const startFor = (question: WhichEmailQuestion, picked: ContextThread[]) => {
    const [first] = picked;
    if (!first) return;
    if (picked.length > 1) {
      setActionQueue({
        label: question.label,
        template: question.template,
        threadIds: picked.map((thread) => thread.id),
        index: 0,
        sentAt: messages.length,
      });
    }
    startEmailAction(fillEmailPrompt(question.template, first), first);
  };
  // Once a step is decided and answered, the next thread goes out.
  useEffect(() => {
    if (!actionQueue) return;
    const step = queueStep(actionQueue, status, messages);
    if (step === 'wait' || (step === 'advance' && bodiesLoading)) return;
    // Reacting to the chat settling, not to a click: the step runs after this
    // render rather than inside it.
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (step === 'done') {
        setActionQueue(null);
        return;
      }
      const next = actionQueue.index + 1;
      const thread = threadsInContext.find((item) => item.id === actionQueue.threadIds[next]);
      if (!thread) {
        setActionQueue(null);
        return;
      }
      setActionQueue({ ...actionQueue, index: next, sentAt: messages.length });
      setPaneEmailId(thread.id);
      latestMentionsRef.current = [];
      latestRecordsRef.current = [];
      void sendMessage({ text: fillEmailPrompt(actionQueue.template, thread) });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionQueue, status, messages.length, bodiesLoading]);

  /** An email-bound prompt from a button; the pane shows the thread it is about. */
  const startEmailAction = (prompt: string, thread?: ContextThread) => {
    if (sendBlocked) return;
    setWhichEmail(null);
    setNoThreadNotice(null);
    if (thread) {
      setPaneEmailId(thread.id);
      setShowEmailPane(true);
    }
    latestMentionsRef.current = [];
    latestRecordsRef.current = [];
    void sendMessage({ text: prompt });
  };
  useDismissOnOutside(contextOpen, contextPopoverRef, () => setContextOpen(false));
  // The answer is the call's result; `sendAutomaticallyWhen` then sends the
  // turn back to Elliot, which picks the task up where it stopped.
  const answerQuestion = (toolCallId: string, answer: string) => {
    if (status === 'submitted' || status === 'streaming' || !answer.trim()) return;
    void addToolOutput({
      tool: ASK_TOOL_NAME,
      toolCallId,
      state: 'output-available',
      output: answerOutput(answer),
    });
  };
  const handleSubmit = ({ text }: { text: string }) => {
    const nextPrompt = text.trim();
    if (!nextPrompt || status === 'submitted' || status === 'streaming') return;
    // Elliot asked something mid-task: what is typed is the answer, and the
    // task carries on from it.
    const question = pendingQuestion(messages[messages.length - 1]);
    if (question) {
      answerQuestion(question.toolCallId, nextPrompt);
      return;
    }
    // A card is waiting: the message is a change request for it, not a new
    // topic. The card is answered with it so Elliot can propose a new version.
    if (awaitsDecision(messages[messages.length - 1])) {
      setMessages(withPendingRevised(messages, nextPrompt));
      latestMentionsRef.current = [];
      latestRecordsRef.current = [];
      void sendMessage({ text: nextPrompt });
      return;
    }
    // An answer to Elliot's question stays in the run; anything else of your
    // own takes over from it.
    if (!elliotAskedQuestion(messages[messages.length - 1])) setActionQueue(null);
    // A mail request with no mail in the chat: ask for one rather than send it.
    if (
      needsAThread(nextPrompt, threadsInContext.length) &&
      !elliotAskedQuestion(messages[messages.length - 1])
    ) {
      setNoThreadNotice(nextPrompt);
      return;
    }
    // A request about mail, with several threads in context and nothing to say
    // which: ask, rather than let Elliot pick one. Answers and asides go as is.
    if (
      pendingMentions.length === 0 &&
      threadsInContext.length > 1 &&
      isEmailRequest(nextPrompt, messages[messages.length - 1])
    ) {
      setWhichEmail({
        label: `“${nextPrompt}”`,
        template: `${nextPrompt} (about {email})`,
        raw: nextPrompt,
        multi: true,
      });
      return;
    }
    const mentions = pendingMentions;
    const records = draftRecordMentions;
    if (draftMentionContextIds.length > 0) {
      setSelectedContextIds((current) => [...new Set([...current, ...draftMentionContextIds])]);
      setDraftMentionContextIds([]);
    }
    setDraftRecordMentions([]);
    latestMentionsRef.current = mentions;
    latestRecordsRef.current = records;
    const metadata = {
      ...(mentions.length ? { mentions } : {}),
      ...(records.length ? { records } : {}),
    };
    void sendMessage(
      Object.keys(metadata).length ? { text: nextPrompt, metadata } : { text: nextPrompt }
    );
  };

  const enterFullscreen = () => {
    setFullscreen(true);
    onRequestMailboxCollapse?.();
    // Full screen is the whole window: tuck the app sidebar away too, and put
    // it back on the way out only if it was Elliot that hid it.
    if (isSidebarOpen) {
      restoreSidebarRef.current = true;
      setSidebarOpen(false);
    }
  };
  const restoreSidebar = () => {
    if (!restoreSidebarRef.current) return;
    restoreSidebarRef.current = false;
    setSidebarOpen(true);
  };
  const leaveFullscreen = () => {
    setFullscreen(false);
    restoreSidebar();
  };

  // One button for the panel's size (elli-ui#1370): small over the mailbox,
  // half the window beside it, or the whole window.
  const panelSize = agentPanelSize({ fullscreen, width });
  // On a phone the panel already fills the screen, so there is no half width.
  const panelSizes: AgentPanelSize[] = isMobile ? ['small', 'full'] : ['small', 'half', 'full'];
  const changePanelSize = (next: AgentPanelSize) => {
    if (next === panelSize) return;
    if (next === 'full') {
      enterFullscreen();
      return;
    }
    if (fullscreen) leaveFullscreen();
    if (next === 'small') {
      setWidth(DEFAULT_WIDTH);
      return;
    }
    setWidth(halfPanelWidth(panelRef.current?.parentElement?.clientWidth ?? 0));
    onRequestMailboxCollapse?.();
  };

  const handleMentionHit = async (hit: EmailMessageSearchResult) => {
    if (!accountId) return;
    try {
      const message = await emailApi.getMessage(accountId, hit.providerId);
      const item: EmailListItem = {
        ...message,
        mailbox: accountId,
        folderKey: message.folder,
        folder: message.folderId ?? message.folder,
        latestMessageId: message.id,
      };
      setFetchedMails((current) => ({
        accountId,
        items: [
          ...(current.accountId === accountId ? current.items : []).filter(
            (existing) => existing.id !== item.id
          ),
          item,
        ],
      }));
      handleMentionSelect(item);
    } catch {
      toast.error("Couldn't add that email. Try again.");
    }
  };
  const removePendingMention = (id: string) => {
    setDraftMentionContextIds((current) => current.filter((mentionId) => mentionId !== id));
  };
  const handleRecordSelect = (record: RecordMention) => {
    setDraftRecordMentions((current) => withRecordMention(current, record));
  };
  const removeRecordMention = (record: RecordMention) => {
    const key = recordMentionKey(record);
    setDraftRecordMentions((current) => current.filter((item) => recordMentionKey(item) !== key));
  };
  const handleMentionSelect = (item: EmailListItem) => {
    setDraftMentionContextIds((current) =>
      current.includes(item.id) ? current : [...current, item.id]
    );
  };

  const selectedContextEmails = contextEmails.filter((item) =>
    selectedContextIds.includes(item.id)
  );
  const mentionLabels = useMemo(
    () => [
      ...new Set(
        [email?.subject, ...contextEmails.map((item) => item.subject)].filter(
          (subject): subject is string => Boolean(subject)
        )
      ),
    ],
    [contextEmails, email?.subject]
  );

  return (
    <aside
      ref={panelRef}
      className={cn(
        'absolute right-0 z-30 flex min-h-0 overflow-hidden border border-border bg-card text-foreground',
        fullscreen
          ? 'flex-row border-0 shadow-none'
          : pushesContent
            ? 'flex-col border-y-0 border-r-0 shadow-none'
            : 'flex-col rounded-md shadow-xl',
        // Side panel ↔ wide ↔ full screen slide between their widths.
        !isResizing &&
          'motion-safe:transition-[width,top,bottom,box-shadow,border-radius] motion-safe:duration-200 motion-safe:ease-out',
        // Opening slides in from the right; closing slides back out, and the
        // mailbox keeps the panel mounted just long enough for that.
        open
          ? 'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-8'
          : 'pointer-events-none motion-safe:animate-out motion-safe:fade-out-0 motion-safe:slide-out-to-right-8 motion-safe:fill-mode-forwards',
        'motion-reduce:transition-none'
      )}
      style={
        fullscreen
          ? { width: '100%', top: 0, bottom: 0 }
          : { width: cssWidth, top: pushesContent ? 0 : 12, bottom: pushesContent ? 0 : 12 }
      }
      aria-label="Elliot Agent"
      onKeyDown={(event) => {
        if (fullscreen && event.key === 'Escape' && !event.defaultPrevented) leaveFullscreen();
      }}
    >
      {canResize && (
        <button
          type="button"
          className="absolute inset-y-0 -left-1.5 z-20 flex w-3 cursor-col-resize items-center justify-center border-l border-transparent text-muted-foreground hover:border-primary/40 hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Resize Elliot Agent"
          onPointerDown={handleResizeStart}
        >
          <GripVertical aria-hidden="true" className="size-3.5" />
        </button>
      )}

      {!isElliotAgentDisabled ? (
        // In full screen the rail sits beside the chat (a drawer below md). In
        // the side panel it is a drawer over the chat, opened from the header
        // (elli-ui#1370) — and inert while closed, so Tab never lands in it.
        <div className="contents" inert={!fullscreen && !railDrawerOpen}>
          {railBackdropShown ? (
            <button
              type="button"
              aria-label="Close chats"
              tabIndex={-1}
              className={cn(
                // Above the conversation's top fade (z-10), which otherwise drew
                // a white glow over the dimmed chat.
                'absolute inset-0 z-20 bg-black/30 motion-safe:duration-200',
                fullscreen && 'md:hidden',
                railDrawerOpen
                  ? 'motion-safe:animate-in motion-safe:fade-in-0'
                  : 'pointer-events-none motion-safe:animate-out motion-safe:fade-out-0 motion-safe:fill-mode-forwards'
              )}
              onClick={() => setRailDrawerOpen(false)}
            />
          ) : null}
          <AgentFullscreenRail
            className={cn(
              fullscreen
                ? [
                    // Below md the rail is a drawer: always there, slid off the left
                    // edge until opened, so opening and closing are one motion.
                    'max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-30 max-md:bg-card',
                    'max-md:transition-transform max-md:duration-200 max-md:ease-out motion-reduce:transition-none',
                    // The shadow only while open: slid off the edge, it still bled
                    // into the chat as a grey band down the left (elli-ui#1401).
                    railDrawerOpen
                      ? 'max-md:translate-x-0 max-md:shadow-2xl'
                      : 'max-md:pointer-events-none max-md:-translate-x-full',
                  ]
                : [
                    'absolute inset-y-0 left-0 z-30 max-w-[85%] bg-card',
                    'transition-transform duration-200 ease-out motion-reduce:transition-none',
                    railDrawerOpen
                      ? 'translate-x-0 shadow-2xl'
                      : 'pointer-events-none -translate-x-full',
                  ]
            )}
            // As a drawer the rail is always the full one, and "collapse" closes it.
            collapsed={fullscreen && !railDrawerOpen ? railCollapsed : false}
            onToggleCollapsed={() =>
              railDrawerOpen ? setRailDrawerOpen(false) : setRailCollapsed((value) => !value)
            }
            threads={threadsInContext}
            canStartNew={messages.length > 0}
            onNewChat={() => {
              setRailDrawerOpen(false);
              handleNewConversation();
            }}
            blockedReason={sendBlocked}
            onStart={(prompt, thread) => {
              setRailDrawerOpen(false);
              startEmailAction(prompt, thread);
            }}
            onAskWhich={(question) => {
              setRailDrawerOpen(false);
              setWhichEmail(question);
            }}
            history={history}
            historyLoading={historyLoading}
            search={historySearch}
            onSearchChange={setHistorySearch}
            activeConversationId={conversationId}
            loadingConversationId={loadingConversationId}
            onRenameConversation={(id, title) => void renameConversation(id, title)}
            onSelectConversation={(id) => {
              setRailDrawerOpen(false);
              void handleLoadConversation(id);
            }}
          />
        </div>
      ) : null}
      {/* Popovers inside anchor to this column, not to the rail or the email pane. */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {fullscreen ? (
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
            <span className="md:hidden">
              <IconButton label="Show chats" onClick={() => setRailDrawerOpen(true)}>
                <PanelLeftOpen className="size-4" />
              </IconButton>
            </span>
            <AgentChatHeaderTitle
              title={chatHeaderTitle({ conversationId, liveTitles, history })}
              editable={Boolean(conversationId)}
              onRename={(title) => conversationId && void renameConversation(conversationId, title)}
              className="-ml-2"
            />
            <span className="flex-1" />
            {email && !isElliotAgentDisabled ? (
              <Button
                type="button"
                variant={showEmailPane ? 'secondary' : 'outline'}
                size="sm"
                aria-pressed={showEmailPane}
                onClick={() => setShowEmailPane((value) => !value)}
              >
                <Mail className="size-3.5" aria-hidden />
                <span className="hidden sm:inline">
                  {showEmailPane ? 'Hide email' : 'Show email'}
                </span>
              </Button>
            ) : null}
            <AgentSizeMenu size={panelSize} sizes={panelSizes} onChange={changePanelSize} />
            <IconButton label="Close Elliot Agent" onClick={() => onOpenChange(false)}>
              <X className="size-4" />
            </IconButton>
          </div>
        ) : (
          <header className="flex h-14 shrink-0 items-center gap-1 border-b border-border px-2">
            {isElliotAgentDisabled ? null : (
              <IconButton label="Show chats" onClick={() => setRailDrawerOpen(true)}>
                <PanelLeftOpen className="size-4" />
              </IconButton>
            )}
            <img
              src="/favicon/apple-touch-icon.png"
              alt=""
              aria-hidden="true"
              className="ml-1 size-5 shrink-0 rounded-sm object-contain"
            />
            <AgentChatHeaderTitle
              title={
                isElliotAgentDisabled
                  ? 'Elliot Agent'
                  : chatHeaderTitle({ conversationId, liveTitles, history })
              }
              editable={!isElliotAgentDisabled && Boolean(conversationId)}
              onRename={(title) => conversationId && void renameConversation(conversationId, title)}
            />
            {/* The name renames on click (elli-ui#1410); the chevron beside it
                opens earlier chats (elli-ui#1414). */}
            {isElliotAgentDisabled ? null : (
              <AgentChatHistoryMenu
                history={history}
                liveTitles={liveTitles}
                loading={historyLoading}
                activeConversationId={conversationId}
                loadingConversationId={loadingConversationId}
                onSelect={(id) => void handleLoadConversation(id)}
              />
            )}
            <span className="flex-1" />
            {!isElliotAgentDisabled && messages.length > 0 ? (
              <span className="flex motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200">
                <IconButton label="Start a new chat" onClick={handleNewConversation}>
                  <PenNewRoundIcon className="size-[18px]" aria-hidden />
                </IconButton>
              </span>
            ) : null}
            <AgentSizeMenu size={panelSize} sizes={panelSizes} onChange={changePanelSize} />
            <IconButton label="Close Elliot Agent" onClick={() => onOpenChange(false)}>
              <X className="size-4" />
            </IconButton>
          </header>
        )}

        {isElliotAgentDisabled ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <span
              aria-hidden="true"
              className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary"
            >
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <p className="text-base font-semibold tracking-tight">Elliot Agent is warming up</p>
            <p className="max-w-64 text-sm leading-6 text-muted-foreground">
              We’re sharpening Elliot’s instincts behind the scenes. Check back soon.
            </p>
          </div>
        ) : (
          <>
            <div className="flex min-h-0 flex-1 flex-col">
              {contextOpen && (
                <div
                  ref={contextPopoverRef}
                  className="absolute left-3 right-3 top-2 z-40 rounded-lg border border-border bg-background p-3 shadow-xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-150"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">Add inbox threads</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setIncludeActiveContext(false);
                          setSelectedContextIds([]);
                        }}
                      >
                        Clear all
                      </button>
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => setContextOpen(false)}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                  <label className="relative block">
                    <span className="sr-only">Search inbox threads</span>
                    <Search
                      className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={contextSearch}
                      onChange={(event) => setContextSearch(event.target.value)}
                      placeholder="Search subject or sender"
                      className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                  <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                    {contextEmails.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No other loaded threads are available.
                      </p>
                    ) : (
                      <>
                        {email ? (
                          <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent">
                            <input
                              type="checkbox"
                              className="mt-0.5 size-4 accent-primary"
                              checked={includeActiveContext}
                              onChange={(event) => setIncludeActiveContext(event.target.checked)}
                            />
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{email.subject}</span>
                              <span className="block truncate text-muted-foreground">
                                {email.senderName} · open now
                              </span>
                            </span>
                          </label>
                        ) : null}
                        {contextEmails
                          .filter((item) => item.id !== email?.id)
                          .filter((item) =>
                            `${item.subject} ${item.senderName} ${item.senderEmail} ${item.preview}`
                              .toLowerCase()
                              .includes(contextSearch.trim().toLowerCase())
                          )
                          .map((item) => (
                            <label
                              key={item.id}
                              className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent"
                            >
                              <input
                                type="checkbox"
                                className="mt-0.5 size-4 accent-primary"
                                checked={selectedContextIds.includes(item.id)}
                                onChange={(event) =>
                                  setSelectedContextIds((current) =>
                                    event.target.checked
                                      ? [...current, item.id]
                                      : current.filter((id) => id !== item.id)
                                  )
                                }
                              />
                              <span className="min-w-0">
                                <span className="block truncate font-medium">{item.subject}</span>
                                <span className="block truncate text-muted-foreground">
                                  {item.senderName}
                                </span>
                              </span>
                            </label>
                          ))}
                      </>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    You can attach multiple threads to this chat. Elliot will use all selected
                    references.
                  </p>
                </div>
              )}

              <Conversation className="mock-agent-conversation min-h-0 flex-1">
                {/* Text scrolling up fades out under the header instead of
                    being cut off at its edge. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 z-10 h-5 bg-linear-to-b from-card to-transparent"
                />
                <ConversationContent
                  className={cn(
                    'min-h-full gap-5 px-4 py-4 pr-10',
                    fullscreen && 'mx-auto w-full max-w-3xl px-6 pr-10'
                  )}
                >
                  {messages.length === 0 ? (
                    <div className="flex min-h-full flex-col justify-center gap-8 py-6">
                      <div className="space-y-2.5 text-center">
                        <span
                          aria-hidden="true"
                          className={cn(
                            'mx-auto grid size-11 place-items-center rounded-full bg-primary/10 text-primary transition-colors',
                            suggestionsLoading && 'motion-safe:animate-pulse',
                            hasSuggestions && 'bg-primary/15'
                          )}
                        >
                          <Sparkles className="size-5" aria-hidden="true" />
                        </span>
                        <p className="text-lg font-semibold tracking-tight">
                          What should Elliot help with?
                        </p>
                        <p className="mx-auto max-w-72 text-sm leading-6 text-muted-foreground">
                          Elliot can draft replies and prepare mailbox actions. You approve every
                          change.
                        </p>
                      </div>

                      {/* Screen readers hear the state; sighted users see the icon pulse and the chips swap. */}
                      <span className="sr-only" aria-live="polite">
                        {suggestionsLoading
                          ? 'Reading this email for what Elliot can do'
                          : hasSuggestions
                            ? 'Suggested for this email'
                            : ''}
                      </span>
                      <div
                        key={suggestionsKey}
                        className={cn(
                          'flex flex-col gap-2',
                          'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300',
                          fullscreen && 'sm:grid sm:grid-cols-3'
                        )}
                      >
                        {suggestions.map(({ label, icon: Icon, template, multi, ...rest }) => (
                          <EmailActionChooser
                            key={label}
                            label={label}
                            template={template}
                            multi={multi}
                            threads={threadsInContext}
                            blockedReason={sendBlocked}
                            onStart={startEmailAction}
                            onAskWhich={setWhichEmail}
                          >
                            {(props) => (
                              <button
                                type="button"
                                className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-colors hover:border-primary/30 hover:bg-accent/60 disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-card focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent/60"
                                {...props}
                              >
                                <span
                                  aria-hidden="true"
                                  className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary/15"
                                >
                                  <Icon className="size-3.5" aria-hidden="true" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-xs font-medium leading-5 text-foreground">
                                    {label}
                                  </span>
                                  {'reason' in rest &&
                                  typeof rest.reason === 'string' &&
                                  rest.reason ? (
                                    <span className="block truncate text-[11px] leading-4 text-muted-foreground">
                                      {rest.reason}
                                    </span>
                                  ) : null}
                                </span>
                                {'source' in rest && rest.source === 'model' ? (
                                  <span
                                    className="shrink-0 text-primary/70"
                                    title="Suggested by Elliot"
                                  >
                                    <Sparkles className="size-3.5" aria-hidden="true" />
                                    <span className="sr-only">Suggested by Elliot</span>
                                  </span>
                                ) : null}
                              </button>
                            )}
                          </EmailActionChooser>
                        ))}
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span aria-hidden="true" className="h-px flex-1 bg-border" />
                          <p className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            Quick commands
                          </p>
                          <span aria-hidden="true" className="h-px flex-1 bg-border" />
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                          {QUICK_COMMANDS.map(({ command, label, template, multi }) => (
                            <EmailActionChooser
                              key={command}
                              label={label}
                              template={template}
                              multi={multi}
                              threads={threadsInContext}
                              blockedReason={sendBlocked}
                              onStart={startEmailAction}
                              onAskWhich={setWhichEmail}
                            >
                              {(props) => (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 py-1.5 pl-1.5 pr-3 text-[11px] text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent hover:text-foreground disabled:opacity-50 data-[state=open]:bg-accent"
                                  {...props}
                                >
                                  <span className="rounded-full bg-background px-1.5 py-0.5 font-mono text-primary">
                                    {command}
                                  </span>
                                  {label}
                                </button>
                              )}
                            </EmailActionChooser>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // `relative` anchors the thinking line as it pops out of flow.
                    <div className="relative space-y-5" aria-live="polite">
                      {/* Keyed by conversation: opening one from history shows it
                          whole; only turns added afterwards animate in. */}
                      <AnimatePresence key={conversationId ?? 'new'} initial={false}>
                        {messages.map((message, index) => (
                          <motion.div
                            key={message.id}
                            ref={(element) => {
                              messageRefs.current[message.id] = element;
                            }}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={enterTransition}
                          >
                            {/* A run of replies is one turn: name it once. */}
                            {message.role === 'assistant' &&
                            messages[index - 1]?.role !== 'assistant' ? (
                              <AgentReplyHeader />
                            ) : null}
                            <AgentMessage
                              message={message}
                              live={
                                index === messages.length - 1 &&
                                message.role === 'assistant' &&
                                (status === 'streaming' || status === 'submitted')
                              }
                              mentionLabels={mentionLabels}
                              drafts={drafts}
                              scheduleDrafts={scheduleDrafts}
                              pendingApproval={pendingApproval}
                              pendingDeferredAction={pendingDeferredAction}
                              pendingBatch={pendingBatch}
                              onBatchDecision={handleBatchDecision}
                              undoneArchives={undoneArchives}
                              autoArchiveIds={autoArchiveIds}
                              archivesRunAtOnce={!!accountId && actionsDisabled === false}
                              onDraftChange={(id, draft) =>
                                setDrafts((current) => ({ ...current, [id]: draft }))
                              }
                              onScheduleDraftChange={(id, draft) =>
                                setScheduleDrafts((current) => ({ ...current, [id]: draft }))
                              }
                              onQuoteDraftChange={(id, draft) =>
                                setQuoteDrafts((current) => ({ ...current, [id]: draft }))
                              }
                              onApprove={handleApproval}
                              onScheduleApprove={handleScheduleApproval}
                              onQuoteApprove={handleRfqActionApproval}
                              onScheduleUploadFile={uploadLocalFileForSchedule}
                              onQuoteUploadFile={uploadLocalFileForQuote}
                              quoteDrafts={quoteDrafts}
                              recordDrafts={recordDrafts}
                              onRecordDraftChange={(id, draft) =>
                                setRecordDrafts((current) => ({ ...current, [id]: draft }))
                              }
                              onRecordApprove={handleRecordApproval}
                              onAnswerQuestion={answerQuestion}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {/* popLayout: the thinking line leaves out of flow, so the
                          first words take its place without a jump. */}
                      <AnimatePresence mode="popLayout" initial={false}>
                        {shouldShowThinkingIndicator({ status, messages }) ? (
                          <AgentWorkingIndicator
                            key="thinking"
                            // Before the first words arrive the turn is already
                            // Elliot's: name it, the way the reply will.
                            header={
                              messages.at(-1)?.role !== 'assistant' ? (
                                <AgentReplyHeader />
                              ) : undefined
                            }
                          />
                        ) : null}
                      </AnimatePresence>
                    </div>
                  )}
                  {noThreadNotice && threadsInContext.length === 0 ? (
                    <div className="mt-4 flex gap-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200">
                      <img
                        src="/favicon/apple-touch-icon.png"
                        alt=""
                        className="mt-0.5 size-6 shrink-0 rounded-sm"
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-2 text-sm leading-6">
                        <p>
                          There is no email in this chat yet, so I do not know which one to{' '}
                          <span className="font-semibold">{noThreadNotice}</span>. Open one in the
                          mailbox, or add one here, and ask again.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setNoThreadNotice(null);
                              setContextOpen(true);
                            }}
                          >
                            <Plus className="size-3.5" aria-hidden />
                            Add an email
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setNoThreadNotice(null)}
                          >
                            Never mind
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {/* Only while there is a choice to make: removing the chips removes the question. */}
                  {whichEmail && threadsInContext.length > 1 ? (
                    <div className="mt-4">
                      <AgentWhichEmail
                        question={whichEmail}
                        threads={threadsInContext}
                        onPick={(picked) => startFor(whichEmail, picked)}
                        onGeneral={
                          whichEmail.raw ? () => startEmailAction(whichEmail.raw!) : undefined
                        }
                        onCancel={() => setWhichEmail(null)}
                      />
                    </div>
                  ) : null}
                  {error ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                      <span className="min-w-0 flex-1">{describeAgentChatError(error)}</span>
                      {failedMessageCoversPendingCard(messages) ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setMessages(messages.slice(0, -1))}
                        >
                          Remove it and decide on the card
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </ConversationContent>
                {messages.length > 0 ? (
                  <AgentJumpToLatest streaming={status === 'streaming' || status === 'submitted'} />
                ) : null}
                <KeepLatestAnswerInView trigger={showFollowUps ? followUpKey : null} />
                {messages.length >= 4 ? (
                  <ConversationRail
                    messages={messages}
                    messageRefs={messageRefs}
                    activeTurnId={activeTurnId ?? messages[0]?.id ?? null}
                    onActiveChange={setActiveTurnId}
                    onSelect={setActiveTurnId}
                  />
                ) : null}
              </Conversation>

              <div className={cn('p-3', fullscreen && 'mx-auto w-full max-w-3xl px-6 pb-5')}>
                {actionQueue ? (
                  <div className="mb-2 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                    <DotMatrixLoader size={14} />
                    <span className="min-w-0 flex-1 truncate">
                      {actionQueue.label}, one email at a time · {actionQueue.index + 1} of{' '}
                      {actionQueue.threadIds.length}
                    </span>
                    <button
                      type="button"
                      className="font-medium text-foreground hover:underline"
                      onClick={() => setActionQueue(null)}
                    >
                      Stop after this one
                    </button>
                  </div>
                ) : null}
                <AnimatePresence initial={false}>
                  {showFollowUps ? (
                    <AgentFollowUpChipRow
                      key={followUpKey}
                      items={followUps}
                      disabled={composerBlocked}
                      onPick={(text) => handleSubmit({ text })}
                      className="mb-2"
                    />
                  ) : null}
                </AnimatePresence>
                <MentionPills
                  mentions={pendingMentions}
                  records={draftRecordMentions}
                  onRemove={removePendingMention}
                  onRemoveRecord={removeRecordMention}
                  className="mb-2 max-h-24 overflow-y-auto px-1"
                />
                <PromptComposer
                  status={status}
                  blockedReason={composerBlocked}
                  hint={composerHint}
                  onSubmit={handleSubmit}
                  onStop={stop}
                  mentionItems={contextEmails.filter((item) => item.id !== email?.id)}
                  onMentionSelect={handleMentionSelect}
                  onMentionHit={(hit) => void handleMentionHit(hit)}
                  taggedRecords={draftRecordMentions}
                  onRecordSelect={handleRecordSelect}
                  accountId={accountId}
                  slashItems={slashItems}
                  onSlashSelect={(item) => {
                    if (sendBlocked) return;
                    if (!item.template.includes('{email}')) {
                      startEmailAction(item.template);
                    } else if (threadsInContext.length === 0) {
                      setNoThreadNotice(NEEDS_THREAD);
                    } else if (threadsInContext.length === 1) {
                      startEmailAction(fillEmailPrompt(item.template));
                    } else {
                      setWhichEmail({
                        label: item.label,
                        template: item.template,
                        multi: item.multi,
                      });
                    }
                  }}
                />
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  Connected to {mailboxAddress}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
      {fullscreen && !isElliotAgentDisabled ? (
        <AgentEmailPane
          open={showEmailPane}
          emails={[...(includeActiveContext && email ? [email] : []), ...selectedContextEmails]}
          pickedId={paneEmailId}
          onPick={setPaneEmailId}
          accountId={accountId}
          mailboxAddress={mailboxAddress}
          inlineImageBaseUrl={inlineImageBaseUrl}
          onClose={() => setShowEmailPane(false)}
        />
      ) : null}
    </aside>
  );
}

function ConversationRail({
  messages,
  messageRefs,
  activeTurnId,
  onActiveChange,
  onSelect,
}: {
  messages: UIMessage[];
  messageRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  activeTurnId: string | null;
  onActiveChange: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const { scrollRef } = useStickToBottomContext();

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;

    const updateActiveRailItem = () => {
      const viewportRect = viewport.getBoundingClientRect();
      const targets = messages
        .map((message) => [message.id, messageRefs.current[message.id]] as const)
        .filter((entry): entry is readonly [string, HTMLDivElement] => Boolean(entry[1]));
      if (!targets.length) return;

      const distanceFromEnd = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      if (viewport.scrollTop <= 56) {
        onActiveChange(targets[0][0]);
        return;
      }
      if (distanceFromEnd <= 56) {
        onActiveChange(targets[targets.length - 1][0]);
        return;
      }

      const viewportCenter = viewportRect.top + viewportRect.height / 2;
      let nearest = targets[0][0];
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const [id, element] of targets) {
        const rect = element.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter);
        if (distance < nearestDistance) {
          nearest = id;
          nearestDistance = distance;
        }
      }
      onActiveChange(nearest);
    };

    updateActiveRailItem();
    viewport.addEventListener('scroll', updateActiveRailItem, { passive: true });
    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateActiveRailItem);
    resizeObserver?.observe(viewport);
    return () => {
      viewport.removeEventListener('scroll', updateActiveRailItem);
      resizeObserver?.disconnect();
    };
  }, [messageRefs, messages, onActiveChange, scrollRef]);

  const selectRailItem = (id: string) => {
    const viewport = scrollRef.current;
    const target = messageRefs.current[id];
    if (!viewport || !target) return;
    onSelect(id);
    const viewportRect = viewport.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const top =
      viewport.scrollTop +
      targetRect.top -
      viewportRect.top -
      (viewport.clientHeight - targetRect.height) / 2;
    viewport.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <nav
      className="absolute inset-y-5 right-1 z-10 flex w-5 flex-col items-end justify-center gap-0"
      aria-label="Conversation turns"
    >
      {messages.map((message) => {
        const text = message.parts
          .filter((part) => part.type === 'text')
          .map((part) => part.text)
          .join(' ')
          .replace(/[#*_`>-]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        const nextAssistant =
          message.role === 'user'
            ? messages
                .slice(messages.indexOf(message) + 1)
                .find((candidate) => candidate.role === 'assistant')
            : undefined;
        const responseText = nextAssistant?.parts
          .filter((part) => part.type === 'text')
          .map((part) => part.text)
          .join(' ')
          .replace(/[#*_`>-]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        const label = truncateRailText(text || `${message.role} turn`, 56);
        const description = truncateRailText(
          responseText || (message.role === 'assistant' ? text : ''),
          88
        );
        const isActive = message.id === activeTurnId;
        return (
          <button
            key={message.id}
            type="button"
            title={label}
            aria-label={`Go to ${message.role} message${text ? `: ${text.slice(0, 80)}` : ''}`}
            onClick={() => selectRailItem(message.id)}
            className={cn(
              'group relative z-0 h-2 w-4 rounded-sm transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring hover:z-50',
              isActive ? 'w-5' : 'hover:w-5'
            )}
          >
            <span
              className={cn(
                'absolute right-0 top-1/2 h-px -translate-y-1/2 rounded-full transition-all',
                message.role === 'user' ? 'w-4 bg-foreground/45' : 'w-2.5 bg-muted-foreground/35',
                isActive && 'w-5 bg-foreground'
              )}
            />
            <span className="pointer-events-none invisible absolute right-7 top-1/2 z-50 w-64 -translate-y-1/2 rounded-md border border-border bg-background px-3 py-2 text-left opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100">
              <span className="block truncate text-xs font-medium text-foreground">{label}</span>
              {description ? (
                <span className="mt-0.5 block line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                  {description}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function truncateRailText(text: string, limit: number) {
  if (text.length <= limit) return text;
  const excerpt = text.slice(0, limit);
  const boundary = excerpt.lastIndexOf(' ');
  return `${excerpt.slice(0, boundary > limit * 0.65 ? boundary : limit).trim()}…`;
}

function AgentMessage({
  message,
  live,
  mentionLabels,
  drafts,
  scheduleDrafts,
  quoteDrafts,
  onDraftChange,
  onScheduleDraftChange,
  onQuoteDraftChange,
  onApprove,
  onScheduleApprove,
  onQuoteApprove,
  onScheduleUploadFile,
  onQuoteUploadFile,
  recordDrafts,
  onRecordDraftChange,
  onRecordApprove,
  pendingApproval,
  pendingDeferredAction,
  pendingBatch,
  onBatchDecision,
  undoneArchives,
  autoArchiveIds,
  archivesRunAtOnce,
  onAnswerQuestion,
}: {
  message: UIMessage;
  /** The turn Elliot is still writing. */
  live: boolean;
  mentionLabels: string[];
  drafts: Record<string, MockAgentAction>;
  scheduleDrafts: Record<string, ScheduleAgentAction>;
  quoteDrafts: Record<string, RfqAgentAction>;
  onDraftChange: (id: string, draft: MockAgentAction) => void;
  onScheduleDraftChange: (id: string, draft: ScheduleAgentAction) => void;
  onQuoteDraftChange: (id: string, draft: RfqAgentAction) => void;
  onApprove: (id: string, action: MockAgentAction, approved: boolean) => Promise<void>;
  onScheduleApprove: (id: string, action: ScheduleAgentAction, approved: boolean) => Promise<void>;
  onQuoteApprove: (id: string, action: RfqAgentAction, approved: boolean) => Promise<void>;
  onScheduleUploadFile: (
    file: File,
    projectId: string
  ) => Promise<{ fileId: string; fileName: string }>;
  onQuoteUploadFile: (
    file: File,
    projectId: string,
    rfqId: string
  ) => Promise<{ fileId: string; fileName: string }>;
  recordDrafts: Record<string, RecordAgentAction>;
  onRecordDraftChange: (id: string, draft: RecordAgentAction) => void;
  onRecordApprove: (id: string, action: RecordAgentAction, approved: boolean) => Promise<void>;
  pendingApproval: { id: string; approved: boolean } | null;
  pendingDeferredAction: {
    toolCallId: string;
    startedAt: number;
    delayMs: number;
    phase: 'countdown' | 'sending';
    tone: 'success' | 'destructive';
    actionType: MockAgentAction['action'];
    label: string;
    cancel: () => void;
  } | null;
  pendingBatch: PendingMailBatch | null;
  onBatchDecision: (
    items: Array<{ toolCallId: string; action: MockAgentAction }>,
    approved: boolean
  ) => void;
  undoneArchives: ReadonlySet<string>;
  /** Live archive proposals waiting for their step to finish before running. */
  autoArchiveIds: ReadonlySet<string>;
  /** A lone archive proposal runs without a card to approve (elli-ui#651). */
  archivesRunAtOnce: boolean;
  /** Elliot asked something mid-task; the answer carries the turn on. */
  onAnswerQuestion: (toolCallId: string, answer: string) => void;
}) {
  const renderedParts: ReactNode[] = [];
  // What Elliot says after a card has been approved or rejected; the card
  // already says it (see agent-follow-up.ts).
  const silencedText = getSilencedTextParts(message);
  // Each run of lookups is its own timeline, between the words around it.
  const activityGroups = groupActivitySteps(message, silencedText);
  const activityGroupOf = new Map(
    activityGroups.flatMap((group) => group.steps.map((step) => [step.id, group] as const))
  );
  // Mail proposals of one step are reviewed as a batch (agent-proposal-batch.ts).
  const mailParts = new Map<string, MailToolPart>();
  for (const part of message.parts) {
    if (part.type === 'tool-proposeEmailAction' && 'toolCallId' in part) {
      const toolPart = part as unknown as MailToolPart;
      mailParts.set(toolPart.toolCallId, toolPart);
    }
  }
  const mailBatchOf = new Map<string, string[]>();
  for (const batch of findMailProposalBatches(message)) {
    for (const id of batch) mailBatchOf.set(id, batch);
  }
  const mailActionFor = (toolPart: MailToolPart) => drafts[toolPart.toolCallId] ?? toolPart.input;
  // Busy while its own approval runs, or while a batch it belongs to is counting
  // down or applying — so its own buttons cannot run it a second time.
  const isMailProcessing = (toolCallId: string) =>
    pendingApproval?.id === toolCallId ||
    (!!pendingBatch &&
      pendingBatch.ids.includes(toolCallId) &&
      (pendingBatch.phase === 'countdown' || pendingBatch.activeId === toolCallId));
  const pendingBatchItems = (items: MailToolPart[]) =>
    items.flatMap((item) => {
      const action = mailActionFor(item);
      const pending =
        agentCardStatus({ state: item.state, output: item.output, processing: false }) ===
        'pending';
      return pending && isMailActionReady(action) ? [{ toolCallId: item.toolCallId, action }] : [];
    });
  // A lone archive runs without approval (elli-ui#651), so its card never
  // offers an Approve button. While the turn streams it may yet join a batch,
  // so it only says it is being prepared; once the step is complete and it
  // waits for its run, it shows the run. One in a batch never gets here — the
  // batch renders it — and one reopened from history is neither live nor
  // waiting, so it keeps its card.
  const archiveRunsAtOnce = (action: MockAgentAction | undefined) =>
    archivesRunAtOnce && action?.action === 'archive';
  const isWaitingArchive = (toolPart: MailToolPart, action: MockAgentAction) =>
    archiveRunsAtOnce(action) &&
    toolPart.state === 'input-available' &&
    autoArchiveIds.has(toolPart.toolCallId);
  const renderMailCard = (toolPart: MailToolPart) => {
    const action = mailActionFor(toolPart);
    // The input streams in a field at a time; the card reads the action type
    // for its title and buttons, so it waits for that, not just for an object.
    const preparing =
      live &&
      archiveRunsAtOnce(action) &&
      (toolPart.state === 'input-streaming' || toolPart.state === 'input-available');
    if (!isMailActionReady(action) || preparing) {
      return (
        <div
          key={toolPart.toolCallId}
          className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground"
          role="status"
        >
          {preparing ? 'Preparing an action…' : 'Preparing an action for review…'}
        </div>
      );
    }
    return (
      <ActionCard
        key={toolPart.toolCallId}
        action={action}
        state={toolPart.state}
        output={toolPart.output}
        errorText={toolPart.errorText}
        processing={isMailProcessing(toolPart.toolCallId)}
        processingApproved={
          pendingApproval?.id === toolPart.toolCallId ? pendingApproval.approved : undefined
        }
        pendingSend={
          pendingDeferredAction?.toolCallId === toolPart.toolCallId
            ? pendingDeferredAction
            : isWaitingArchive(toolPart, action)
              ? {
                  toolCallId: toolPart.toolCallId,
                  startedAt: 0,
                  delayMs: 0,
                  phase: 'sending',
                  tone: 'destructive',
                  actionType: 'archive',
                  label:
                    (action.messageIds?.length ?? 0) > 1 ? 'Archiving emails' : 'Archiving email',
                  cancel: () => undefined,
                }
              : null
        }
        undone={undoneArchives.has(toolPart.toolCallId)}
        onChange={(next) => onDraftChange(toolPart.toolCallId, next)}
        onApprove={(approved) => onApprove(toolPart.toolCallId, action, approved)}
      />
    );
  };
  let textBuffer = '';
  // Only the text at the end of a live turn is still being written; text the
  // model wrote before calling a tool is finished.
  const flushText = (streaming = false) => {
    if (!textBuffer) return;
    const text = textBuffer;
    textBuffer = '';
    renderedParts.push(
      <MessageBubble
        key={`${message.id}-text-${renderedParts.length}`}
        from={message.role}
        mentions={message.role === 'user' ? readMentions(message.metadata) : []}
        records={message.role === 'user' ? readRecordMentions(message.metadata) : []}
        mentionLabels={mentionLabels}
        streaming={streaming}
      >
        {text}
      </MessageBubble>
    );
  };
  message.parts.forEach((part, index) => {
    if (part.type === 'text') {
      if (!silencedText.has(index)) textBuffer += part.text;
      return;
    }
    const toolCallId = 'toolCallId' in part ? (part.toolCallId as string) : undefined;
    const group = toolCallId ? activityGroupOf.get(toolCallId) : undefined;
    if (group) {
      // A run renders once, where its first lookup happened. Only the run the
      // turn is still in stays open; one Elliot has moved on from folds away.
      const first = group.steps[0]!;
      if (first.id !== toolCallId) return;
      flushText();
      const current = live && group.trailing;
      renderedParts.push(
        <AgentActivityTimeline
          key={`${message.id}-activity-${first.id}`}
          steps={group.steps}
          live={current}
          working={current}
        />
      );
      return;
    }
    flushText(false);
    if (isQuestionPart(part)) {
      renderedParts.push(
        <AgentQuestionCard
          key={part.toolCallId}
          part={part}
          disabled={live}
          onAnswer={(answer) => onAnswerQuestion(part.toolCallId, answer)}
        />
      );
      return;
    }
    if (part.type === 'tool-proposeEmailAction' && 'toolCallId' in part) {
      const toolPart = part as unknown as MailToolPart;
      const batch = mailBatchOf.get(toolPart.toolCallId);
      if (!batch) {
        renderedParts.push(renderMailCard(toolPart));
        return;
      }
      // A batch renders once, where its first change was proposed.
      if (batch[0] !== toolPart.toolCallId) return;
      const batchParts = batch
        .map((id) => mailParts.get(id))
        .filter((item): item is MailToolPart => !!item);
      const batchRunning = !!pendingBatch && batch.some((id) => pendingBatch.ids.includes(id));
      renderedParts.push(
        <AgentProposalBatchCard
          key={`${toolPart.toolCallId}-batch`}
          items={batchParts.map((item) => {
            const action = mailActionFor(item);
            return {
              toolCallId: item.toolCallId,
              ready: isMailActionReady(action),
              action: {
                action: action?.action ?? '',
                summary: action?.summary ?? '',
                messageIds: action?.messageIds ?? [],
              },
              status: agentCardStatus({
                state: item.state,
                output: item.output,
                processing: isMailProcessing(item.toolCallId),
              }),
            };
          })}
          countdown={
            batchRunning && pendingBatch?.phase === 'countdown' ? (
              <PendingSendBar
                label={`Applying ${batch.length} changes`}
                startedAt={pendingBatch.startedAt}
                delayMs={pendingBatch.delayMs}
                phase="countdown"
                tone="destructive"
                actionType="move"
                onCancel={pendingBatch.cancel}
              />
            ) : null
          }
          onApproveAll={() => onBatchDecision(pendingBatchItems(batchParts), true)}
          onRejectAll={() => onBatchDecision(pendingBatchItems(batchParts), false)}
          onRejectOne={(id) => {
            const item = mailParts.get(id);
            const action = item ? mailActionFor(item) : undefined;
            if (action) void onApprove(id, action, false);
          }}
        />
      );
      return;
    }
    if (part.type === 'tool-proposeProjectScheduleAction' && 'toolCallId' in part) {
      const toolPart = part as unknown as {
        toolCallId: string;
        state: string;
        input?: ScheduleAgentAction;
        output?: string;
        errorText?: string;
      };
      const action = scheduleDrafts[toolPart.toolCallId] ?? toolPart.input;
      if (!action) {
        renderedParts.push(
          <div
            key={toolPart.toolCallId}
            className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground"
            role="status"
          >
            Preparing a schedule action for review…
          </div>
        );
        return;
      }
      renderedParts.push(
        <ScheduleActionCard
          key={toolPart.toolCallId}
          action={action}
          state={toolPart.state}
          output={toolPart.output}
          errorText={toolPart.errorText}
          processing={pendingApproval?.id === toolPart.toolCallId}
          processingApproved={
            pendingApproval?.id === toolPart.toolCallId ? pendingApproval.approved : undefined
          }
          onChange={(next) => onScheduleDraftChange(toolPart.toolCallId, next)}
          onApprove={(approved) => onScheduleApprove(toolPart.toolCallId, action, approved)}
          onUploadFile={onScheduleUploadFile}
        />
      );
      return;
    }
    if (part.type === 'tool-proposeUploadRfqQuote' && 'toolCallId' in part) {
      const toolPart = part as unknown as {
        toolCallId: string;
        state: string;
        input?: RfqAgentAction;
        output?: string;
        errorText?: string;
      };
      const streamed = toolPart.input;
      const action = quoteDrafts[toolPart.toolCallId] ?? streamed;
      // Streaming tool inputs arrive incrementally — until the action tag and
      // the id fields we actually need are populated, the card can't render a
      // variant. Show a placeholder so we don't crash trying to read the shape
      // early. publish_rfq has no quoteId; the other three do.
      const isReady =
        !!action &&
        !!action.action &&
        !!action.rfqId &&
        (action.action === 'publish_rfq' ? true : !!(action as { quoteId?: string }).quoteId);
      if (!isReady) {
        renderedParts.push(
          <div
            key={toolPart.toolCallId}
            className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground"
            role="status"
          >
            Preparing an RFQ action for review…
          </div>
        );
        return;
      }
      renderedParts.push(
        <RfqActionCard
          key={toolPart.toolCallId}
          action={action}
          state={toolPart.state}
          output={toolPart.output}
          errorText={toolPart.errorText}
          processing={pendingApproval?.id === toolPart.toolCallId}
          processingApproved={
            pendingApproval?.id === toolPart.toolCallId ? pendingApproval.approved : undefined
          }
          onChange={(next) => onQuoteDraftChange(toolPart.toolCallId, next)}
          onApprove={(approved) => onQuoteApprove(toolPart.toolCallId, action, approved)}
          onUploadFile={onQuoteUploadFile}
        />
      );
      return;
    }
    if (part.type === `tool-${RECORD_TOOL_NAME}` && 'toolCallId' in part) {
      const toolPart = part as unknown as {
        toolCallId: string;
        state: string;
        input?: Partial<RecordAgentAction>;
        output?: string;
        errorText?: string;
      };
      const action = recordDrafts[toolPart.toolCallId] ?? toolPart.input;
      if (!isRecordActionReady(action)) {
        renderedParts.push(
          <div
            key={toolPart.toolCallId}
            className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground"
            role="status"
          >
            Preparing a record for review…
          </div>
        );
        return;
      }
      renderedParts.push(
        <RecordActionCard
          key={toolPart.toolCallId}
          action={action}
          state={toolPart.state}
          output={toolPart.output}
          errorText={toolPart.errorText}
          processing={pendingApproval?.id === toolPart.toolCallId}
          processingApproved={
            pendingApproval?.id === toolPart.toolCallId ? pendingApproval.approved : undefined
          }
          onChange={(next) => onRecordDraftChange(toolPart.toolCallId, next)}
          onApprove={(approved) => onRecordApprove(toolPart.toolCallId, action, approved)}
        />
      );
    }
  });
  flushText(live);
  return (
    <div className="space-y-3" aria-live={message.role === 'assistant' ? 'polite' : undefined}>
      {renderedParts}
    </div>
  );
}

function MessageBubble({
  from,
  children,
  mentions,
  records,
  mentionLabels,
  streaming,
}: {
  from: UIMessage['role'];
  children: string;
  /** Mails this message pointed at with @, shown as pills under it. */
  mentions: MentionRef[];
  /** Records it pointed at with @, likewise. */
  records: RecordMention[];
  mentionLabels: string[];
  streaming: boolean;
}) {
  return (
    <Message from={from}>
      {/* 15px rather than 14 (elli-ui#1419): the chat is read, not scanned. */}
      <MessageContent
        className={cn('text-[15px] leading-[1.65]', from === 'user' ? 'ml-auto' : '')}
      >
        {from === 'user' ? (
          <div className="whitespace-pre-wrap break-words">
            <HighlightedMentions text={children} labels={mentionLabels} />
          </div>
        ) : (
          <AgentStreamingMarkdown
            text={children}
            streaming={streaming}
            className={cn(
              'prose prose-sm max-w-none text-[15px] leading-[1.65] dark:prose-invert',
              // Each block trims its own first/last margins; the gap between
              // blocks comes from the stack, so the prose spacing is kept tight.
              'prose-p:my-1.5 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5',
              'prose-headings:mb-1 prose-headings:mt-1'
            )}
          />
        )}
      </MessageContent>
      {mentions.length || records.length ? (
        <MentionPills mentions={mentions} records={records} layout="stack" className="w-full" />
      ) : null}
    </Message>
  );
}

function HighlightedMentions({ text, labels }: { text: string; labels: string[] }) {
  const knownLabels = labels.filter(Boolean).sort((a, b) => b.length - a.length);
  if (knownLabels.length === 0) return text;
  const pattern = new RegExp(
    `(@(?:${knownLabels.map((label) => escapeRegExp(label)).join('|')}))`,
    'g'
  );
  return text.split(pattern).map((part, index) => {
    const isMention = part.startsWith('@') && knownLabels.some((label) => part === `@${label}`);
    return isMention ? (
      <mark
        key={`${part}-${index}`}
        className="rounded-md bg-primary/12 px-1 py-0.5 font-medium text-primary ring-1 ring-inset ring-primary/20"
      >
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    );
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ActionCard({
  action,
  state,
  output,
  errorText,
  processing,
  processingApproved,
  pendingSend,
  undone = false,
  onChange,
  onApprove,
}: {
  action: MockAgentAction;
  state: string;
  output?: string;
  errorText?: string;
  processing: boolean;
  processingApproved?: boolean;
  pendingSend?: {
    toolCallId: string;
    startedAt: number;
    delayMs: number;
    phase: 'countdown' | 'sending';
    tone: 'success' | 'destructive';
    actionType: MockAgentAction['action'];
    label: string;
    cancel: () => void;
  } | null;
  /** An archive the user took back from its toast. */
  undone?: boolean;
  onChange: (action: MockAgentAction) => void;
  onApprove: (approved: boolean) => Promise<void>;
}) {
  // When Elliot is holding an approved action in the cancellation window,
  // the card morphs into a compact inline PendingSendBar so the user can
  // see the countdown and hit Cancel without leaving the chat. The bar
  // owns both the countdown and the actual sending state.
  if (pendingSend) {
    return (
      <PendingSendBar
        label={pendingSend.label}
        startedAt={pendingSend.startedAt}
        delayMs={pendingSend.delayMs}
        phase={pendingSend.phase}
        tone={pendingSend.tone}
        actionType={pendingSend.actionType}
        onCancel={pendingSend.cancel}
      />
    );
  }
  const status = agentCardStatus({ state, output, processing });
  const editable = status === 'pending';
  const copy = MAIL_ACTION_COPY[action.action];
  const blocker = action.action === 'reply' ? replyActionBlocker(action) : null;
  return (
    <AgentActionShell
      title={copy.title}
      status={status}
      streaming={state === 'input-streaming'}
      // Elliot archives without asking, so the card reports what happened.
      outcome={
        action.action === 'archive' && status === 'approved'
          ? { word: undone ? 'Undone' : 'Archived', undone }
          : undefined
      }
      result={
        status === 'approved' && undone ? (
          <AgentActionResult approved={false} undone>
            Archive undone. The email is back where it was.
          </AgentActionResult>
        ) : status === 'approved' || status === 'rejected' ? (
          <AgentActionResult approved={status === 'approved'}>
            {action.action === 'reply'
              ? status === 'rejected'
                ? 'Reply rejected. No email was sent.'
                : 'Reply sent.'
              : (output ?? '').replace(/^(SUCCESS|REJECTED):\s*/, '')}
          </AgentActionResult>
        ) : null
      }
      actions={
        status === 'pending' || status === 'working' ? (
          <>
            {blocker && status === 'pending' ? (
              <AgentActionNote tone="warning">{blocker}</AgentActionNote>
            ) : null}
            <AgentActionButtons
              approveLabel={copy.approveLabel}
              destructive={action.action === 'delete'}
              processing={processing}
              processingApproved={processingApproved}
              disabled={!!blocker}
              onApprove={onApprove}
            />
          </>
        ) : errorText ? (
          <AgentActionNote tone="error">{errorText}</AgentActionNote>
        ) : null
      }
    >
      {action.action === 'reply' ? (
        <ReplyActionFields
          draft={action}
          editable={editable}
          onChange={(patch) => onChange({ ...action, ...patch })}
        />
      ) : (
        <CardFields>
          <CardReadOnlyField label="What Elliot will do">{action.summary}</CardReadOnlyField>
          {action.action === 'move' && (action.targetFolderName || action.targetFolderKey) ? (
            // A well-known folder (junk, archive) can come by key alone.
            <CardReadOnlyField label="Move to">
              {action.targetFolderName ?? folderLabelFromKey(action.targetFolderKey)}
            </CardReadOnlyField>
          ) : null}
          {action.action === 'tag' && action.tagNames?.length ? (
            <CardReadOnlyField label="Tags">{action.tagNames.join(', ')}</CardReadOnlyField>
          ) : null}
        </CardFields>
      )}
    </AgentActionShell>
  );
}

/**
 * Inline pending-action bar that lives inside the Elliot chat. Rendered by
 * ActionCard through both the countdown and the actual mutation. Cancel is
 * only available during the countdown phase; once the mutation kicks off
 * the bar switches to a spinner + "Working…" pill until the ActionCard
 * swaps it out for the final confirmation.
 *
 * Two tones:
 *   - success     → emerald (reply, additive)
 *   - destructive → destructive tokens (delete / archive / move — the mail
 *                    disappears from view)
 */
function PendingSendBar({
  label,
  startedAt,
  delayMs,
  phase,
  tone,
  actionType,
  onCancel,
}: {
  label: string;
  startedAt: number;
  delayMs: number;
  phase: 'countdown' | 'sending';
  tone: 'success' | 'destructive';
  actionType: MockAgentAction['action'];
  onCancel: () => void;
}) {
  const isSending = phase === 'sending';
  const [countdownProgress, setCountdownProgress] = useState(() =>
    Math.min(1, Math.max(0, (Date.now() - startedAt) / delayMs))
  );

  // Full once the countdown is over; the bar's own pulse covers the remaining
  // "sending" period. Derived rather than written into state by the effect —
  // while sending there is nothing to track, so there is nothing to store.
  const progress = isSending ? 1 : countdownProgress;

  useEffect(() => {
    // No ticking while sending: `progress` is already pinned to 1 above.
    if (isSending) return;

    const interval = window.setInterval(() => {
      const next = Math.min(1, Math.max(0, (Date.now() - startedAt) / delayMs));
      setCountdownProgress(next);
      if (next >= 1) window.clearInterval(interval);
    }, 60);
    return () => window.clearInterval(interval);
  }, [delayMs, isSending, startedAt]);

  const remainingSeconds = Math.max(0, Math.ceil((delayMs * (1 - progress)) / 1000));

  const iconClasses =
    tone === 'destructive'
      ? 'bg-destructive/10 text-destructive ring-1 ring-destructive/25'
      : 'bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400 dark:ring-emerald-400/25';
  const fillClasses =
    tone === 'destructive' ? 'bg-destructive' : 'bg-emerald-500 dark:bg-emerald-400';
  const workingLabel =
    tone === 'destructive'
      ? actionType === 'delete'
        ? 'Deleting'
        : actionType === 'archive'
          ? 'Archiving'
          : 'Moving'
      : 'Sending';

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full',
            iconClasses
          )}
          aria-hidden="true"
        >
          <PendingActionIcon actionType={actionType} tone={tone} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight text-foreground">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isSending
              ? tone === 'destructive'
                ? 'Applying now — this usually takes a moment.'
                : 'Delivering now — this usually takes a moment.'
              : `Cancel within ${remainingSeconds}s to stop it.`}
          </p>
        </div>
        {isSending ? (
          <span
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground ring-1 ring-inset ring-border"
            role="status"
          >
            <DotMatrixLoader size={12} />
            {workingLabel}
          </span>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm ring-1 ring-inset ring-border transition-colors hover:bg-muted/70 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px"
          >
            Cancel
          </button>
        )}
      </div>
      <div
        className="relative h-1 w-full overflow-hidden bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-label={
          isSending ? `${label} — in progress` : `${label} — ${remainingSeconds} seconds remaining`
        }
      >
        <div
          className={cn(
            'h-full',
            fillClasses,
            // While the API call runs, pulse the fill so the bar reads as
            // "still working" rather than "done".
            isSending && 'motion-safe:animate-pulse'
          )}
          style={{
            width: `${progress * 100}%`,
            transition: 'width 80ms linear',
          }}
        />
      </div>
    </div>
  );
}

function PendingActionIcon({
  actionType,
  tone,
}: {
  actionType: MockAgentAction['action'];
  tone: 'success' | 'destructive';
}) {
  const cls = 'size-4';
  const stroke = 2.6;
  if (tone === 'destructive') {
    if (actionType === 'delete')
      return <Trash2 className={cls} strokeWidth={stroke} aria-hidden="true" />;
    if (actionType === 'archive')
      return <Archive className={cls} strokeWidth={stroke} aria-hidden="true" />;
    if (actionType === 'move')
      return <FolderInput className={cls} strokeWidth={stroke} aria-hidden="true" />;
  }
  return <Check className={cls} strokeWidth={stroke} aria-hidden="true" />;
}

function ScheduleActionCard({
  action,
  state,
  output,
  errorText,
  processing,
  processingApproved,
  onChange,
  onApprove,
  onUploadFile,
}: {
  action: ScheduleAgentAction;
  state: string;
  output?: string;
  errorText?: string;
  processing: boolean;
  processingApproved?: boolean;
  onChange: (action: ScheduleAgentAction) => void;
  onApprove: (approved: boolean) => Promise<void>;
  onUploadFile: (file: File, projectId: string) => Promise<{ fileId: string; fileName: string }>;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const canAttach = action.action !== 'remove_schedule';
  const projectIdForUpload = canAttach ? action.projectId : '';
  const handleFileChange = async (event: ReactChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || action.action === 'remove_schedule') return;
    setUploadingFile(true);
    try {
      const { fileId, fileName } = await onUploadFile(file, action.projectId);
      onChange({
        ...action,
        attachment: { source: 'existing_file', fileId, fileName },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The file could not be uploaded.');
    } finally {
      setUploadingFile(false);
    }
  };
  const isWaiting = state === 'input-available' || processing;
  const isRejected = output?.startsWith('REJECTED:') === true;
  const isRemove = action.action === 'remove_schedule';
  const projectLabel = action.projectName ?? action.projectId;

  const actionLabel =
    action.action === 'add_schedule'
      ? 'Add schedule entry'
      : action.action === 'update_schedule'
        ? 'Update schedule entry'
        : 'Remove schedule entry';
  const successLabel =
    action.action === 'add_schedule'
      ? 'Schedule entry created.'
      : action.action === 'update_schedule'
        ? 'Schedule entry updated.'
        : 'Schedule entry removed.';
  const rejectedLabel = 'Schedule change rejected. No entry was changed.';

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-md bg-background',
            isRemove ? 'text-destructive' : 'text-primary'
          )}
        >
          {isRemove ? (
            <Trash2 className="size-4" aria-hidden="true" />
          ) : (
            <CalendarClock className="size-4" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Review action
          </p>
          <p className="mt-1 text-sm font-medium">{action.summary}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {actionLabel} · <span className="font-medium text-foreground/80">{projectLabel}</span>
          </p>
        </div>
      </div>

      {action.action !== 'remove_schedule' && isWaiting ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <CardDateField
            label="Date"
            value={toDateOnly(action.date) ?? ''}
            editable
            onChange={(date) => onChange({ ...action, date: date || action.date })}
          />
          <CardDateField
            label="Adjusted finish"
            value={toDateOnly(action.adjustedFinishDate) ?? ''}
            editable
            onChange={(date) => onChange({ ...action, adjustedFinishDate: date || null })}
          />
          <label className="flex flex-col gap-1 text-xs font-medium sm:col-span-2">
            <span className="text-muted-foreground">Description</span>
            <input
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              value={action.description}
              onChange={(event) => onChange({ ...action, description: event.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium sm:col-span-2">
            <span className="text-muted-foreground">Notes</span>
            <Textarea
              rows={3}
              value={action.notes ?? ''}
              onChange={(event) => onChange({ ...action, notes: event.target.value || null })}
            />
          </label>
          {action.primeChangeOrderLabel && (
            <div className="sm:col-span-2 flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs">
              <Pencil className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">
                <span className="text-muted-foreground">Prime CO: </span>
                <span className="font-medium">{action.primeChangeOrderLabel}</span>
              </span>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                aria-label="Clear prime change order"
                onClick={() =>
                  onChange({ ...action, primeChangeOrderId: null, primeChangeOrderLabel: null })
                }
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
          <div className="sm:col-span-2 flex items-center gap-2 rounded-md border border-dashed border-border bg-background/60 px-2.5 py-1.5 text-xs">
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              onChange={(event) => void handleFileChange(event)}
              aria-hidden="true"
              tabIndex={-1}
            />
            {action.attachment ? (
              <>
                <FileFormatBadge
                  fileName={
                    action.attachment.source === 'email_attachment'
                      ? action.attachment.attachmentName
                      : action.attachment.fileName
                  }
                  className="size-5"
                />
                <span className="min-w-0 flex-1 truncate">
                  <span className="text-muted-foreground">Attachment: </span>
                  <span className="font-medium">
                    {action.attachment.source === 'email_attachment'
                      ? action.attachment.attachmentName
                      : action.attachment.fileName}
                  </span>
                  {action.attachment.source === 'email_attachment' && (
                    <span className="ml-1 text-muted-foreground">(from email)</span>
                  )}
                </span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-1"
                  aria-label="Replace attachment"
                  disabled={uploadingFile || !projectIdForUpload}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingFile ? (
                    <DotMatrixLoader size={14} />
                  ) : (
                    <Pencil className="size-3.5" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  aria-label="Remove attachment"
                  onClick={() => onChange({ ...action, attachment: null })}
                >
                  <X className="size-3.5" />
                </button>
              </>
            ) : (
              <>
                <Paperclip className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 flex-1 text-muted-foreground">
                  {action.action === 'add_schedule'
                    ? 'Attachment required. Attach a file to create this entry.'
                    : 'No attachment.'}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingFile || !projectIdForUpload}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingFile ? (
                    <DotMatrixLoader size={14} />
                  ) : (
                    <Paperclip className="size-3.5" aria-hidden="true" />
                  )}
                  {uploadingFile ? 'Uploading…' : 'Attach file'}
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}

      {action.action !== 'remove_schedule' && !isWaiting ? (
        <div className="mt-3 rounded-md bg-background p-3 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">{action.description}</span>
            {' · '}
            <span>{action.date}</span>
            {action.adjustedFinishDate ? <span> → {action.adjustedFinishDate}</span> : null}
          </p>
          {action.notes ? <p className="mt-1 whitespace-pre-wrap">{action.notes}</p> : null}
          {action.attachment ? (
            <p className="mt-1">
              Attached:{' '}
              <span className="font-medium">
                {action.attachment.source === 'email_attachment'
                  ? action.attachment.attachmentName
                  : action.attachment.fileName}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      {action.action === 'remove_schedule' && (
        <div className="mt-3 rounded-md bg-background p-3 text-sm text-muted-foreground">
          <p>
            Remove{' '}
            <span className="font-medium text-foreground">
              {action.scheduleDescription ?? 'this schedule entry'}
            </span>
            {action.scheduleDate ? <span> · {action.scheduleDate}</span> : null}
          </p>
        </div>
      )}

      {errorText ? (
        <p className="mt-3 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {errorText}
        </p>
      ) : null}

      {action.action === 'add_schedule' && !action.attachment && isWaiting ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Every schedule entry needs an attached file. Use the Attach button above to add one before
          creating this entry.
        </p>
      ) : null}

      {isWaiting ? (
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={processing}
            onClick={() => void onApprove(false)}
          >
            <X className="size-3.5" />{' '}
            {processing && processingApproved === false ? 'Working…' : 'Reject'}
          </Button>
          <Button
            type="button"
            variant={isRemove ? 'destructive' : 'primary'}
            size="sm"
            disabled={processing || (action.action === 'add_schedule' && !action.attachment)}
            onClick={() => void onApprove(true)}
          >
            <Check className="size-3.5" />{' '}
            {processing && processingApproved === true
              ? 'Working…'
              : isRemove
                ? 'Remove'
                : action.action === 'update_schedule'
                  ? 'Save changes'
                  : 'Create entry'}
          </Button>
        </div>
      ) : null}

      {state === 'output-available' && output ? (
        <p
          className={cn(
            'mt-3 flex items-center gap-2 text-xs font-medium',
            isRejected ? 'text-muted-foreground' : 'text-emerald-700 dark:text-emerald-400'
          )}
        >
          <Check className="size-3.5" />
          {isRejected ? rejectedLabel : successLabel}
        </p>
      ) : null}
    </div>
  );
}

function RfqActionCard({
  action,
  state,
  output,
  errorText,
  processing,
  processingApproved,
  onChange,
  onApprove,
  onUploadFile,
}: {
  action: RfqAgentAction;
  state: string;
  output?: string;
  errorText?: string;
  processing: boolean;
  processingApproved?: boolean;
  onChange: (action: RfqAgentAction) => void;
  onApprove: (approved: boolean) => Promise<void>;
  onUploadFile: (
    file: File,
    projectId: string,
    rfqId: string
  ) => Promise<{ fileId: string; fileName: string }>;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const isUpload = action.action === 'upload_quote';
  const isDestructive = action.action === 'remove_quote' || action.action === 'remove_vendor';
  const isPublish = action.action === 'publish_rfq';
  // Numeric fields on upload_quote are optional at the tool layer so Elliot can
  // propose the card early. Guard every read against undefined; the card refuses
  // to submit until the user fills in a positive amount and attaches a file.
  const quotedAmount = isUpload ? (action.quotedAmount ?? 0) : 0;
  const negotiationAmount = isUpload ? (action.negotiationAmount ?? null) : null;
  const leadTimeDays = isUpload ? (action.leadTimeDays ?? null) : null;
  const attachment = isUpload ? (action.attachment ?? null) : null;
  const publishVendors = isPublish ? (action.vendors ?? []) : [];
  const isEdit = isUpload && isQuoteEdit(action);
  const existingFiles = isUpload ? (action.existingAttachments ?? []) : [];
  const quoteBlocker = isUpload
    ? quoteActionBlocker({
        mode: action.mode,
        quotedAmount: action.quotedAmount,
        hasNewAttachment: !!attachment,
        existingAttachments: existingFiles,
      })
    : null;
  const canSubmit = isUpload ? !quoteBlocker : isPublish ? publishVendors.length > 0 : true;
  const actionLabel = isUpload
    ? isEdit
      ? 'Edit Quote'
      : 'Add Quote to RFQ'
    : action.action === 'remove_quote'
      ? 'Remove Quote'
      : action.action === 'remove_vendor'
        ? 'Remove Vendor'
        : 'Publish RFQ';
  const submitLabel = isUpload
    ? isEdit
      ? 'Approve & Update Quote'
      : 'Approve & Add Quote'
    : action.action === 'remove_quote'
      ? 'Approve & Remove Quote'
      : action.action === 'remove_vendor'
        ? 'Approve & Remove Vendor'
        : 'Publish & Invite';
  const successLabel = isUpload
    ? isEdit
      ? 'Quote updated.'
      : 'Quote added to the RFQ.'
    : action.action === 'remove_quote'
      ? 'Quote removed.'
      : action.action === 'remove_vendor'
        ? 'Vendor removed.'
        : 'RFQ published and vendors invited.';
  const rejectedLabel = isUpload
    ? 'Quote rejected. Nothing was submitted.'
    : action.action === 'remove_quote'
      ? 'Removal rejected. The quote is unchanged.'
      : action.action === 'remove_vendor'
        ? 'Removal rejected. The vendor is unchanged.'
        : 'Publish rejected. The RFQ is still a draft.';

  const handleFileChange = async (event: ReactChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !isUpload) return;
    setUploadingFile(true);
    try {
      const { fileId, fileName } = await onUploadFile(file, action.projectId, action.rfqId);
      onChange({
        ...action,
        attachment: { source: 'existing_file', fileId, fileName },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The file could not be uploaded.');
    } finally {
      setUploadingFile(false);
    }
  };

  const status = agentCardStatus({ state, output, processing });
  const editable = status === 'pending';
  const attachmentName = attachment
    ? attachment.source === 'email_attachment'
      ? attachment.attachmentName
      : attachment.fileName
    : null;
  const blocker = isUpload
    ? quoteBlocker
    : isPublish && !canSubmit
      ? 'Add at least one vendor before publishing.'
      : null;

  return (
    <AgentActionShell
      title={actionLabel}
      status={status}
      streaming={state === 'input-streaming'}
      result={
        status === 'approved' || status === 'rejected' ? (
          <AgentActionResult approved={status === 'approved'}>
            {status === 'rejected' ? rejectedLabel : successLabel}
          </AgentActionResult>
        ) : null
      }
      actions={
        status === 'pending' || status === 'working' ? (
          <>
            {blocker && status === 'pending' ? (
              <AgentActionNote tone="warning">{blocker}</AgentActionNote>
            ) : null}
            <AgentActionButtons
              approveLabel={submitLabel}
              destructive={isDestructive}
              processing={processing}
              processingApproved={processingApproved}
              disabled={!canSubmit}
              onApprove={onApprove}
            />
          </>
        ) : errorText ? (
          <AgentActionNote tone="error">{errorText}</AgentActionNote>
        ) : null
      }
    >
      <CardFields>
        <CardReadOnlyField
          label={isPublish ? 'RFQ' : 'RFQ · Vendor'}
          detail={isPublish ? (action.projectName ?? undefined) : undefined}
        >
          {action.rfqNumber}
          {isPublish ? ` · ${action.rfqTitle}` : ` · ${action.vendorName}`}
        </CardReadOnlyField>

        {isUpload ? (
          <>
            <CardFieldRow>
              <CardTextField
                label="Quoted amount ($)"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={quotedAmount ? String(quotedAmount) : ''}
                editable={editable}
                onChange={(raw) => onChange({ ...action, quotedAmount: parseCardNumber(raw) })}
              />
              <CardTextField
                label="Negotiated amount ($)"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={negotiationAmount != null ? String(negotiationAmount) : ''}
                editable={editable}
                onChange={(raw) =>
                  onChange({ ...action, negotiationAmount: raw ? parseCardNumber(raw) : null })
                }
              />
            </CardFieldRow>
            <CardTextField
              label="Lead time (days)"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={leadTimeDays != null ? String(leadTimeDays) : ''}
              editable={editable}
              onChange={(raw) =>
                onChange({
                  ...action,
                  leadTimeDays: raw ? Math.max(1, Math.floor(parseCardNumber(raw))) : null,
                })
              }
            />
            {existingFiles.length > 0 ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">On the quote (kept)</span>
                {existingFiles.map((file) => (
                  <div
                    key={file.fileId}
                    className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm"
                  >
                    <FileFormatBadge fileName={file.fileName} className="size-5" />
                    <span className="min-w-0 flex-1 truncate">{file.fileName}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {isEdit ? 'Revised quote file (optional)' : 'Quote file'}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                onChange={(event) => void handleFileChange(event)}
                aria-hidden="true"
                tabIndex={-1}
              />
              {attachmentName ? (
                <div className="flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm">
                  <FileFormatBadge fileName={attachmentName} className="size-5" />
                  <span className="min-w-0 flex-1 truncate">
                    {attachmentName}
                    {attachment?.source === 'email_attachment' ? (
                      <span className="ml-1 text-xs text-muted-foreground">(from email)</span>
                    ) : null}
                  </span>
                  {editable ? (
                    <>
                      <button
                        type="button"
                        className="rounded-sm px-1 text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Replace quote file"
                        disabled={uploadingFile}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploadingFile ? (
                          <DotMatrixLoader size={14} />
                        ) : (
                          <Pencil className="size-3.5" aria-hidden="true" />
                        )}
                      </button>
                      <button
                        type="button"
                        className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Remove quote file"
                        onClick={() => onChange({ ...action, attachment: null })}
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    </>
                  ) : null}
                </div>
              ) : editable ? (
                <Button
                  type="button"
                  variant="dashed"
                  size="sm"
                  className="self-start"
                  disabled={uploadingFile}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingFile ? (
                    <DotMatrixLoader size={14} />
                  ) : (
                    <Paperclip className="size-3.5" aria-hidden="true" />
                  )}
                  {uploadingFile ? 'Uploading…' : 'Attach quote file'}
                </Button>
              ) : null}
            </div>
          </>
        ) : null}

        {isDestructive ? (
          <p className="rounded-md border border-destructive-alpha bg-destructive-soft p-3 text-sm text-muted-foreground">
            {action.action === 'remove_quote' ? (
              <>
                Clear the submitted quote from{' '}
                <span className="font-medium text-foreground">{action.vendorName}</span> on{' '}
                <span className="font-medium text-foreground">{action.rfqNumber}</span>. The vendor
                stays on the RFQ and can submit again.
              </>
            ) : (
              <>
                Remove <span className="font-medium text-foreground">{action.vendorName}</span> from{' '}
                <span className="font-medium text-foreground">{action.rfqNumber}</span> entirely.
                Any submitted quote from this vendor is also cleared.
              </>
            )}
          </p>
        ) : null}

        {isPublish ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              Vendors to invite ({publishVendors.length})
            </span>
            {editable ? (
              <PublishRfqVendorPicker
                selectedVendors={publishVendors}
                onChange={(nextVendors) => onChange({ ...action, vendors: nextVendors })}
              />
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {publishVendors.map((vendor) => (
                  <li
                    key={vendor.vendorId}
                    className="inline-flex max-w-56 items-center gap-1 rounded-md bg-primary-soft px-2 py-1 text-xs text-primary-soft-foreground"
                  >
                    <span className="min-w-0 truncate font-medium">{vendor.vendorName}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </CardFields>
    </AgentActionShell>
  );
}

function PublishRfqVendorPicker({
  selectedVendors,
  onChange,
}: {
  selectedVendors: RfqPublishVendor[];
  onChange: (vendors: RfqPublishVendor[]) => void;
}) {
  const [search, setSearch] = useState('');

  // Keep the already-picked vendors visible in the dropdown even if they aren't
  // in the current search page — matches how the rfq-detail Publish dialog uses
  // the same picker.
  const selectedOptions = useMemo<InfiniteMultiSearchSelectOption[]>(
    () =>
      selectedVendors.map((vendor) => ({
        value: vendor.vendorId,
        label: vendor.vendorName,
        description: vendor.vendorEmail ?? undefined,
      })),
    [selectedVendors]
  );

  const picker = useVendorPickerOptions({
    search,
    selectedOptions,
    queryScope: 'Elliot-publish-rfq',
    status: 'ACTIVE',
  });

  const selectedIds = useMemo(
    () => selectedVendors.map((vendor) => vendor.vendorId),
    [selectedVendors]
  );

  const handleValueChange = (nextIds: string[]) => {
    // Preserve the existing entries where possible (they may have vendorEmail
    // from Elliot's original proposal that isn't on the picker option), then
    // fill in newly-added ids from the picker options.
    const existingById = new Map(selectedVendors.map((vendor) => [vendor.vendorId, vendor]));
    const optionById = new Map(picker.options.map((option) => [option.value, option]));
    const nextVendors: RfqPublishVendor[] = nextIds.map((id) => {
      const existing = existingById.get(id);
      if (existing) return existing;
      const option = optionById.get(id);
      return {
        vendorId: id,
        vendorName: option?.label ?? id,
        vendorEmail: option?.description ?? null,
      };
    });
    onChange(nextVendors);
  };

  return (
    <InfiniteMultiSearchSelect
      options={picker.options}
      value={selectedIds}
      onValueChange={handleValueChange}
      selectedOptions={selectedOptions}
      search={search}
      onSearchChange={setSearch}
      isLoading={picker.isLoading}
      isFetchingNextPage={picker.isFetchingNextPage}
      hasNextPage={picker.hasNextPage}
      onFetchNextPage={picker.fetchNextPage}
      placeholder="Select vendors to invite…"
      searchPlaceholder="Search vendors…"
      emptyMessage={search ? 'No matching vendors found.' : 'No vendors found.'}
      loadingMessage="Loading vendors…"
      testId="Elliot-rfq-publish-vendors"
    />
  );
}

function PromptComposer({
  status,
  blockedReason,
  hint,
  onSubmit,
  onStop,
  mentionItems,
  onMentionSelect,
  onMentionHit,
  taggedRecords,
  onRecordSelect,
  accountId,
  slashItems,
  onSlashSelect,
}: {
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  /** Why nothing can be sent right now; shown under the box. */
  blockedReason: string | null;
  /** Shown under the box without holding the send button. */
  hint?: string | null;
  onSubmit: (message: { text: string }) => void;
  onStop: () => void;
  mentionItems: EmailListItem[];
  onMentionSelect: (item: EmailListItem) => void;
  /** A mail found by searching the whole mailbox, not one already loaded. */
  onMentionHit: (hit: EmailMessageSearchResult) => void;
  /** Records already tagged on the message being written; the menu leaves them out. */
  taggedRecords: RecordMention[];
  onRecordSelect: (record: RecordMention) => void;
  /** The mailbox the @ menu searches. */
  accountId: string | undefined;
  /** Rows for the menu that opens on "/". */
  slashItems: SlashItem[];
  onSlashSelect: (item: SlashItem) => void;
}) {
  return (
    <PromptInputProvider>
      <PromptComposerFields
        status={status}
        blockedReason={blockedReason}
        hint={hint}
        onSubmit={onSubmit}
        onStop={onStop}
        mentionItems={mentionItems}
        onMentionSelect={onMentionSelect}
        onMentionHit={onMentionHit}
        taggedRecords={taggedRecords}
        onRecordSelect={onRecordSelect}
        accountId={accountId}
        slashItems={slashItems}
        onSlashSelect={onSlashSelect}
      />
    </PromptInputProvider>
  );
}

function PromptComposerFields({
  status,
  blockedReason,
  hint,
  onSubmit,
  onStop,
  mentionItems,
  onMentionSelect,
  onMentionHit,
  taggedRecords,
  onRecordSelect,
  accountId,
  slashItems,
  onSlashSelect,
}: Omit<Parameters<typeof PromptComposer>[0], never>) {
  const controller = usePromptInputController();
  const value = controller.textInput.value;
  // Typing "@" opens the menu with its own search box, so a search can hold
  // several words. `mentionAt` is where the "@" went, to take it out again.
  // The tab picks mail or one kind of record; a new "@" starts on mail.
  const [mention, setMention] = useState<{
    open: boolean;
    term: string;
    at: number;
    tab: MentionTab;
  }>({ open: false, term: '', at: -1, tab: 'mail' });
  const mentionTerm = mention.term.trim();
  const tabSearches = mentionTabSearches(mention.tab);
  // Loaded mail matches at once; the whole mailbox is searched once the term settles.
  const searchTerm = useDebouncedValue(mentionTerm, 250);
  const searchesMailbox = mention.open && tabSearches.mail && searchTerm.length >= 2;
  const mailboxSearch = useEmailMessageSearchQuery(accountId, searchTerm, searchesMailbox);
  // Records are searched for any term, and with none listed the most recent.
  const searchesRecords = mention.open && !tabSearches.mail;
  const recordSearch = useRecordMentionSearch(searchTerm, tabSearches.recordKind, searchesRecords);
  const mentionCandidatesList: AgentMentionRow[] = mention.open
    ? mentionMenuRows(
        tabSearches.mail
          ? mentionCandidates(
              mentionTerm,
              mentionItems,
              searchesMailbox ? (mailboxSearch.data ?? []) : []
            )
          : [],
        searchesRecords ? (recordSearch.data ?? []) : [],
        new Set(taggedRecords.map(recordMentionKey))
      )
    : [];
  const mentionSearching =
    mention.open &&
    (searchTerm !== mentionTerm ||
      (searchesRecords && recordSearch.isFetching) ||
      (searchesMailbox && mailboxSearch.isFetching));
  const mentionKey = `${mention.tab}|${mentionTerm}|${mentionCandidatesList.map((item) => item.key).join('|')}`;
  const [mentionSelection, setMentionSelection] = useState({ key: '', index: 0 });
  const mentionIndex = mentionSelection.key === mentionKey ? mentionSelection.index : 0;
  const focusPrompt = () =>
    requestAnimationFrame(() => document.getElementById('Elliot-agent-message')?.focus());
  /** Closes the menu; `dropAt` also takes the "@" back out of the message. */
  const closeMention = (dropAt: boolean) => {
    if (dropAt && value[mention.at] === '@') {
      controller.textInput.setInput(value.slice(0, mention.at) + value.slice(mention.at + 1));
    }
    setMention({ open: false, term: '', at: -1, tab: 'mail' });
    focusPrompt();
  };
  const selectMention = (row: AgentMentionRow) => {
    closeMention(true);
    if (row.kind === 'record') onRecordSelect(row.record);
    else if (row.candidate.kind === 'local') onMentionSelect(row.candidate.item);
    else onMentionHit(row.candidate.hit);
  };
  // Read from the text rather than the key: Android keyboards often report no
  // key at all, so watching for an "@" keypress would never open the menu there.
  const handlePromptChange = (event: ReactChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value;
    const caret = event.target.selectionStart ?? next.length;
    const at = caret - 1;
    const typedAt = next.length > value.length && next[at] === '@';
    // Not inside a word, so "me@site.com" stays an address.
    if (typedAt && (at === 0 || /\s/.test(next[at - 1] ?? ''))) {
      setMention({ open: true, term: '', at, tab: 'mail' });
    }
  };
  const setMentionTab = (tab: MentionTab) => setMention((current) => ({ ...current, tab }));
  const handleMentionKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    const count = mentionCandidatesList.length;
    if (event.key === 'Tab') {
      // Focus stays in the search box; Tab walks the tabs instead.
      event.preventDefault();
      setMentionTab(nextMentionTab(mention.tab, event.shiftKey ? -1 : 1));
    } else if (event.key === 'ArrowDown' && count) {
      event.preventDefault();
      setMentionSelection({ key: mentionKey, index: (mentionIndex + 1) % count });
    } else if (event.key === 'ArrowUp' && count) {
      event.preventDefault();
      setMentionSelection({ key: mentionKey, index: (mentionIndex - 1 + count) % count });
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (count) selectMention(mentionCandidatesList[mentionIndex]!);
    } else if (event.key === 'Escape' || (event.key === 'Backspace' && mention.term === '')) {
      event.preventDefault();
      closeMention(true);
    }
  };
  // "/" opens one menu: Elliot's suggestions for the attached mail first, then
  // the commands. A suggestion runs at once; a command is typed in, ready to send.
  const slashQuery = value.match(/^\/(\S*)$/)?.[1];
  const commandEntries: CommandMenuEntry[] =
    slashQuery === undefined
      ? []
      : [
          ...slashItems
            .filter((item) => matchesWords(slashQuery, `${item.label} ${item.description ?? ''}`))
            .map((item) => ({ kind: 'suggestion' as const, id: item.id, item })),
          ...matchAgentSlashCommands(value).map((match) => ({
            kind: 'command' as const,
            id: match.command.command,
            match,
          })),
        ];
  const commandKey = `${value}|${commandEntries.map((entry) => entry.id).join('|')}`;
  const [commandSelection, setCommandSelection] = useState({ key: '', index: 0 });
  // Escape closes the menu for what is typed now; typing again reopens it.
  const [dismissedCommandValue, setDismissedCommandValue] = useState<string | null>(null);
  const commandMenuOpen = commandEntries.length > 0 && dismissedCommandValue !== value;
  const commandIndex = commandSelection.key === commandKey ? commandSelection.index : 0;
  const selectCommand = (entry: CommandMenuEntry) => {
    if (entry.kind === 'suggestion') {
      controller.textInput.setInput('');
      onSlashSelect(entry.item);
      return;
    }
    controller.textInput.setInput(`${entry.match.command.command} `);
  };
  const handleCommandKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    const count = commandEntries.length;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setCommandSelection({ key: commandKey, index: (commandIndex + step + count) % count });
      return;
    }
    if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
      event.preventDefault();
      selectCommand(commandEntries[commandIndex]!);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setDismissedCommandValue(value);
    }
  };
  const handlePromptKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (commandMenuOpen) handleCommandKeyDown(event);
    // Submitting while Elliot works would clear the box; keep the draft instead.
    if (
      !event.defaultPrevented &&
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing &&
      holdsEnterWhileRunning(status)
    ) {
      event.preventDefault();
    }
  };

  return (
    <PromptInput
      className="rounded-2xl border border-border/80 bg-background p-2 shadow-none transition-colors focus-within:border-foreground/25 focus-within:ring-0"
      onSubmit={({ text }) => {
        const nextText = text.trim();
        if (nextText) onSubmit({ text: nextText });
      }}
    >
      <PromptInputBody>
        <div className="relative">
          <PromptInputTextarea
            id="Elliot-agent-message"
            rows={2}
            onKeyDown={handlePromptKeyDown}
            onChange={handlePromptChange}
            className="scrollbar-hide block !min-h-0 max-h-48 resize-none !border-0 !bg-transparent px-2 pb-0 pt-1.5 text-sm leading-6 !shadow-none outline-none placeholder:text-muted-foreground/55 focus:!border-0 focus:!ring-0 focus-visible:!border-0 focus-visible:!ring-0"
            placeholder="Ask Elliot…"
          />
          {commandMenuOpen && !mention.open ? (
            <PromptInputCommandMenu
              entries={commandEntries}
              activeIndex={commandIndex}
              onActiveIndexChange={(index) => setCommandSelection({ key: commandKey, index })}
              onSelect={selectCommand}
            />
          ) : null}
          <AgentMentionMenu
            open={mention.open}
            term={mention.term}
            onTermChange={(term) => setMention((current) => ({ ...current, term }))}
            tab={mention.tab}
            onTabChange={setMentionTab}
            onSearchKeyDown={handleMentionKeyDown}
            onDismiss={() => closeMention(false)}
            searching={mentionSearching}
            rows={mentionCandidatesList}
            activeIndex={mentionIndex}
            onActiveIndexChange={(index) => setMentionSelection({ key: mentionKey, index })}
            onSelect={selectMention}
          />
        </div>
      </PromptInputBody>
      <PromptInputFooter className="mt-1 min-h-8 items-center gap-1">
        {(blockedReason ?? hint) && status === 'ready' ? (
          <p className="px-2 text-[11px] text-muted-foreground" role="status">
            {blockedReason ?? hint}
          </p>
        ) : null}
        <PromptInputSubmit
          status={status}
          onStop={onStop}
          disabled={Boolean(blockedReason) && status !== 'streaming' && status !== 'submitted'}
          className="ml-auto !size-8 !rounded-full bg-foreground text-background shadow-none hover:bg-foreground/90"
        >
          {status === 'ready' ? <ArrowUp className="size-4" aria-hidden="true" /> : undefined}
        </PromptInputSubmit>
      </PromptInputFooter>
    </PromptInput>
  );
}

/** A row of the "/" menu: one of Elliot's suggestions, or a command. */
type CommandMenuEntry =
  | { kind: 'suggestion'; id: string; item: SlashItem }
  | { kind: 'command'; id: string; match: AgentSlashCommandMatch };

function PromptInputCommandMenu({
  entries,
  activeIndex,
  onActiveIndexChange,
  onSelect,
}: {
  entries: CommandMenuEntry[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (entry: CommandMenuEntry) => void;
}) {
  const firstCommand = entries.findIndex((entry) => entry.kind === 'command');
  const hasSuggestions = entries.some((entry) => entry.kind === 'suggestion');
  const rowClass = (active: boolean) =>
    cn(
      'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
      active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent'
    );
  return (
    <div
      className="absolute bottom-full left-2 right-2 z-50 mb-2 max-h-56 overflow-y-auto rounded-lg border border-border bg-background p-1 shadow-xl sm:max-h-72 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-150"
      role="listbox"
      aria-label="Commands"
    >
      {hasSuggestions ? (
        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Suggested for this email
        </p>
      ) : null}
      {entries.map((entry, index) => {
        const active = index === activeIndex;
        const common = {
          type: 'button' as const,
          role: 'option',
          'aria-selected': active,
          className: rowClass(active),
          onMouseDown: (event: { preventDefault: () => void }) => event.preventDefault(),
          onMouseEnter: () => onActiveIndexChange(index),
          onClick: () => onSelect(entry),
        };
        if (entry.kind === 'suggestion') {
          const Icon = entry.item.icon;
          return (
            <button key={entry.id} {...common}>
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-3.5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{entry.item.label}</span>
                {entry.item.description ? (
                  <span className="block truncate text-muted-foreground">
                    {entry.item.description}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-primary/70" title="Suggested by Elliot">
                <Sparkles className="size-3.5" aria-hidden="true" />
                <span className="sr-only">Suggested by Elliot</span>
              </span>
            </button>
          );
        }
        const { command, matchedLength } = entry.match;
        const Icon = SLASH_COMMAND_ICONS[command.command] ?? Sparkles;
        const name = command.command.slice(1);
        return (
          <div key={entry.id}>
            {index === firstCommand && hasSuggestions ? (
              <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Commands
              </p>
            ) : null}
            <button {...common}>
              <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="shrink-0 font-mono">
                /
                <span className="font-semibold text-foreground">
                  {name.slice(0, matchedLength)}
                </span>
                <span className="text-muted-foreground">{name.slice(matchedLength)}</span>
              </span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {command.description}
              </span>
              <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">
                {command.scope}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
type AgentMentionRow = MentionMenuRow<EmailListItem, EmailMessageSearchResult>;

/**
 * The menu "@" opens over the message box: mail or records to point the
 * message at, a tab per kind, and its own search box so a search can hold
 * several words.
 */
function AgentMentionMenu({
  open,
  term,
  onTermChange,
  tab,
  onTabChange,
  onSearchKeyDown,
  onDismiss,
  searching,
  rows,
  activeIndex,
  onActiveIndexChange,
  onSelect,
}: {
  open: boolean;
  term: string;
  onTermChange: (term: string) => void;
  tab: MentionTab;
  onTabChange: (tab: MentionTab) => void;
  onSearchKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  /** Focus left the menu: close it, leaving the message as typed. */
  onDismiss: () => void;
  /** The mailbox or the records are still being searched for the term. */
  searching: boolean;
  rows: AgentMentionRow[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (row: AgentMentionRow) => void;
}) {
  const searchRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (open) searchRef.current?.focus({ preventScroll: true });
  }, [open]);
  if (!open) return null;
  const listId = 'elliot-mention-options';
  const tabLabel = MENTION_TABS.find((item) => item.id === tab)?.label ?? '';
  return (
    <div
      className="absolute bottom-full left-2 right-2 z-50 mb-2 overflow-hidden rounded-lg border border-border bg-background shadow-xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-150"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onDismiss();
      }}
    >
      <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Add a reference
      </p>
      {/* Clicking a tab keeps focus in the search box, so typing carries on;
          from the keyboard, Tab and Shift+Tab there walk the tabs. */}
      <div
        role="tablist"
        aria-label="Show"
        className="scrollbar-hide flex gap-1 overflow-x-auto border-b border-border px-2 pb-2 pt-1.5"
      >
        {MENTION_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            tabIndex={-1}
            aria-selected={item.id === tab}
            aria-controls={listId}
            className={cn(
              'shrink-0 rounded-md px-2 py-1 text-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
              item.id === tab
                ? 'bg-accent font-medium text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
            )}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onTabChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        id={listId}
        role="listbox"
        aria-label={tabLabel}
        aria-busy={searching}
        className="h-56 overflow-y-auto overscroll-contain p-1 sm:h-72"
      >
        {rows.map((row, index) => {
          const heading = mentionMenuHeading(rows, index, tab);
          return (
            <div
              key={row.key}
              className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200"
            >
              {heading ? (
                <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {heading}
                </p>
              ) : null}
              <button
                id={`${listId}-${index}`}
                type="button"
                tabIndex={-1}
                role="option"
                aria-selected={index === activeIndex}
                ref={
                  index === activeIndex
                    ? (element) => element?.scrollIntoView({ block: 'nearest' })
                    : undefined
                }
                className={cn(
                  'flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                  index === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent'
                )}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => onActiveIndexChange(index)}
                onClick={() => onSelect(row)}
              >
                <MentionRowContent row={row} />
              </button>
            </div>
          );
        })}
        {searching ? (
          <p
            className={cn(
              'px-2 py-2 text-xs text-muted-foreground',
              rows.length === 0 && 'grid h-full place-items-center'
            )}
            aria-live="polite"
          >
            Searching…
          </p>
        ) : rows.length === 0 ? (
          <p
            className="grid h-full place-items-center px-2 text-xs text-muted-foreground"
            aria-live="polite"
          >
            Nothing matches.
          </p>
        ) : null}
      </div>
      <label className="relative block border-t border-border p-2">
        <span className="sr-only">Search {tabLabel}</span>
        <Search
          className="pointer-events-none absolute left-4.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={searchRef}
          type="search"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={rows[activeIndex] ? `${listId}-${activeIndex}` : undefined}
          value={term}
          onChange={(event) => onTermChange(event.target.value)}
          onKeyDown={onSearchKeyDown}
          placeholder={`Search ${tab === 'mail' ? 'emails' : tabLabel}…`}
          className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:text-xs"
        />
      </label>
    </div>
  );
}

function MentionRowContent({ row }: { row: AgentMentionRow }) {
  if (row.kind === 'mail') {
    const { candidate } = row;
    return (
      <>
        <Mail className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block truncate font-medium">{candidate.subject || '(No subject)'}</span>
          <span className="block truncate text-muted-foreground">
            {candidate.senderName} · {candidate.preview}
          </span>
        </span>
      </>
    );
  }
  const { record } = row;
  const Icon = RECORD_KIND_ICONS[record.kind];
  return (
    <>
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{record.label}</span>
        {record.detail ? (
          <span className="block truncate text-muted-foreground">{record.detail}</span>
        ) : null}
      </span>
      {record.status ? (
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {formatRecordStatus(record.status)}
        </span>
      ) : null}
    </>
  );
}

/** `PENDING_APPROVAL` → "Pending approval". */
function formatRecordStatus(status: string) {
  const words = status.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const recordMentionKeys = {
  all: ['mock-agent', 'record-mentions'] as const,
  search: (term: string, kind: RecordMentionKind | undefined) =>
    [...recordMentionKeys.all, kind ?? 'all', term] as const,
};

/**
 * The records a tab of the @ menu offers for what is typed, made only while
 * that tab is open. With nothing typed it lists the most recently touched, so
 * a tab shows something to pick. A failure lists none.
 */
function useRecordMentionSearch(
  term: string,
  kind: RecordMentionKind | undefined,
  enabled: boolean
) {
  return useQuery({
    queryKey: recordMentionKeys.search(term, kind),
    queryFn: async ({ signal }) => {
      const response = await api.get<{ data: unknown }>('/mock/agent/mentions', {
        params: { ...(term ? { q: term } : {}), ...(kind ? { kind } : {}) },
        signal,
      });
      return parseRecordMentions(response.data.data);
    },
    enabled,
    // Keeps the last list while the next term is fetched, so rows do not blink
    // out — but only within one tab, or Invoices would flash the POs.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === (kind ?? 'all') ? previous : undefined,
    staleTime: 60 * 1000,
    retry: false,
    throwOnError: false,
  });
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="flex size-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function PenNewRoundIcon({
  className,
  'aria-hidden': ariaHidden,
}: {
  className?: string;
  'aria-hidden'?: boolean;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={ariaHidden}
    >
      <path d="m16.652 3.455l.649-.649A2.753 2.753 0 0 1 21.194 6.7l-.65.649m-3.892-3.893s.081 1.379 1.298 2.595c1.216 1.217 2.595 1.298 2.595 1.298m-3.893-3.893L10.687 9.42c-.404.404-.606.606-.78.829q-.308.395-.524.848c-.121.255-.211.526-.392 1.068L8.412 13.9m12.133-6.552l-5.965 5.965c-.404.404-.606.606-.829.78a4.6 4.6 0 0 1-.848.524c-.255.121-.526.211-1.068.392l-1.735.579m0 0l-1.123.374a.742.742 0 0 1-.939-.94l.374-1.122m1.688 1.688L8.412 13.9" />
      <path strokeLinecap="round" d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2" />
    </svg>
  );
}
