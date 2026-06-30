import { useCallback, useMemo, useRef, useState } from 'react';

import type { Ref } from 'react';

import { Input } from '@/app/components/ui/input';

type NumberInputProps = Omit<
  React.ComponentProps<typeof Input>,
  'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange' | 'ref'
> & {
  value: number;
  onValueChange: (value: number) => void;
  decimalPlaces?: number;
  min?: number;
  max?: number;
  emptyValue?: number;
  useGrouping?: boolean;
  locale?: string;
  ref?: Ref<HTMLInputElement>;
};

export function NumberInput({
  value,
  onValueChange,
  decimalPlaces = 0,
  min,
  max,
  emptyValue = 0,
  useGrouping = false,
  locale = 'en-US',
  onBlur,
  onFocus,
  ref,
  ...props
}: NumberInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const normalizedDecimalPlaces = Math.max(0, Math.trunc(decimalPlaces));
  const numberFormatter = useMemo(
    () =>
      useGrouping
        ? new Intl.NumberFormat(locale, {
            useGrouping: true,
            maximumFractionDigits: normalizedDecimalPlaces,
          })
        : null,
    [locale, normalizedDecimalPlaces, useGrouping]
  );
  const [inputValue, setInputValue] = useState(() =>
    formatNumberInputValue(value, numberFormatter)
  );
  const [isFocused, setIsFocused] = useState(false);
  const displayValue = isFocused ? inputValue : formatNumberInputValue(value, numberFormatter);
  const setInputRefs = useCallback(
    (element: HTMLInputElement | null) => {
      inputRef.current = element;
      setRefValue(ref, element);
    },
    [ref]
  );

  const scheduleCaretPosition = useCallback((position: number) => {
    if (typeof window === 'undefined') return;

    window.requestAnimationFrame(() => {
      inputRef.current?.setSelectionRange(position, position);
    });
  }, []);

  return (
    <Input
      {...props}
      ref={setInputRefs}
      type="text"
      inputMode={normalizedDecimalPlaces > 0 ? 'decimal' : 'numeric'}
      value={displayValue}
      onChange={(event) => {
        const nextValue = event.target.value;
        const caretOffset = getNumericDraftOffset(
          nextValue,
          event.target.selectionStart ?? nextValue.length
        );

        if (nextValue === '') {
          setInputValue('');
          return;
        }

        const ungroupedValue = removeNumberInputGrouping(nextValue);
        if (!isValidNumberInputDraft(ungroupedValue, normalizedDecimalPlaces)) return;

        const normalizedValue = normalizeNumberInputDraft(ungroupedValue);
        const nextDisplayValue = formatNumberInputDraft(normalizedValue, numberFormatter);

        if (normalizedValue === '.') {
          setInputValue(nextDisplayValue);
          scheduleCaretPosition(
            getCaretPositionFromNumericDraftOffset(nextDisplayValue, caretOffset)
          );
          return;
        }

        const numericValue = Number(normalizedValue);
        if (!Number.isFinite(numericValue)) return;
        if (max !== undefined && numericValue > max) return;

        setInputValue(nextDisplayValue);
        scheduleCaretPosition(getCaretPositionFromNumericDraftOffset(nextDisplayValue, caretOffset));
        onValueChange(numericValue);
      }}
      onFocus={(event) => {
        setInputValue(formatNumberInputValue(value, numberFormatter));
        setIsFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setIsFocused(false);

        if (inputValue === '') {
          const normalizedEmptyValue = clampNumber(emptyValue, min, max);
          setInputValue(formatNumberInputValue(normalizedEmptyValue, numberFormatter));
          onValueChange(normalizedEmptyValue);
        }

        const numericInputValue = normalizeNumberInputDraft(removeNumberInputGrouping(inputValue));
        const numericValue = Number(numericInputValue);
        if (
          inputValue !== '' &&
          Number.isFinite(numericValue) &&
          min !== undefined &&
          numericValue < min
        ) {
          setInputValue(formatNumberInputValue(min, numberFormatter));
          onValueChange(min);
        }

        onBlur?.(event);
      }}
    />
  );
}

function isValidNumberInputDraft(value: string, decimalPlaces: number) {
  if (decimalPlaces === 0) return /^\d+$/.test(value);

  const decimalPattern = new RegExp(`^\\d*(\\.\\d{0,${decimalPlaces}})?$`);
  return decimalPattern.test(value);
}

function normalizeNumberInputDraft(value: string) {
  if (value === '.') return value;

  const [wholePart, decimalPart] = value.split('.');
  const normalizedWholePart = wholePart.replace(/^0+(?=\d)/, '') || '0';

  return decimalPart === undefined ? normalizedWholePart : `${normalizedWholePart}.${decimalPart}`;
}

function formatNumberInputValue(value: number, formatter: Intl.NumberFormat | null) {
  if (!Number.isFinite(value)) return '';
  if (!formatter) return String(value);
  return formatter.format(value);
}

function formatNumberInputDraft(value: string, formatter: Intl.NumberFormat | null) {
  if (!formatter || value === '.') return value;

  const [wholePart, decimalPart] = value.split('.');
  const numericWholePart = Number(wholePart || '0');
  const formattedWholePart = Number.isFinite(numericWholePart)
    ? formatter.format(numericWholePart)
    : wholePart;

  return decimalPart === undefined ? formattedWholePart : `${formattedWholePart}.${decimalPart}`;
}

function removeNumberInputGrouping(value: string) {
  return value.replace(/,/g, '');
}

function getNumericDraftOffset(value: string, caretPosition: number) {
  let offset = 0;

  for (let index = 0; index < caretPosition; index += 1) {
    if (isNumericDraftCharacter(value[index])) offset += 1;
  }

  return offset;
}

function getCaretPositionFromNumericDraftOffset(value: string, offset: number) {
  if (offset <= 0) return 0;

  let currentOffset = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (isNumericDraftCharacter(value[index])) currentOffset += 1;
    if (currentOffset >= offset) return index + 1;
  }

  return value.length;
}

function isNumericDraftCharacter(value: string) {
  return /^[\d.]$/.test(value);
}

function setRefValue<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  (ref as { current: T | null }).current = value;
}

function clampNumber(value: number, min?: number, max?: number) {
  let nextValue = value;
  if (min !== undefined) nextValue = Math.max(min, nextValue);
  if (max !== undefined) nextValue = Math.min(max, nextValue);
  return nextValue;
}
