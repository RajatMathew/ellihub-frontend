import type { FormEvent } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Field, FieldLabel } from '@/app/components/ui/field';
import { InfiniteSearchSelect } from '@/app/components/ui/infinite-search-select';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import type {
  ScheduleTrackerDraft,
  ScheduleTrackerPrimeChangeOrderOption,
} from '@/modules/project/components/overview/schedule-tracker-types';
import { CalendarClock, FileText, Link2, Paperclip, X } from 'lucide-react';

const FIELD_LABEL_CLASS = 'text-xs font-semibold tracking-wide text-muted-foreground uppercase';

interface ScheduleTrackerEntryDialogProps {
  open: boolean;
  mode: 'add' | 'edit';
  draft: ScheduleTrackerDraft;
  isSaving: boolean;
  parentFolderId?: string;
  primeChangeOrderOptions: ScheduleTrackerPrimeChangeOrderOption[];
  primeChangeOrderSearch: string;
  onPrimeChangeOrderSearchChange: (value: string) => void;
  isPrimeChangeOrderFetchingNextPage: boolean;
  hasMorePrimeChangeOrders: boolean;
  onFetchMorePrimeChangeOrders: () => void;
  isLoadingPrimeChangeOrders: boolean;
  onAttach: () => void;
  onCancel: () => void;
  onChange: (draft: ScheduleTrackerDraft) => void;
  onSave: () => void;
}

export function ScheduleTrackerEntryDialog({
  open,
  mode,
  draft,
  isSaving,
  parentFolderId,
  primeChangeOrderOptions,
  primeChangeOrderSearch,
  onPrimeChangeOrderSearchChange,
  isPrimeChangeOrderFetchingNextPage,
  hasMorePrimeChangeOrders,
  onFetchMorePrimeChangeOrders,
  isLoadingPrimeChangeOrders,
  onAttach,
  onCancel,
  onChange,
  onSave,
}: ScheduleTrackerEntryDialogProps) {
  const canSave = !!draft.date && !!draft.description.trim() && !isSaving;
  const selectedPrimeChangeOrderOption =
    draft.primeChangeOrderId && draft.primeChangeOrderLabel
      ? {
          value: draft.primeChangeOrderId,
          label: draft.primeChangeOrderLabel,
        }
      : null;

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSaving) return;
    if (!nextOpen) onCancel();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canSave) onSave();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[min(88vh,760px)] w-[calc(100vw-1rem)] max-w-3xl gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="mb-0 border-b px-4 py-4 pr-12 sm:px-5 sm:pr-14">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <CalendarClock className="size-4" />
            </div>
            <div className="min-w-0 text-left">
              <DialogTitle className="text-base font-semibold sm:text-lg">
                {mode === 'edit' ? 'Edit Schedule Entry' : 'Add Schedule Entry'}
              </DialogTitle>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {mode === 'edit'
                  ? 'Update tracked schedule details'
                  : 'Create a tracked schedule event'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="schedule-entry-date" className={FIELD_LABEL_CLASS}>
                  Date
                </FieldLabel>
                <Input
                  id="schedule-entry-date"
                  type="date"
                  value={draft.date}
                  disabled={isSaving}
                  onChange={(event) => onChange({ ...draft, date: event.target.value })}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="schedule-entry-adjusted-finish" className={FIELD_LABEL_CLASS}>
                  Adjusted Finish
                </FieldLabel>
                <Input
                  id="schedule-entry-adjusted-finish"
                  type="date"
                  value={draft.adjustedFinishDate}
                  disabled={isSaving}
                  onChange={(event) =>
                    onChange({ ...draft, adjustedFinishDate: event.target.value })
                  }
                />
              </Field>

              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="schedule-entry-description" className={FIELD_LABEL_CLASS}>
                  Description
                </FieldLabel>
                <Input
                  id="schedule-entry-description"
                  value={draft.description}
                  placeholder="Description"
                  autoComplete="off"
                  disabled={isSaving}
                  onChange={(event) => onChange({ ...draft, description: event.target.value })}
                />
              </Field>

              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="schedule-entry-prime-co" className={FIELD_LABEL_CLASS}>
                  Prime Change Order
                </FieldLabel>
                <div className="flex items-center gap-2">
                  <InfiniteSearchSelect
                    options={primeChangeOrderOptions}
                    value={draft.primeChangeOrderId || null}
                    selectedOption={selectedPrimeChangeOrderOption}
                    onValueChange={(value) => {
                      const selected = primeChangeOrderOptions.find(
                        (option) => option.value === value
                      );

                      onChange({
                        ...draft,
                        primeChangeOrderId: value ?? '',
                        primeChangeOrderLabel: value
                          ? (selected?.label ?? draft.primeChangeOrderLabel)
                          : '',
                      });
                    }}
                    onOptionChange={(option) => {
                      onChange({
                        ...draft,
                        primeChangeOrderId: option?.value ?? '',
                        primeChangeOrderLabel: option?.label ?? '',
                      });
                    }}
                    search={primeChangeOrderSearch}
                    onSearchChange={onPrimeChangeOrderSearchChange}
                    isLoading={isLoadingPrimeChangeOrders}
                    isFetchingNextPage={isPrimeChangeOrderFetchingNextPage}
                    hasNextPage={hasMorePrimeChangeOrders}
                    onFetchNextPage={onFetchMorePrimeChangeOrders}
                    placeholder="Select Prime CO"
                    searchPlaceholder="Search Prime CO..."
                    emptyMessage={
                      isLoadingPrimeChangeOrders ? 'Loading Prime COs...' : 'No Prime COs found.'
                    }
                    disabled={isSaving}
                    triggerClassName="h-9"
                    testId="schedule-entry-prime-co"
                  />
                  {draft.primeChangeOrderId && (
                    <Button
                      variant="outline"
                      mode="icon"
                      size="md"
                      type="button"
                      aria-label="Clear prime change order"
                      disabled={isSaving}
                      onClick={() =>
                        onChange({
                          ...draft,
                          primeChangeOrderId: '',
                          primeChangeOrderLabel: '',
                        })
                      }
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              </Field>

              <Field className="sm:col-span-2">
                <FieldLabel className={FIELD_LABEL_CLASS}>Attachment</FieldLabel>
                <div className="flex flex-col gap-3 rounded-md border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
                      {draft.fileName ? (
                        <FileText className="size-4" />
                      ) : (
                        <Link2 className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {draft.fileName || 'No file attached'}
                      </p>
                      {!parentFolderId && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Project folder is not available.
                        </p>
                      )}
                    </div>
                  </div>
                  {parentFolderId && (
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      disabled={isSaving}
                      onClick={onAttach}
                      className="w-full shrink-0 sm:w-auto"
                    >
                      <Paperclip className="size-3.5" />
                      {draft.fileName ? 'Replace' : 'Attach'}
                    </Button>
                  )}
                </div>
              </Field>

              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="schedule-entry-notes" className={FIELD_LABEL_CLASS}>
                  Notes
                </FieldLabel>
                <Textarea
                  id="schedule-entry-notes"
                  value={draft.notes}
                  placeholder="Notes"
                  rows={4}
                  disabled={isSaving}
                  onChange={(event) => onChange({ ...draft, notes: event.target.value })}
                />
              </Field>
            </div>
          </DialogBody>

          <DialogFooter className="border-t px-4 py-3 sm:px-5">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!canSave}>
              {isSaving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
