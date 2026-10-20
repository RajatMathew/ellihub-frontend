import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/app/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/lib/utils';
import {
  formatRegisterMoney,
  getAccountDescription,
} from '@/modules/finance/lib/checking-register.utils';
import type { QuickBooksRegisterAccount } from '@/modules/integrations/schemas/quickbooks.schema';
import { ChevronsUpDown, Landmark } from 'lucide-react';

interface RegisterAccountComboboxProps {
  accounts: QuickBooksRegisterAccount[];
  selectedAccount: QuickBooksRegisterAccount | null;
  isLoading: boolean;
  isError: boolean;
  onSelect: (account: QuickBooksRegisterAccount) => void;
}

export function RegisterAccountCombobox({
  accounts,
  selectedAccount,
  isLoading,
  isError,
  onSelect,
}: RegisterAccountComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setSearch('');
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-3 w-48 max-w-full" />
      </div>
    );
  }

  const disabled = isError || accounts.length === 0;
  const placeholder = isError
    ? 'Accounts unavailable'
    : accounts.length === 0
      ? 'No bank accounts'
      : 'Select bank account';

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-label="Select checking account"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            '-ms-2 h-auto w-full justify-between gap-3 px-2 py-1.5 text-left sm:w-96',
            'hover:bg-accent data-[state=open]:bg-accent'
          )}
        >
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                'block truncate text-xl font-semibold leading-tight sm:text-2xl',
                !selectedAccount && 'text-muted-foreground'
              )}
            >
              {selectedAccount?.name ?? placeholder}
            </span>
            {selectedAccount && (
              <span className="mt-1 block truncate text-xs font-normal text-muted-foreground">
                {getAccountDescription(selectedAccount)} · QB {selectedAccount.qbId}
              </span>
            )}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-(--radix-popover-trigger-width) overflow-hidden p-0"
      >
        <Command>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search bank accounts..."
          />
          <CommandList className="max-h-96">
            <CommandEmpty>No bank accounts found.</CommandEmpty>
            <CommandGroup heading="Bank accounts">
              {accounts.map((account) => {
                const isSelected = account.id === selectedAccount?.id;
                const description = getAccountDescription(account);

                return (
                  <CommandItem
                    key={account.id}
                    value={account.id}
                    keywords={[
                      account.name,
                      account.fullyQualifiedName ?? '',
                      account.accountSubType ?? '',
                      account.qbId,
                      account.currencyCode ?? '',
                    ]}
                    onSelect={() => {
                      onSelect(account);
                      setOpen(false);
                    }}
                    className={cn(
                      'grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-3 py-2.5',
                      isSelected && 'bg-primary-soft'
                    )}
                  >
                    <span className="flex size-8 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
                      <Landmark className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{account.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {description} · QB {account.qbId}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 pt-0.5">
                      <span className="whitespace-nowrap text-sm font-semibold tabular-nums">
                        {formatRegisterMoney(account.currentBalance, account.currencyCode)}
                      </span>
                      {isSelected && <CommandCheck aria-label="Selected account" />}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
