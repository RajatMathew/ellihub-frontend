import { useState } from 'react';

import { InfiniteSearchSelect } from '@/app/components/ui/infinite-search-select';
import {
  useRFQPickerOptions,
  type ProjectPickerOption,
} from '@/modules/project/hooks/use-project-picker-options';

/**
 * The PO's linked RFQ, picked the way the PO form picks it: awarded RFQs on
 * the project, searchable, through the shared select rather than a text box.
 * Elliot's choice is the starting selection.
 */
export function RecordRfqSelect({
  projectId,
  rfqId,
  rfqNumber,
  disabled,
  onChange,
}: {
  projectId: string;
  rfqId: string | null;
  rfqNumber: string | null;
  disabled: boolean;
  onChange: (rfq: { rfqId: string | null; rfqNumber: string | null }) => void;
}) {
  const [search, setSearch] = useState('');
  const selected: ProjectPickerOption | null =
    rfqId && rfqNumber ? { value: rfqId, label: rfqNumber } : null;
  const picker = useRFQPickerOptions({
    projectId,
    search,
    status: 'AWARDED',
    selectedOptions: selected ? [selected] : [],
    queryScope: 'elliot-po-rfq-picker',
    // Only fetch once the user opens the card for editing; a decided card
    // shows the saved value and needs no list.
    enabled: !disabled,
  });

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-muted-foreground">Linked RFQ</span>
      <InfiniteSearchSelect
        options={picker.options}
        value={rfqId}
        selectedOption={selected}
        onValueChange={() => undefined}
        onOptionChange={(option) =>
          onChange({ rfqId: option?.value ?? null, rfqNumber: option?.label ?? null })
        }
        search={search}
        onSearchChange={setSearch}
        isLoading={picker.isLoading}
        isFetchingNextPage={picker.isFetchingNextPage}
        hasNextPage={picker.hasNextPage}
        onFetchNextPage={picker.fetchNextPage}
        disabled={disabled}
        placeholder="No linked RFQ"
        searchPlaceholder="Search awarded RFQs…"
        emptyMessage="No awarded RFQs on this project."
      />
    </div>
  );
}
