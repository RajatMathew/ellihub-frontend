import { useCallback, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { X } from 'lucide-react';

import { cn } from '@app/lib/utils';

import { Badge, BadgeButton } from './badge';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function TagInput({ value, onChange, placeholder = 'Add a tag...', className, disabled }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (trimmed && !value.includes(trimmed)) {
        onChange([...value, trimmed]);
      }
    },
    [value, onChange],
  );

  const removeTag = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const paste = e.clipboardData.getData('text');
    if (paste.includes(',')) {
      e.preventDefault();
      const newTags = paste
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t && !value.includes(t));
      if (newTags.length > 0) {
        onChange([...value, ...newTags]);
      }
      setInputValue('');
    }
  };

  return (
    <div className={cn('space-y-2', disabled && 'opacity-60', className)}>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag, index) => (
            <Badge
              key={tag}
              variant="secondary"
              appearance="light"
              size="lg"
              className="gap-1"
            >
              {tag}
              {!disabled && (
                <BadgeButton
                  onClick={() => removeTag(index)}
                >
                  <X className="size-3" />
                </BadgeButton>
              )}
            </Badge>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => {
          if (inputValue.trim()) {
            addTag(inputValue);
            setInputValue('');
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className="flex h-8.5 w-full rounded-md border border-input bg-background px-3 text-[0.8125rem] leading-[--text-sm--line-height] text-foreground shadow-xs shadow-black/5 transition-[color,box-shadow] placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed"
      />
    </div>
  );
}

export { TagInput };
