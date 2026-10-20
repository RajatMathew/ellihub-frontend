import { useId, useState } from 'react';

import { InfiniteSearchSelect } from '@/app/components/ui/infinite-search-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { useLookupsQuery } from '@/modules/project/hooks/lookup.hooks';
import {
  usePurchaseOrderPickerOptions,
  type ProjectPickerOption,
} from '@/modules/project/hooks/use-project-picker-options';

/**
 * The change order's PO, picked the way the change order form picks it: the project's POs,
 * searchable, each with its vendor and total (elli-ui#1485). Elliot's choice is the starting
 * selection; picking another hands back that PO's vendor too.
 */
export function RecordScoPoSelect({
  projectId,
  purchaseOrderId,
  poNumber,
  disabled,
  onChange,
}: {
  projectId: string;
  purchaseOrderId: string;
  poNumber: string;
  disabled: boolean;
  onChange: (po: { id: string; poNumber: string | null; vendorName: string | null }) => void;
}) {
  const [search, setSearch] = useState('');
  const selected: ProjectPickerOption = { value: purchaseOrderId, label: poNumber };
  const picker = usePurchaseOrderPickerOptions({
    projectId,
    search,
    selectedOptions: [selected],
    queryScope: 'elliot-sco-po-picker',
    // A decided card shows the saved PO and needs no list.
    enabled: !disabled,
  });

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-muted-foreground">PO</span>
      <InfiniteSearchSelect
        options={picker.options}
        value={purchaseOrderId}
        selectedOption={selected}
        onValueChange={() => undefined}
        onOptionChange={(option) => {
          if (!option) return;
          const po = picker.items.find((item) => item.id === option.value);
          onChange({
            id: option.value,
            poNumber: po?.poNumber ?? option.label,
            vendorName: po?.vendor?.name ?? null,
          });
        }}
        search={search}
        onSearchChange={setSearch}
        isLoading={picker.isLoading}
        isFetchingNextPage={picker.isFetchingNextPage}
        hasNextPage={picker.hasNextPage}
        onFetchNextPage={picker.fetchNextPage}
        disabled={disabled}
        placeholder="Choose a PO"
        searchPlaceholder="Search POs…"
        emptyMessage="No POs on this project."
        // A step smaller than the shared picker, to sit with the card's own text.
        contentClassName="[&_[cmdk-input]]:h-9 [&_[cmdk-input]]:text-[13px] [&_[cmdk-item]]:py-1 [&_[cmdk-item]]:text-[13px] [&_[cmdk-item]_.text-xs]:text-[11px] [&_[data-slot=badge]]:h-4 [&_[data-slot=badge]]:px-1 [&_[data-slot=badge]]:text-[0.5625rem]"
      />
    </div>
  );
}

/** The change type, from the same lookup the change order form uses. */
export function RecordScoChangeTypeSelect({
  changeTypeId,
  changeTypeLabel,
  disabled,
  onChange,
}: {
  changeTypeId: string;
  changeTypeLabel: string;
  disabled: boolean;
  onChange: (changeType: { id: string; label: string }) => void;
}) {
  const id = useId();
  const { data: changeTypes } = useLookupsQuery('SCO_CHANGE_TYPE');
  const options = (changeTypes ?? []).map((changeType) => ({
    value: changeType.id,
    label: String(changeType.label ?? changeType.name ?? changeType.code ?? changeType.id),
  }));
  // Elliot's pick stays listed while the lookup loads, so the field never reads empty.
  if (!options.some((option) => option.value === changeTypeId)) {
    options.unshift({ value: changeTypeId, label: changeTypeLabel });
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        Change type
      </label>
      <Select
        value={changeTypeId}
        disabled={disabled}
        onValueChange={(next) => {
          const option = options.find((candidate) => candidate.value === next);
          if (option) onChange({ id: option.value, label: option.label });
        }}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
