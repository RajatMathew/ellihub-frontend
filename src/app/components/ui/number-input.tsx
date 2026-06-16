import { useState } from 'react';

import { Input } from '@/app/components/ui/input';

type NumberInputProps = Omit<
  React.ComponentProps<typeof Input>,
  'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange'
> & {
  value: number;
  onValueChange: (value: number) => void;
  decimalPlaces?: number;
  min?: number;
  max?: number;
  emptyValue?: number;
};

export function NumberInput({
  value,
  onValueChange,
  decimalPlaces = 0,
  min,
  max,
  emptyValue = 0,
  onBlur,
  onFocus,
  ...props
}: NumberInputProps) {
  const [inputValue, setInputValue] = useState(() => formatNumberInputValue(value));
  const [isFocused, setIsFocused] = useState(false);
  const displayValue = isFocused ? inputValue : formatNumberInputValue(value);
  const normalizedDecimalPlaces = Math.max(0, Math.trunc(decimalPlaces));

  return (
    <Input
      {...props}
      type="text"
      inputMode={normalizedDecimalPlaces > 0 ? 'decimal' : 'numeric'}
      value={displayValue}
      onChange={(event) => {
        const nextValue = event.target.value;

        if (nextValue === '') {
          setInputValue('');
          return;
        }

        if (!isValidNumberInputDraft(nextValue, normalizedDecimalPlaces)) return;

        const normalizedValue = normalizeNumberInputDraft(nextValue);

        if (normalizedValue === '.') {
          setInputValue(normalizedValue);
          return;
        }

        const numericValue = Number(normalizedValue);
        if (!Number.isFinite(numericValue)) return;
        if (max !== undefined && numericValue > max) return;

        setInputValue(normalizedValue);
        onValueChange(numericValue);
      }}
      onFocus={(event) => {
        setInputValue(formatNumberInputValue(value));
        setIsFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setIsFocused(false);

        if (inputValue === '') {
          const normalizedEmptyValue = clampNumber(emptyValue, min, max);
          setInputValue(formatNumberInputValue(normalizedEmptyValue));
          onValueChange(normalizedEmptyValue);
        }

        const numericValue = Number(inputValue);
        if (
          inputValue !== '' &&
          Number.isFinite(numericValue) &&
          min !== undefined &&
          numericValue < min
        ) {
          setInputValue(formatNumberInputValue(min));
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

function formatNumberInputValue(value: number) {
  if (!Number.isFinite(value)) return '';
  return String(value);
}

function clampNumber(value: number, min?: number, max?: number) {
  let nextValue = value;
  if (min !== undefined) nextValue = Math.max(min, nextValue);
  if (max !== undefined) nextValue = Math.min(max, nextValue);
  return nextValue;
}
