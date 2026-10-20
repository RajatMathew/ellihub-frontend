import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { cn } from '@/app/lib/utils';
import type { EmailMeetingEvent, EmailMeetingResponseAction } from '@/modules/email/api';
import { format, isSameDay, isValid, parseISO } from 'date-fns';
import {
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CalendarX2,
  MapPin,
  Pencil,
  Users,
  Video,
} from 'lucide-react';

type UpdateMeetingInput = {
  subject: string;
  startAt: string;
  endAt: string;
  location: string;
};

interface EmailMeetingEventCardProps {
  event: EmailMeetingEvent;
  messageId: string;
  isResponding?: boolean;
  isUpdating?: boolean;
  isCancelling?: boolean;
  onRespond?: (
    messageId: string,
    response: EmailMeetingResponseAction
  ) => Promise<EmailMeetingEvent>;
  onUpdate?: (messageId: string, input: UpdateMeetingInput) => Promise<EmailMeetingEvent>;
  onCancel?: (messageId: string, comment?: string) => Promise<EmailMeetingEvent>;
}

export function EmailMeetingEventCard({
  event,
  messageId,
  isResponding = false,
  isUpdating = false,
  isCancelling = false,
  onRespond,
  onUpdate,
  onCancel,
}: EmailMeetingEventCardProps) {
  const [eventOverride, setEventOverride] = useState<EmailMeetingEvent | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);

  const displayEvent = eventOverride ?? event;
  const isPending = isResponding || isUpdating || isCancelling;
  const schedule = formatMeetingSchedule(displayEvent.startAt, displayEvent.endAt);
  const attendeeSummary = formatAttendeeSummary(displayEvent);
  // Outlook deletes a declined meeting from the calendar, so there is no event
  // left to accept — the response buttons would only fail with "not found".
  const isDeclined =
    !displayEvent.isOrganizer &&
    !displayEvent.isCancelled &&
    displayEvent.responseStatus === 'declined';

  const respond = async (response: EmailMeetingResponseAction) => {
    if (!onRespond || isPending) return;
    setEventOverride(await onRespond(messageId, response));
  };

  return (
    <section
      className="overflow-hidden rounded-xl border border-border bg-background"
      aria-label="Meeting details"
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarDays aria-hidden="true" className="size-5" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">
                {displayEvent.subject}
              </h2>
              <p className="mt-1 text-sm font-medium text-foreground">{schedule}</p>
              {(displayEvent.isOrganizer || displayEvent.organizerName) && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {displayEvent.isOrganizer
                    ? 'Organized by you'
                    : `Organized by ${displayEvent.organizerName}`}
                </p>
              )}
              {displayEvent.location && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                  <span className="truncate">{displayEvent.location}</span>
                </p>
              )}
              {attendeeSummary && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users aria-hidden="true" className="size-3.5 shrink-0" />
                  <span>{attendeeSummary}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {!displayEvent.isCancelled && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {displayEvent.joinUrl && (
              <Button asChild size="sm" className="min-h-10">
                <a href={displayEvent.joinUrl} target="_blank" rel="noreferrer">
                  <Video aria-hidden="true" className="size-4" />
                  Join
                </a>
              </Button>
            )}
            {displayEvent.isOrganizer ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-10"
                  disabled={isPending || !onUpdate}
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil aria-hidden="true" className="size-4" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-10 text-destructive hover:text-destructive"
                  disabled={isPending || !onCancel}
                  onClick={() => setCancelOpen(true)}
                >
                  <CalendarX2 aria-hidden="true" className="size-4" />
                  Cancel
                </Button>
              </>
            ) : isDeclined ? null : (
              <MeetingResponseButtons
                response={displayEvent.responseStatus}
                disabled={isPending || !onRespond}
                onRespond={(response) =>
                  // Outlook deletes a declined meeting from the calendar, so it
                  // cannot be accepted again afterwards — warn before it goes.
                  response === 'declined' ? setDeclineOpen(true) : void respond(response)
                }
              />
            )}
          </div>
        )}
      </div>

      {displayEvent.isCancelled && (
        <div className="flex min-h-10 items-center gap-2 border-t border-border bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive">
          <CalendarX2 aria-hidden="true" className="size-4" />
          This meeting was cancelled.
        </div>
      )}

      {isDeclined && (
        <div className="flex min-h-10 items-start gap-2 border-t border-border bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
          <CalendarX2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-medium text-foreground">You declined this meeting.</span> Outlook
            removed it from your calendar, so it can't be accepted again. Ask the organizer to send
            a new invitation if you change your mind.
          </p>
        </div>
      )}

      {editOpen && (
        <EditMeetingDialog
          open
          event={displayEvent}
          isSaving={isUpdating}
          onOpenChange={setEditOpen}
          onSave={async (input) => {
            if (!onUpdate) return;
            setEventOverride(await onUpdate(messageId, input));
            setEditOpen(false);
          }}
        />
      )}
      {declineOpen && (
        <DeclineMeetingDialog
          open
          isDeclining={isResponding}
          onOpenChange={setDeclineOpen}
          onDecline={async () => {
            await respond('declined');
            setDeclineOpen(false);
          }}
        />
      )}
      {cancelOpen && (
        <CancelMeetingDialog
          open
          isCancelling={isCancelling}
          onOpenChange={setCancelOpen}
          onCancel={async (comment) => {
            if (!onCancel) return;
            setEventOverride(await onCancel(messageId, comment));
            setCancelOpen(false);
          }}
        />
      )}
    </section>
  );
}

function MeetingResponseButtons({
  response,
  disabled,
  onRespond,
}: {
  response: EmailMeetingEvent['responseStatus'];
  disabled: boolean;
  onRespond: (response: EmailMeetingResponseAction) => void;
}) {
  const actions = [
    { value: 'accepted' as const, label: 'Accept', icon: CalendarCheck2 },
    { value: 'tentative' as const, label: 'Tentative', icon: CalendarClock },
    { value: 'declined' as const, label: 'Decline', icon: CalendarX2 },
  ];

  return actions.map(({ value, label, icon: Icon }) => (
    <Button
      key={value}
      type="button"
      variant={response === value ? 'secondary' : 'outline'}
      size="sm"
      className={cn('min-h-10', response === value && 'border-primary/30 text-primary')}
      disabled={disabled}
      aria-pressed={response === value}
      onClick={() => onRespond(value)}
    >
      <Icon aria-hidden="true" className="size-4" />
      {label}
    </Button>
  ));
}

function EditMeetingDialog({
  open,
  event,
  isSaving,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  event: EmailMeetingEvent;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: UpdateMeetingInput) => Promise<void>;
}) {
  const [subject, setSubject] = useState(event.subject);
  const [startAt, setStartAt] = useState(toDateTimeLocal(event.startAt));
  const [endAt, setEndAt] = useState(toDateTimeLocal(event.endAt));
  const [location, setLocation] = useState(event.location ?? '');
  const invalidTime = Boolean(startAt && endAt && new Date(endAt) <= new Date(startAt));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit meeting</DialogTitle>
          <DialogDescription>Changes are sent to everyone invited.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(submitEvent) => {
            submitEvent.preventDefault();
            if (invalidTime) return;
            void onSave({
              subject: subject.trim(),
              startAt: new Date(startAt).toISOString(),
              endAt: new Date(endAt).toISOString(),
              location: location.trim(),
            });
          }}
        >
          <DialogBody className="space-y-4">
            <MeetingField label="Title" htmlFor="meeting-subject">
              <Input
                id="meeting-subject"
                value={subject}
                maxLength={255}
                required
                onChange={(inputEvent) => setSubject(inputEvent.target.value)}
              />
            </MeetingField>
            <div className="grid gap-4 sm:grid-cols-2">
              <MeetingField label="Starts" htmlFor="meeting-start">
                <Input
                  id="meeting-start"
                  type="datetime-local"
                  value={startAt}
                  required
                  onChange={(inputEvent) => setStartAt(inputEvent.target.value)}
                />
              </MeetingField>
              <MeetingField
                label="Ends"
                htmlFor="meeting-end"
                error={invalidTime ? 'End time must be after the start time.' : undefined}
              >
                <Input
                  id="meeting-end"
                  type="datetime-local"
                  value={endAt}
                  required
                  aria-invalid={invalidTime || undefined}
                  aria-describedby={invalidTime ? 'meeting-end-error' : undefined}
                  onChange={(inputEvent) => setEndAt(inputEvent.target.value)}
                />
              </MeetingField>
            </div>
            <MeetingField label="Location" htmlFor="meeting-location">
              <Input
                id="meeting-location"
                value={location}
                maxLength={255}
                onChange={(inputEvent) => setLocation(inputEvent.target.value)}
              />
            </MeetingField>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-10"
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              type="submit"
              className="min-h-10"
              disabled={isSaving || invalidTime || !subject.trim()}
              aria-busy={isSaving}
            >
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CancelMeetingDialog({
  open,
  isCancelling,
  onOpenChange,
  onCancel,
}: {
  open: boolean;
  isCancelling: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: (comment?: string) => Promise<void>;
}) {
  const [comment, setComment] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel this meeting?</DialogTitle>
          <DialogDescription>Everyone invited will receive a cancellation.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <MeetingField label="Message to attendees (optional)" htmlFor="meeting-cancel-comment">
            <Textarea
              id="meeting-cancel-comment"
              value={comment}
              maxLength={2000}
              rows={4}
              onChange={(event) => setComment(event.target.value)}
            />
          </MeetingField>
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="min-h-10"
            disabled={isCancelling}
            onClick={() => onOpenChange(false)}
          >
            Keep meeting
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="min-h-10"
            disabled={isCancelling}
            aria-busy={isCancelling}
            onClick={() => void onCancel(comment.trim() || undefined)}
          >
            {isCancelling ? 'Cancelling…' : 'Cancel meeting'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeclineMeetingDialog({
  open,
  isDeclining,
  onOpenChange,
  onDecline,
}: {
  open: boolean;
  isDeclining: boolean;
  onOpenChange: (open: boolean) => void;
  onDecline: () => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Decline this meeting?</DialogTitle>
          <DialogDescription>
            Outlook removes declined meetings from your calendar. You won't be able to accept it
            later — the organizer would need to send a new invitation.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="min-h-10"
            disabled={isDeclining}
            onClick={() => onOpenChange(false)}
          >
            Keep invitation
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="min-h-10"
            disabled={isDeclining}
            aria-busy={isDeclining}
            onClick={() => void onDecline()}
          >
            {isDeclining ? 'Declining…' : 'Decline meeting'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MeetingField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function toDateTimeLocal(value: string) {
  const date = parseISO(value);
  return isValid(date) ? format(date, "yyyy-MM-dd'T'HH:mm") : '';
}

function formatMeetingSchedule(startValue: string, endValue: string) {
  const start = parseISO(startValue);
  const end = parseISO(endValue);
  if (!isValid(start) || !isValid(end)) return 'Meeting time unavailable';
  return isSameDay(start, end)
    ? `${format(start, 'EEE, MMM d · h:mm a')}–${format(end, 'h:mm a')}`
    : `${format(start, 'EEE, MMM d · h:mm a')} – ${format(end, 'EEE, MMM d · h:mm a')}`;
}

function formatAttendeeSummary(event: EmailMeetingEvent) {
  if (event.attendees.length === 0) return null;
  const counts = event.attendees.reduce<Record<string, number>>((result, attendee) => {
    result[attendee.response] = (result[attendee.response] ?? 0) + 1;
    return result;
  }, {});
  const parts = [
    counts.accepted ? `${counts.accepted} accepted` : null,
    counts.tentative ? `${counts.tentative} tentative` : null,
    counts.declined ? `${counts.declined} declined` : null,
    (counts.none ?? 0) + (counts.notResponded ?? 0) > 0
      ? `${(counts.none ?? 0) + (counts.notResponded ?? 0)} awaiting response`
      : null,
  ].filter(Boolean);
  return parts.join(' · ');
}
