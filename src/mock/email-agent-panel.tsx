import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent as ReactChangeEvent,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
  type ReactNode,
} from 'react';

import { useChat } from '@ai-sdk/react';
import { useStickToBottomContext } from 'use-stick-to-bottom';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from 'ai';
import {
  Archive,
  ArrowRight,
  ArrowUp,
  CalendarClock,
  Check,
  CircleCheck,
  Clock3,
  FileText,
  FolderInput,
  GripVertical,
  LoaderCircle,
  Mail,
  Paperclip,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Plus,
  Search,
  Send,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/app/api';
import { getApiErrorMessage } from '@/app/lib/toast-api-error';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { cn } from '@/app/lib/utils';
import type { ConnectedEmailFolder, ConnectedEmailTag } from '@/modules/email/api';
import {
  useArchiveEmailMessageMutation,
  useDeleteEmailMessageMutation,
  useMoveEmailMessageMutation,
  useReplyConnectedEmailMutation,
  useSaveEmailThreadClassificationMutation,
  useUpdateEmailMessageStatusMutation,
  useUpdateEmailMessageTagsMutation,
} from '@/modules/email/hooks';
import { emailApi } from '@/modules/email/api';
import type { EmailListItem } from '@/modules/email/components/email-row-card';
import {
  useCreateScheduleEntryMutation,
  useDeleteScheduleEntryMutation,
  useUpdateScheduleEntryMutation,
} from '@/modules/project/hooks';
import { filesApi } from '@/modules/files/api/files.api';
import { useUploadManager } from '@/modules/files/uploads/upload-manager';
import { Conversation, ConversationContent } from './ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from './ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputController,
} from './ai-elements/prompt-input';

export type EmailAgentLayout = {
  open: boolean;
  width: number;
  pushesContent: boolean;
  hidesEmailList: boolean;
};

type MockAgentAction = {
  action: 'reply' | 'archive' | 'move' | 'tag' | 'mark_read' | 'delete' | 'set_status';
  summary: string;
  messageIds: string[];
  subject?: string;
  to?: Array<{ address: string; name?: string }>;
  cc?: Array<{ address: string; name?: string }>;
  body?: string;
  targetFolderKey?: string;
  targetFolderName?: string;
  tagNames?: string[];
  status?: 'open' | 'closed';
  conversationKey?: string;
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

const DEFAULT_WIDTH = 392;
const MIN_WIDTH = 340;
const MAX_WIDTH = 720;
const PUSH_CONTENT_WIDTH = 520;
const HIDE_EMAIL_LIST_WIDTH = 640;

const QUICK_COMMANDS = [
  { command: '/tools', label: 'See available tools' },
  { command: '/summarize', label: 'Summarize this thread' },
  { command: '/draft', label: 'Draft a reply' },
] as const;

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
  accountId?: string
) {
  const selected = includeActiveContext && email ? [email, ...contextEmails.filter((item) => item.id !== email.id)] : contextEmails;
  return {
    mailboxAddress,
    activeThread: includeActiveContext && email
      ? {
          messageId: getMessageId(email),
          threadId: email.threadId ?? email.conversationKey ?? null,
          accountId: accountId ?? null,
          subject: email.subject,
          sender: { name: email.senderName, address: email.senderEmail },
          to: email.to ?? [],
          cc: email.cc ?? [],
          body: email.threadMessages?.map((message) => message.body).flat() ?? email.body ?? [],
          receivedAt: email.receivedAt,
          keywords: email.keywords ?? [],
          attachments: collectActiveThreadAttachments(email),
        }
      : null,
    availableThreads: selected.slice(0, 40).map((item) => ({
      messageId: getMessageId(item),
      threadId: item.threadId ?? item.conversationKey ?? null,
      conversationKey: item.conversationKey ?? item.threadId ?? item.id,
      subject: item.subject,
      sender: { name: item.senderName, address: item.senderEmail },
      preview: item.preview,
      keywords: item.keywords ?? [],
    })),
    folders: folders.map((folder) => ({ id: folder.id, key: folder.key, name: folder.name })),
    tags: tags.map((tag) => ({ id: tag.id, providerId: tag.providerId, name: tag.name })),
  };
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

function ContextChip({ email, current = false, onRemove }: { email: EmailListItem; current?: boolean; onRemove: () => void }) {
  return (
    <span className="inline-flex max-w-52 shrink-0 items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
      <Mail className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate" title={email.subject}>{email.subject}</span>
      <button
        type="button"
        className="ml-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 hover:bg-background hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Remove ${current ? 'current' : ''} thread context`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </span>
  );
}

function ActionIcon({ action }: { action: MockAgentAction['action'] }) {
  if (action === 'reply') return <Send className="size-4" aria-hidden="true" />;
  if (action === 'archive') return <Archive className="size-4" aria-hidden="true" />;
  if (action === 'move') return <FolderInput className="size-4" aria-hidden="true" />;
  if (action === 'tag') return <Tag className="size-4" aria-hidden="true" />;
  if (action === 'delete') return <Trash2 className="size-4" aria-hidden="true" />;
  if (action === 'set_status') return <CircleCheck className="size-4" aria-hidden="true" />;
  return <Check className="size-4" aria-hidden="true" />;
}

export function EmailAgentPanel({
  open,
  email,
  mailboxAddress,
  accountId,
  threadKey,
  contextEmails,
  folders = [],
  tags = [],
  onOpenChange,
  onLayoutChange,
  onRequestMailboxCollapse,
}: MockAgentPanelProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [contextSearch, setContextSearch] = useState('');
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
  const [draftMentionContextIds, setDraftMentionContextIds] = useState<string[]>([]);
  const [includeActiveContext, setIncludeActiveContext] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, MockAgentAction>>({});
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<string, ScheduleAgentAction>>({});
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [history, setHistory] = useState<ConversationSummary[]>([]);
  const [actionsDisabled, setActionsDisabled] = useState<boolean | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const contextRef = useRef<Record<string, unknown>>({});
  const mailboxKeyRef = useRef<string | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
  const preserveConversationOnThreadChangeRef = useRef(false);
  const [pendingApproval, setPendingApproval] = useState<{ id: string; approved: boolean } | null>(null);
  const pushesContent = open && width >= PUSH_CONTENT_WIDTH;
  const hidesEmailList = open && width >= HIDE_EMAIL_LIST_WIDTH;
  const suggestions = useMemo(
    () =>
      email
        ? ['Draft a concise reply', 'Summarise this thread', 'Archive this email']
        : ['Find recent key emails', 'Summarise unread messages', 'Show emails with attachments'],
    [email]
  );
  const contextIdsForAgent = useMemo(
    () => [...new Set([...selectedContextIds, ...draftMentionContextIds])],
    [draftMentionContextIds, selectedContextIds]
  );
  const contextEmailsForAgent = contextEmails.filter((item) => contextIdsForAgent.includes(item.id));
  const context = useMemo(
    () => getEmailContext(email, contextEmailsForAgent, folders, tags, mailboxAddress, includeActiveContext, accountId),
    [accountId, contextEmailsForAgent, email, folders, includeActiveContext, mailboxAddress, tags]
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
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')}/api/v1/mock/agent/chat`,
        body: () => ({
          context: contextRef.current,
          conversationId: conversationIdRef.current,
          accountId: accountId ?? null,
          threadKey: threadKey ?? null,
        }),
      }),
    [accountId, threadKey]
  );
  const { messages, sendMessage, addToolOutput, status, error, stop, setMessages } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onData: (part) => {
      if (part.type !== 'data-conversation-metadata') return;
      const metadata = part.data as { conversationId?: string; actionsDisabled?: boolean };
      if (metadata.conversationId) {
        setConversationId(metadata.conversationId);
        conversationIdRef.current = metadata.conversationId;
      }
      if (typeof metadata.actionsDisabled === 'boolean') {
        setActionsDisabled(metadata.actionsDisabled);
      }
    },
  });
  const replyMutation = useReplyConnectedEmailMutation();
  const archiveMutation = useArchiveEmailMessageMutation();
  const moveMutation = useMoveEmailMessageMutation();
  const deleteMutation = useDeleteEmailMessageMutation();
  const statusMutation = useUpdateEmailMessageStatusMutation();
  const tagsMutation = useUpdateEmailMessageTagsMutation();
  const classificationMutation = useSaveEmailThreadClassificationMutation();
  const createScheduleMutation = useCreateScheduleEntryMutation();
  const updateScheduleMutation = useUpdateScheduleEntryMutation();
  const deleteScheduleMutation = useDeleteScheduleEntryMutation();
  const uploadManager = useUploadManager();

  useEffect(() => {
    onLayoutChange({ open, width, pushesContent, hidesEmailList });
  }, [hidesEmailList, onLayoutChange, open, pushesContent, width]);

  useEffect(() => {
    const mailboxKey = `${accountId ?? ''}:${threadKey ?? email?.id ?? ''}`;
    const isNewMailboxThread = mailboxKeyRef.current !== null && mailboxKeyRef.current !== mailboxKey;
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
        setIncludeActiveContext(true);
        setDrafts({});
        setScheduleDrafts({});
        setContextOpen(false);
        setHistoryOpen(false);
      }
      void loadHistory();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [accountId, email?.id, loadHistory, setMessages, stop, threadKey]);

  const filteredHistory = history.filter((item) => {
    const query = historySearch.trim().toLowerCase();
    return !query || `${item.title} ${item.summary ?? ''}`.toLowerCase().includes(query);
  });

  const handleLoadConversation = async (id: string) => {
    setLoadingConversationId(id);
    try {
      const response = await api.get<{ data: StoredConversation }>(`/mock/agent/conversations/${id}`);
      const stored = response.data.data;
      setMessages(stored.messages ?? []);
      setConversationId(stored.id);
      conversationIdRef.current = stored.id;
      const storedMessageIds = new Set((stored.context?.availableThreads ?? []).map((item) => item.messageId));
      setIncludeActiveContext(Boolean(stored.context?.activeThread));
      setSelectedContextIds(
        contextEmails.filter((item) => storedMessageIds.has(getMessageId(item)) && item.id !== email?.id).map((item) => item.id)
      );
      setDraftMentionContextIds([]);
      setDrafts({});
      setScheduleDrafts({});
      setHistoryOpen(false);
    } finally {
      setLoadingConversationId(null);
    }
  };

  const handleNewConversation = () => {
    stop();
    setMessages([]);
    setConversationId(null);
    conversationIdRef.current = null;
    setDraftMentionContextIds([]);
    setDrafts({});
    setScheduleDrafts({});
    setHistoryOpen(false);
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
          const response = await api.get<{ data: { actionsDisabled?: boolean } }>('/mock/agent/config');
          shouldDisableActions = response.data.data?.actionsDisabled === true;
          setActionsDisabled(shouldDisableActions);
        } catch {
          shouldDisableActions = true;
          setActionsDisabled(true);
        }
      }

      if (shouldDisableActions) {
        if (action.action === 'reply') return 'Reply simulated successfully.';
        if (action.action === 'archive') return `Email archive simulated successfully${bulkSuffix}.`;
        if (action.action === 'move') return `Email move to ${action.targetFolderName ?? 'the target folder'} simulated successfully${bulkSuffix}.`;
        if (action.action === 'tag') return `Adding ${(action.tagNames ?? []).join(', ') || 'the requested tags'} simulated successfully${bulkSuffix}.`;
        if (action.action === 'set_status') return `Thread status change to ${action.status ?? 'open'} simulated successfully.`;
        if (action.action === 'mark_read') return `Mark-as-read simulated successfully${bulkSuffix}.`;
        return `Delete simulated successfully${bulkSuffix}.`;
      }

      if (action.action === 'archive' || action.action === 'move' || action.action === 'delete') {
        preserveConversationOnThreadChangeRef.current = true;
      }

      if (action.action === 'reply') {
        // Reply is per-message — always use the first messageId.
        await replyMutation.mutateAsync({
          accountId,
          messageId: primaryMessageId,
          body: action.body ?? '',
          bodyType: 'html',
          subject: action.subject,
          to: action.to,
          cc: action.cc,
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
        if (!target) throw new Error(`I could not find the ${action.targetFolderName ?? 'target'} folder.`);
        await runBulkAgent(messageIds, (messageId) =>
          moveMutation.mutateAsync({ accountId, messageId, folderId: target.id })
        );
        return `Email moved to ${target.name}${bulkSuffix}.`;
      }
      if (action.action === 'tag') {
        const matchedTags = tags.filter((tag) =>
          (action.tagNames ?? []).some((name) => name.toLowerCase() === tag.name.toLowerCase())
        );
        if (!matchedTags.length) throw new Error('I could not match the requested tag.');
        const add = matchedTags.map((tag) => tag.providerId);
        await runBulkAgent(messageIds, (messageId) =>
          tagsMutation.mutateAsync({ accountId, messageId, add })
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
    [accountId, actionsDisabled, archiveMutation, classificationMutation, contextEmails, deleteMutation, email, folders, moveMutation, replyMutation, statusMutation, tags, tagsMutation]
  );

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
        const result = await executeAction(action);
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
    [addToolOutput, executeAction]
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
          `Couldn't attach ${attachmentName} from email (${reason}). The schedule entry was not created. Try again without an attachment, then use the Attach button on the card to upload the file from your computer.`
        );
      }
    },
    [accountId, uploadManager]
  );

  const uploadLocalFileForSchedule = useCallback(
    async (
      file: File,
      projectId: string
    ): Promise<{ fileId: string; fileName: string }> => {
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
    [createScheduleMutation, deleteScheduleMutation, materializeScheduleAttachment, updateScheduleMutation]
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
        const result = await executeScheduleAction(action);
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
    [addToolOutput, executeScheduleAction]
  );

  const handleSubmit = ({ text }: { text: string }) => {
    const nextPrompt = text.trim();
    if (!nextPrompt || status === 'submitted' || status === 'streaming') return;
    if (draftMentionContextIds.length > 0) {
      setSelectedContextIds((current) => [...new Set([...current, ...draftMentionContextIds])]);
      setDraftMentionContextIds([]);
    }
    void sendMessage({ text: nextPrompt });
  };

  const handleWorkspaceToggle = () => {
    if (pushesContent) {
      setWidth(DEFAULT_WIDTH);
      return;
    }
    setWidth(HIDE_EMAIL_LIST_WIDTH);
    onRequestMailboxCollapse?.();
  };

  const handleMentionSelect = (item: EmailListItem) => {
    setDraftMentionContextIds((current) => (current.includes(item.id) ? current : [...current, item.id]));
  };
  const removeContextEmail = (id: string) => {
    setSelectedContextIds((current) => current.filter((selectedId) => selectedId !== id));
  };

  const selectedContextEmails = contextEmails.filter((item) => selectedContextIds.includes(item.id));
  const mentionLabels = useMemo(
    () => [...new Set([email?.subject, ...contextEmails.map((item) => item.subject)].filter((subject): subject is string => Boolean(subject)))],
    [contextEmails, email?.subject]
  );
  const contextChipCount = selectedContextEmails.length + (includeActiveContext && email ? 1 : 0);
  const hasScrollableContext = contextChipCount > 5;

  if (!open) return null;

  return (
    <aside
      className={cn(
        'absolute right-0 z-30 flex min-h-0 flex-col overflow-hidden border border-border bg-background text-foreground',
        pushesContent ? 'inset-y-0 border-y-0 border-r-0 shadow-none' : 'rounded-md shadow-xl',
        !isResizing && 'motion-safe:transition-[width,top,bottom,box-shadow] motion-safe:duration-150',
        'motion-reduce:transition-none'
      )}
      style={{ width, top: pushesContent ? 0 : 12, bottom: pushesContent ? 0 : 12 }}
      aria-label="elliot agent"
    >
      <button
        type="button"
        className="absolute inset-y-0 -left-1.5 z-20 flex w-3 cursor-col-resize items-center justify-center border-l border-transparent text-muted-foreground hover:border-primary/40 hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Resize elliot agent"
        onPointerDown={handleResizeStart}
      >
        <GripVertical aria-hidden="true" className="size-3.5" />
      </button>

      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background" aria-hidden="true">
            <img src="/favicon/apple-touch-icon.png" alt="" className="size-7 rounded-sm object-contain" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">elliot agent</h2>
            <p className="truncate text-xs text-muted-foreground">Your inbox, with you in control.</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {messages.length > 0 ? (
            <IconButton label="Start a new chat" onClick={handleNewConversation}>
              <PenNewRoundIcon className="size-[18px]" aria-hidden />
            </IconButton>
          ) : null}
          <IconButton label="Show elliot chat history" onClick={() => setHistoryOpen((value) => !value)}>
            <Clock3 className="size-4" />
          </IconButton>
          <IconButton label={pushesContent ? 'Use overlay width' : 'Expand elliot agent workspace'} onClick={handleWorkspaceToggle}>
            {pushesContent ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
          </IconButton>
          <IconButton label="Close elliot agent" onClick={() => onOpenChange(false)}><X className="size-4" /></IconButton>
        </div>
      </header>

      {historyOpen && (
        <div className="absolute right-3 top-12 z-50 w-[min(360px,calc(100%-24px))] rounded-lg border border-border bg-background p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold">Previous chats</p>
            <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={handleNewConversation}>New chat</button>
          </div>
          <label className="relative block">
            <span className="sr-only">Search previous chats</span>
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" aria-hidden="true" />
            <input type="search" value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Search chats" className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
          <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
            {historyLoading ? <p className="px-2 py-4 text-center text-xs text-muted-foreground">Loading history…</p> : null}
            {!historyLoading && filteredHistory.length === 0 ? <p className="px-2 py-4 text-center text-xs text-muted-foreground">No saved chats yet.</p> : null}
            {filteredHistory.map((item) => (
              <button key={item.id} type="button" className="block w-full rounded-md px-2 py-2 text-left hover:bg-accent disabled:opacity-50" disabled={loadingConversationId === item.id} onClick={() => void handleLoadConversation(item.id)}>
                <span className="block truncate text-xs font-medium">{item.title}</span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{item.summary ?? 'No summary yet'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="relative flex min-w-0 items-center gap-1.5 border-b border-border px-3 py-2">
          <div className={cn('relative flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto whitespace-nowrap', hasScrollableContext ? 'pb-1 [scrollbar-color:hsl(var(--muted-foreground)/.35)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/35 [&::-webkit-scrollbar-track]:bg-transparent' : '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden')}>
            {includeActiveContext && email ? (
              <ContextChip email={email} current onRemove={() => setIncludeActiveContext(false)} />
            ) : null}
            {selectedContextEmails.map((item) => (
              <ContextChip key={item.id} email={item} onRemove={() => removeContextEmail(item.id)} />
            ))}
            {!includeActiveContext && selectedContextEmails.length === 0 ? <span className="px-1 text-xs text-muted-foreground">No context attached</span> : null}
            <IconButton label="Add thread context" onClick={() => setContextOpen((value) => !value)}>
              <Plus className="size-4" aria-hidden="true" />
            </IconButton>
          </div>
          {hasScrollableContext ? <span className="pointer-events-none absolute bottom-2 right-12 inline-flex items-center gap-0.5 rounded-full bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm ring-1 ring-border/70"><span>Scroll</span><ArrowRight className="size-3" aria-hidden="true" /></span> : null}
        </div>

        {contextOpen && (
          <div className="absolute left-3 right-3 top-14 z-40 rounded-lg border border-border bg-background p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between gap-2"><p className="text-xs font-medium">Add inbox threads</p><div className="flex items-center gap-2"><button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { setIncludeActiveContext(false); setSelectedContextIds([]); }}>Clear all</button><button type="button" className="text-xs text-primary hover:underline" onClick={() => setContextOpen(false)}>Done</button></div></div>
            <label className="relative block"><span className="sr-only">Search inbox threads</span><Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" aria-hidden="true" /><input type="search" value={contextSearch} onChange={(event) => setContextSearch(event.target.value)} placeholder="Search subject or sender" className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
              {contextEmails.length === 0 ? (
                <p className="text-xs text-muted-foreground">No other loaded threads are available.</p>
              ) : (
                contextEmails.filter((item) => item.id !== email?.id).filter((item) => `${item.subject} ${item.senderName} ${item.senderEmail} ${item.preview}`.toLowerCase().includes(contextSearch.trim().toLowerCase())).map((item) => (
                  <label key={item.id} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 accent-primary"
                      checked={selectedContextIds.includes(item.id)}
                      onChange={(event) =>
                        setSelectedContextIds((current) =>
                          event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id)
                        )
                      }
                    />
                    <span className="min-w-0"><span className="block truncate font-medium">{item.subject}</span><span className="block truncate text-muted-foreground">{item.senderName}</span></span>
                  </label>
                ))
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">You can attach multiple threads to this chat. elliot will use all selected references.</p>
          </div>
        )}

        <Conversation className="mock-agent-conversation min-h-0 flex-1">
          <ConversationContent className="min-h-full gap-5 px-4 py-4 pr-10">
            {messages.length === 0 ? (
            <div className="flex min-h-full flex-col justify-center gap-5 py-6">
              <div className="space-y-2 text-center">
                <p className="text-xl font-semibold">What should elliot help with?</p>
                <p className="mx-auto max-w-80 text-sm leading-6 text-muted-foreground">elliot can draft replies and prepare mailbox actions. You approve every change.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {suggestions.map((suggestion) => <button key={suggestion} type="button" className="min-h-20 rounded-md border border-border bg-background p-3 text-left text-xs font-medium shadow-sm hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring" onClick={() => void sendMessage({ text: suggestion })}><Sparkles className="mb-3 size-4 text-primary" aria-hidden="true" />{suggestion}</button>)}
              </div>
              <div className="space-y-2">
                <p className="text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Quick commands</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {QUICK_COMMANDS.map(({ command, label }) => <button key={command} type="button" className="rounded-full border border-border bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground" onClick={() => void sendMessage({ text: command })}><span className="font-mono text-primary">{command}</span><span className="ml-1">{label}</span></button>)}
                </div>
              </div>
            </div>
            ) : (
            <div className="space-y-5" aria-live="polite">
              {messages.map((message) => <div key={message.id} ref={(element) => { messageRefs.current[message.id] = element; }}><AgentMessage message={message} mentionLabels={mentionLabels} drafts={drafts} scheduleDrafts={scheduleDrafts} pendingApproval={pendingApproval} onDraftChange={(id, draft) => setDrafts((current) => ({ ...current, [id]: draft }))} onScheduleDraftChange={(id, draft) => setScheduleDrafts((current) => ({ ...current, [id]: draft }))} onApprove={handleApproval} onScheduleApprove={handleScheduleApproval} onScheduleUploadFile={uploadLocalFileForSchedule} /></div>)}
              {shouldShowThinkingIndicator({ status, messages }) ? (
                <ThinkingIndicator label={getCurrentActivityLabel(messages[messages.length - 1])} />
              ) : null}
            </div>
            )}
            {error ? <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">elliot could not complete that request. Check the agent configuration and try again.</div> : null}
          </ConversationContent>
          {messages.length >= 4 ? <ConversationRail messages={messages} messageRefs={messageRefs} activeTurnId={activeTurnId ?? messages[0]?.id ?? null} onActiveChange={setActiveTurnId} onSelect={setActiveTurnId} /> : null}
        </Conversation>

        <div className="border-t border-border p-3">
          <PromptComposer status={status} onSubmit={handleSubmit} onStop={stop} mentionItems={contextEmails.filter((item) => item.id !== email?.id)} onMentionSelect={handleMentionSelect} />
          <p className="mt-2 text-center text-[11px] text-muted-foreground">Connected to {mailboxAddress}</p>
        </div>
      </div>
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
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateActiveRailItem);
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
    const top = viewport.scrollTop + targetRect.top - viewportRect.top - (viewport.clientHeight - targetRect.height) / 2;
    viewport.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <nav className="absolute inset-y-5 right-1 z-10 flex w-5 flex-col items-end justify-center gap-0" aria-label="Conversation turns">
      {messages.map((message) => {
        const text = message.parts.filter((part) => part.type === 'text').map((part) => part.text).join(' ').replace(/[#*_`>-]/g, '').replace(/\s+/g, ' ').trim();
        const nextAssistant = message.role === 'user' ? messages.slice(messages.indexOf(message) + 1).find((candidate) => candidate.role === 'assistant') : undefined;
        const responseText = nextAssistant?.parts.filter((part) => part.type === 'text').map((part) => part.text).join(' ').replace(/[#*_`>-]/g, '').replace(/\s+/g, ' ').trim();
        const label = truncateRailText(text || `${message.role} turn`, 56);
        const description = truncateRailText(responseText || (message.role === 'assistant' ? text : ''), 88);
        const isActive = message.id === activeTurnId;
        return <button key={message.id} type="button" title={label} aria-label={`Go to ${message.role} message${text ? `: ${text.slice(0, 80)}` : ''}`} onClick={() => selectRailItem(message.id)} className={cn('group relative z-0 h-2 w-4 rounded-sm transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring hover:z-50', isActive ? 'w-5' : 'hover:w-5')}><span className={cn('absolute right-0 top-1/2 h-px -translate-y-1/2 rounded-full transition-all', message.role === 'user' ? 'w-4 bg-foreground/45' : 'w-2.5 bg-muted-foreground/35', isActive && 'w-5 bg-foreground')} /><span className="pointer-events-none invisible absolute right-7 top-1/2 z-50 w-64 -translate-y-1/2 rounded-md border border-border bg-background px-3 py-2 text-left opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100"><span className="block truncate text-xs font-medium text-foreground">{label}</span>{description ? <span className="mt-0.5 block line-clamp-2 text-[11px] leading-4 text-muted-foreground">{description}</span> : null}</span></button>;
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
  mentionLabels,
  drafts,
  scheduleDrafts,
  onDraftChange,
  onScheduleDraftChange,
  onApprove,
  onScheduleApprove,
  onScheduleUploadFile,
  pendingApproval,
}: {
  message: UIMessage;
  mentionLabels: string[];
  drafts: Record<string, MockAgentAction>;
  scheduleDrafts: Record<string, ScheduleAgentAction>;
  onDraftChange: (id: string, draft: MockAgentAction) => void;
  onScheduleDraftChange: (id: string, draft: ScheduleAgentAction) => void;
  onApprove: (id: string, action: MockAgentAction, approved: boolean) => Promise<void>;
  onScheduleApprove: (id: string, action: ScheduleAgentAction, approved: boolean) => Promise<void>;
  onScheduleUploadFile: (
    file: File,
    projectId: string
  ) => Promise<{ fileId: string; fileName: string }>;
  pendingApproval: { id: string; approved: boolean } | null;
}) {
  const renderedParts: ReactNode[] = [];
  let textBuffer = '';
  const flushText = () => {
    if (!textBuffer) return;
    const text = textBuffer;
    textBuffer = '';
    renderedParts.push(<MessageBubble key={`${message.id}-text-${renderedParts.length}`} from={message.role} mentionLabels={mentionLabels}>{text}</MessageBubble>);
  };
  message.parts.forEach((part) => {
    if (part.type === 'text') {
      textBuffer += part.text;
      return;
    }
    flushText();
    if (part.type === 'tool-proposeEmailAction' && 'toolCallId' in part) {
      const toolPart = part as unknown as { toolCallId: string; state: string; input?: MockAgentAction; output?: string; errorText?: string };
      const action = drafts[toolPart.toolCallId] ?? toolPart.input;
      if (!action) {
        renderedParts.push(<div key={toolPart.toolCallId} className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground" role="status">Preparing an action for review…</div>);
        return;
      }
      renderedParts.push(<ActionCard key={toolPart.toolCallId} action={action} state={toolPart.state} output={toolPart.output} errorText={toolPart.errorText} processing={pendingApproval?.id === toolPart.toolCallId} processingApproved={pendingApproval?.id === toolPart.toolCallId ? pendingApproval.approved : undefined} onChange={(next) => onDraftChange(toolPart.toolCallId, next)} onApprove={(approved) => onApprove(toolPart.toolCallId, action, approved)} />);
      return;
    }
    if (part.type === 'tool-proposeProjectScheduleAction' && 'toolCallId' in part) {
      const toolPart = part as unknown as { toolCallId: string; state: string; input?: ScheduleAgentAction; output?: string; errorText?: string };
      const action = scheduleDrafts[toolPart.toolCallId] ?? toolPart.input;
      if (!action) {
        renderedParts.push(<div key={toolPart.toolCallId} className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground" role="status">Preparing a schedule action for review…</div>);
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
          processingApproved={pendingApproval?.id === toolPart.toolCallId ? pendingApproval.approved : undefined}
          onChange={(next) => onScheduleDraftChange(toolPart.toolCallId, next)}
          onApprove={(approved) => onScheduleApprove(toolPart.toolCallId, action, approved)}
          onUploadFile={onScheduleUploadFile}
        />
      );
    }
  });
  flushText();
  return <div className="space-y-2" aria-live={message.role === 'assistant' ? 'polite' : undefined}>{renderedParts}</div>;
}

function MessageBubble({ from, children, mentionLabels }: { from: UIMessage['role']; children: string; mentionLabels: string[] }) {
  return (
    <Message from={from}>
      <MessageContent className={cn('text-sm leading-6', from === 'user' ? 'ml-auto' : '')}>
        {from === 'user' ? (
          <div className="whitespace-pre-wrap break-words">
            <HighlightedMentions text={children} labels={mentionLabels} />
          </div>
        ) : (
          <MessageResponse
            className={cn(
              'prose prose-sm max-w-none leading-6 dark:prose-invert',
              // Trim the aggressive default prose spacing on the first / last
              // block so the assistant bubble doesn't have a big empty gap
              // above the first paragraph or below the last one.
              'prose-p:my-1.5 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5',
              '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0'
            )}
          >
            {children}
          </MessageResponse>
        )}
      </MessageContent>
    </Message>
  );
}

function HighlightedMentions({ text, labels }: { text: string; labels: string[] }) {
  const knownLabels = labels.filter(Boolean).sort((a, b) => b.length - a.length);
  if (knownLabels.length === 0) return text;
  const pattern = new RegExp(`(@(?:${knownLabels.map((label) => escapeRegExp(label)).join('|')}))`, 'g');
  return text.split(pattern).map((part, index) => {
    const isMention = part.startsWith('@') && knownLabels.some((label) => part === `@${label}`);
    return isMention ? <mark key={`${part}-${index}`} className="rounded-md bg-primary/10 px-1 py-0.5 font-medium text-primary ring-1 ring-inset ring-primary/15">{part}</mark> : <span key={`${part}-${index}`}>{part}</span>;
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const TOOL_ACTIVITY_LABELS: Record<string, string> = {
  lookupProjects: 'looking up projects',
  lookupPrimeChangeOrders: 'searching change orders',
  lookupScheduleEntries: 'checking existing schedule entries',
  lookupEmailAttachments: 'looking at attachments on this email',
  lookupCrossInboxAttachments: 'searching your mailboxes',
};

function isPendingToolPart(part: UIMessage['parts'][number]): boolean {
  if (!part || typeof part !== 'object' || !('type' in part)) return false;
  if (typeof part.type !== 'string' || !part.type.startsWith('tool-')) return false;
  const state = (part as { state?: string }).state;
  // Anything that hasn't produced an output-available/output-error result yet
  // is still in flight from the user's perspective.
  return state !== 'output-available' && state !== 'output-error';
}

function messageHasVisibleContent(message: UIMessage): boolean {
  return message.parts.some((part) => {
    if (!part || typeof part !== 'object' || !('type' in part)) return false;
    if (part.type === 'text') {
      const text = (part as { text?: string }).text;
      return !!text && text.length > 0;
    }
    return (
      part.type === 'tool-proposeEmailAction' ||
      part.type === 'tool-proposeProjectScheduleAction'
    );
  });
}

function getCurrentActivityLabel(message: UIMessage | undefined): string {
  if (!message || message.role !== 'assistant') return 'thinking';
  for (let index = message.parts.length - 1; index >= 0; index -= 1) {
    const part = message.parts[index];
    if (!isPendingToolPart(part)) continue;
    const toolName = (part as { type: string }).type.replace(/^tool-/, '');
    return TOOL_ACTIVITY_LABELS[toolName] ?? 'thinking';
  }
  return 'thinking';
}

function shouldShowThinkingIndicator({
  status,
  messages,
}: {
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  messages: UIMessage[];
}): boolean {
  if (status === 'ready' || status === 'error') return false;
  if (status === 'submitted') return true;
  // status === 'streaming' — show the indicator until the current assistant
  // message has something visible on screen (text, or a proposal card). Tool
  // lookups don't render anything themselves, so the bubble would otherwise
  // stay empty while elliot chains lookupProjects → lookupAttachments → …
  const last = messages[messages.length - 1];
  if (!last) return true;
  if (last.role === 'user') return true;
  return !messageHasVisibleContent(last);
}

function ThinkingIndicator({ label = 'thinking' }: { label?: string }) {
  return (
    <div
      className="flex items-center gap-2 px-1 py-1 text-xs text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
      <span>elliot is {label}</span>
      <span className="inline-flex gap-0.5" aria-hidden="true">
        <span className="animate-pulse">.</span>
        <span className="animate-pulse [animation-delay:150ms]">.</span>
        <span className="animate-pulse [animation-delay:300ms]">.</span>
      </span>
    </div>
  );
}

function ActionCard({
  action,
  state,
  output,
  errorText,
  processing,
  processingApproved,
  onChange,
  onApprove,
}: {
  action: MockAgentAction;
  state: string;
  output?: string;
  errorText?: string;
  processing: boolean;
  processingApproved?: boolean;
  onChange: (action: MockAgentAction) => void;
  onApprove: (approved: boolean) => Promise<void>;
}) {
  const isWaiting = state === 'input-available' || processing;
  const isRejected = output?.startsWith('REJECTED:') === true;
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-primary"><ActionIcon action={action.action} /></span>
        <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Review action</p><p className="mt-1 text-sm font-medium">{action.summary}</p></div>
      </div>
      {action.action === 'reply' && isWaiting ? <div className="mt-3 space-y-2"><label className="block text-xs font-medium" htmlFor={`subject-${action.messageIds[0]}`}>Subject</label><input id={`subject-${action.messageIds[0]}`} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring" value={action.subject ?? ''} onChange={(event) => onChange({ ...action, subject: event.target.value })} /><label className="block text-xs font-medium" htmlFor={`body-${action.messageIds[0]}`}>Reply</label><Textarea id={`body-${action.messageIds[0]}`} rows={5} value={action.body ?? ''} onChange={(event) => onChange({ ...action, body: event.target.value })} /></div> : null}
      {action.action === 'reply' && !isWaiting ? <p className="mt-3 whitespace-pre-wrap rounded-md bg-background p-3 text-sm text-muted-foreground">{action.body}</p> : null}
      {errorText ? <p className="mt-3 rounded-md bg-destructive/10 p-2 text-xs text-destructive">{errorText}</p> : null}
      {isWaiting ? <div className="mt-3 flex flex-wrap justify-end gap-2"><Button type="button" variant="ghost" size="sm" disabled={processing} onClick={() => void onApprove(false)}><X className="size-3.5" /> {processing && processingApproved === false ? 'Working…' : 'Reject'}</Button><Button type="button" variant="primary" size="sm" disabled={processing} onClick={() => void onApprove(true)}><Check className="size-3.5" /> {processing && processingApproved === true ? 'Working…' : 'Approve'}</Button></div> : null}
      {state === 'output-available' && output ? <p className={cn('mt-3 flex items-center gap-2 text-xs font-medium', isRejected ? 'text-muted-foreground' : 'text-emerald-700 dark:text-emerald-400')}><Check className="size-3.5" />{action.action === 'reply' ? (isRejected ? 'Reply rejected. No email was sent.' : 'Reply approved successfully.') : output}</p> : null}
    </div>
  );
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
  onUploadFile: (
    file: File,
    projectId: string
  ) => Promise<{ fileId: string; fileName: string }>;
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
          {isRemove ? <Trash2 className="size-4" aria-hidden="true" /> : <CalendarClock className="size-4" aria-hidden="true" />}
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
          <label className="flex flex-col gap-1 text-xs font-medium">
            <span className="text-muted-foreground">Date</span>
            <input
              type="date"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              value={action.date}
              onChange={(event) => onChange({ ...action, date: event.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            <span className="text-muted-foreground">Adjusted finish</span>
            <input
              type="date"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              value={action.adjustedFinishDate ?? ''}
              onChange={(event) =>
                onChange({ ...action, adjustedFinishDate: event.target.value || null })
              }
            />
          </label>
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
                <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
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
                    <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
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
                    <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
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
        <p className="mt-3 rounded-md bg-destructive/10 p-2 text-xs text-destructive">{errorText}</p>
      ) : null}

      {action.action === 'add_schedule' && !action.attachment && isWaiting ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Every schedule entry needs an attached file. Use the Attach button above to add one before creating this entry.
        </p>
      ) : null}

      {isWaiting ? (
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" disabled={processing} onClick={() => void onApprove(false)}>
            <X className="size-3.5" /> {processing && processingApproved === false ? 'Working…' : 'Reject'}
          </Button>
          <Button
            type="button"
            variant={isRemove ? 'destructive' : 'primary'}
            size="sm"
            disabled={
              processing ||
              (action.action === 'add_schedule' && !action.attachment)
            }
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

function PromptComposer({
  status,
  onSubmit,
  onStop,
  mentionItems,
  onMentionSelect,
}: {
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  onSubmit: (message: { text: string }) => void;
  onStop: () => void;
  mentionItems: EmailListItem[];
  onMentionSelect: (item: EmailListItem) => void;
}) {
  return <PromptInputProvider><PromptComposerFields status={status} onSubmit={onSubmit} onStop={onStop} mentionItems={mentionItems} onMentionSelect={onMentionSelect} /></PromptInputProvider>;
}

function PromptComposerFields({
  status,
  onSubmit,
  onStop,
  mentionItems,
  onMentionSelect,
}: Omit<Parameters<typeof PromptComposer>[0], never>) {
  const controller = usePromptInputController();
  const value = controller.textInput.value;
  const mentionMatch = value.match(/@([^\s]*)$/);
  const mentionQuery = mentionMatch?.[1]?.trim().toLowerCase() ?? '';
  const mentionCandidates = mentionMatch
    ? mentionItems.filter((item) => `${item.subject} ${item.senderName} ${item.senderEmail} ${item.preview}`.toLowerCase().includes(mentionQuery)).slice(0, 6)
    : [];
  const mentionKey = `${mentionQuery}|${mentionCandidates.map((item) => item.id).join('|')}`;
  const [mentionSelection, setMentionSelection] = useState({ key: '', index: 0 });
  const mentionIndex = mentionSelection.key === mentionKey ? mentionSelection.index : 0;
  const selectMention = (item: EmailListItem) => {
    const match = value.match(/@[^\s]*$/);
    const start = match?.index ?? value.length;
    const prefix = value.slice(0, start);
    controller.textInput.setInput(`${prefix}@${item.subject} `);
    onMentionSelect(item);
  };
  const handlePromptKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (!mentionCandidates.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setMentionSelection({ key: mentionKey, index: (mentionIndex + 1) % mentionCandidates.length });
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setMentionSelection({ key: mentionKey, index: (mentionIndex - 1 + mentionCandidates.length) % mentionCandidates.length });
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      selectMention(mentionCandidates[mentionIndex]);
    }
  };

  return <PromptInput className="rounded-2xl border border-border/80 bg-background p-2 shadow-none transition-colors focus-within:border-foreground/25 focus-within:ring-0" onSubmit={({ text }) => { const nextText = text.trim(); if (nextText) onSubmit({ text: nextText }); }}><PromptInputBody><div className="relative"><PromptInputTextarea id="elliot-agent-message" rows={2} onKeyDown={handlePromptKeyDown} className="scrollbar-hide block !min-h-0 max-h-48 resize-none !border-0 !bg-transparent px-2 pb-0 pt-1.5 text-sm leading-6 !shadow-none outline-none placeholder:text-muted-foreground/55 focus:!border-0 focus:!ring-0 focus-visible:!border-0 focus-visible:!ring-0" placeholder="Ask elliot…" /><PromptInputMentionMenu candidates={mentionCandidates} activeIndex={mentionIndex} onActiveIndexChange={(index) => setMentionSelection({ key: mentionKey, index })} onSelect={selectMention} /></div></PromptInputBody><PromptInputFooter className="mt-1 min-h-8 items-center gap-1"><PromptInputSubmit status={status} onStop={onStop} className="ml-auto !size-8 !rounded-full bg-foreground text-background shadow-none hover:bg-foreground/90">{status === 'ready' ? <ArrowUp className="size-4" aria-hidden="true" /> : undefined}</PromptInputSubmit></PromptInputFooter></PromptInput>;
}

function PromptInputMentionMenu({ candidates, activeIndex, onActiveIndexChange, onSelect }: { candidates: EmailListItem[]; activeIndex: number; onActiveIndexChange: (index: number) => void; onSelect: (item: EmailListItem) => void }) {
  if (!candidates.length) return null;
  return <div className="absolute bottom-full left-2 right-2 z-50 mb-2 overflow-hidden rounded-lg border border-border bg-background p-1 shadow-xl" role="listbox" aria-label="Thread references"><p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Add thread reference</p>{candidates.map((item, index) => <button key={item.id} type="button" role="option" aria-selected={index === activeIndex} className={cn('flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring', index === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent')} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => onActiveIndexChange(index)} onClick={() => onSelect(item)}><Mail className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /><span className="min-w-0"><span className="block truncate font-medium">{item.subject}</span><span className="block truncate text-muted-foreground">{item.senderName} · {item.preview}</span></span></button>)}</div>;
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <button type="button" className="flex size-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring" aria-label={label} onClick={onClick}>{children}</button>;
}

function PenNewRoundIcon({ className, 'aria-hidden': ariaHidden }: { className?: string; 'aria-hidden'?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden={ariaHidden}>
      <path d="m16.652 3.455l.649-.649A2.753 2.753 0 0 1 21.194 6.7l-.65.649m-3.892-3.893s.081 1.379 1.298 2.595c1.216 1.217 2.595 1.298 2.595 1.298m-3.893-3.893L10.687 9.42c-.404.404-.606.606-.78.829q-.308.395-.524.848c-.121.255-.211.526-.392 1.068L8.412 13.9m12.133-6.552l-5.965 5.965c-.404.404-.606.606-.829.78a4.6 4.6 0 0 1-.848.524c-.255.121-.526.211-1.068.392l-1.735.579m0 0l-1.123.374a.742.742 0 0 1-.939-.94l.374-1.122m1.688 1.688L8.412 13.9" />
      <path strokeLinecap="round" d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2" />
    </svg>
  );
}
