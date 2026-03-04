import { useState } from 'react';
import { Trash2 } from 'lucide-react';

import { Button } from '@app/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTable,
  CardTitle,
  CardToolbar,
} from '@app/components/ui/card';
import { Input } from '@app/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@app/components/ui/table';
import { formatDate } from '@app/lib/helpers';

import {
  useCreateScheduleEntryMutation,
  useUpdateScheduleEntryMutation,
  useDeleteScheduleEntryMutation,
} from '@modules/project/hooks';
import type { ProjectScheduleEntry } from '@modules/project/schemas/project-schedule.schema';
import type { PrimeContract } from '@modules/project/schemas/project-contract.schema';

interface ScheduleTrackerCardProps {
  projectId: string;
  contract: PrimeContract | undefined;
  entries: ProjectScheduleEntry[];
  isLoading: boolean;
}

interface EditingState {
  id: string;
  date: string;
  description: string;
  adjustedStartDate: string;
  adjustedFinishDate: string;
  notes: string;
}

export function ScheduleTrackerCard({
  projectId,
  contract,
  entries,
  isLoading,
}: ScheduleTrackerCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: '',
    description: '',
    adjustedStartDate: '',
    adjustedFinishDate: '',
    notes: '',
  });
  const [editingEntry, setEditingEntry] = useState<EditingState | null>(null);

  const createMutation = useCreateScheduleEntryMutation();
  const updateMutation = useUpdateScheduleEntryMutation();
  const deleteMutation = useDeleteScheduleEntryMutation();

  const handleAddEntry = async () => {
    if (!newEntry.date || !newEntry.description) return;
    await createMutation.mutateAsync({
      projectId,
      data: {
        date: newEntry.date,
        description: newEntry.description,
        adjustedStartDate: newEntry.adjustedStartDate || undefined,
        adjustedFinishDate: newEntry.adjustedFinishDate || undefined,
        notes: newEntry.notes || undefined,
      },
    });
    setNewEntry({ date: '', description: '', adjustedStartDate: '', adjustedFinishDate: '', notes: '' });
    setIsAdding(false);
  };

  const handleStartEdit = (entry: ProjectScheduleEntry) => {
    setEditingEntry({
      id: entry.id,
      date: entry.date ?? '',
      description: entry.description ?? '',
      adjustedStartDate: entry.adjustedStartDate ?? '',
      adjustedFinishDate: entry.adjustedFinishDate ?? '',
      notes: entry.notes ?? '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    await updateMutation.mutateAsync({
      projectId,
      entryId: editingEntry.id,
      data: {
        date: editingEntry.date || undefined,
        description: editingEntry.description || undefined,
        adjustedStartDate: editingEntry.adjustedStartDate || null,
        adjustedFinishDate: editingEntry.adjustedFinishDate || null,
        notes: editingEntry.notes || null,
      },
    });
    setEditingEntry(null);
  };

  const handleDeleteEntry = async (entryId: string) => {
    await deleteMutation.mutateAsync({ projectId, entryId });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Schedule Tracker
        </CardTitle>
        <CardToolbar>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAdding(true)}
            disabled={isAdding}
          >
            + Add Entry
          </Button>
        </CardToolbar>
      </CardHeader>

      {(contract?.estimatedStartDate || contract?.estimatedCompletionDate || contract?.actualStartDate || contract?.actualCompletionDate) && (
        <CardContent className="px-5 pt-4 pb-0">
          <div className="flex flex-wrap gap-6 text-sm">
            {contract?.estimatedStartDate && (
              <div>
                <span className="text-xs text-muted-foreground">Est. Start Date</span>
                <p className="font-medium">{formatDate(contract.estimatedStartDate)}</p>
              </div>
            )}
            {contract?.estimatedCompletionDate && (
              <div>
                <span className="text-xs text-muted-foreground">Est. Completion Date</span>
                <p className="font-medium">{formatDate(contract.estimatedCompletionDate)}</p>
              </div>
            )}
            {contract?.actualStartDate && (
              <div>
                <span className="text-xs text-muted-foreground">Actual Start Date</span>
                <p className="font-medium">{formatDate(contract.actualStartDate)}</p>
              </div>
            )}
            {contract?.actualCompletionDate && (
              <div>
                <span className="text-xs text-muted-foreground">Actual Completion Date</span>
                <p className="font-medium">{formatDate(contract.actualCompletionDate)}</p>
              </div>
            )}
          </div>
        </CardContent>
      )}

      <CardTable>
        {isLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-8 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Adj. Start</TableHead>
                <TableHead>Adj. Finish</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) =>
                editingEntry?.id === entry.id ? (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Input
                        type="date"
                        variant="sm"
                        value={editingEntry.date}
                        onChange={(e) =>
                          setEditingEntry({ ...editingEntry, date: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        variant="sm"
                        value={editingEntry.description}
                        onChange={(e) =>
                          setEditingEntry({
                            ...editingEntry,
                            description: e.target.value,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        variant="sm"
                        value={editingEntry.adjustedStartDate}
                        onChange={(e) =>
                          setEditingEntry({
                            ...editingEntry,
                            adjustedStartDate: e.target.value,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        variant="sm"
                        value={editingEntry.adjustedFinishDate}
                        onChange={(e) =>
                          setEditingEntry({
                            ...editingEntry,
                            adjustedFinishDate: e.target.value,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        variant="sm"
                        value={editingEntry.notes}
                        onChange={(e) =>
                          setEditingEntry({ ...editingEntry, notes: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={updateMutation.isPending}
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingEntry(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer"
                    onClick={() => handleStartEdit(entry)}
                  >
                    <TableCell>{entry.date ? formatDate(entry.date) : '—'}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell>
                      {entry.adjustedStartDate
                        ? formatDate(entry.adjustedStartDate)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {entry.adjustedFinishDate
                        ? formatDate(entry.adjustedFinishDate)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.notes || '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        mode="icon"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEntry(entry.id);
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ),
              )}

              {isAdding && (
                <TableRow>
                  <TableCell>
                    <Input
                      type="date"
                      variant="sm"
                      value={newEntry.date}
                      onChange={(e) =>
                        setNewEntry({ ...newEntry, date: e.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      variant="sm"
                      placeholder="Description"
                      value={newEntry.description}
                      onChange={(e) =>
                        setNewEntry({ ...newEntry, description: e.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      variant="sm"
                      value={newEntry.adjustedStartDate}
                      onChange={(e) =>
                        setNewEntry({
                          ...newEntry,
                          adjustedStartDate: e.target.value,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      variant="sm"
                      value={newEntry.adjustedFinishDate}
                      onChange={(e) =>
                        setNewEntry({
                          ...newEntry,
                          adjustedFinishDate: e.target.value,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      variant="sm"
                      placeholder="Notes"
                      value={newEntry.notes}
                      onChange={(e) =>
                        setNewEntry({ ...newEntry, notes: e.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleAddEntry}
                        disabled={
                          createMutation.isPending ||
                          !newEntry.date ||
                          !newEntry.description
                        }
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsAdding(false);
                          setNewEntry({
                            date: '',
                            description: '',
                            adjustedStartDate: '',
                            adjustedFinishDate: '',
                            notes: '',
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {entries.length === 0 && !isAdding && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    No schedule entries. Click &quot;+ Add Entry&quot; to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardTable>
    </Card>
  );
}
