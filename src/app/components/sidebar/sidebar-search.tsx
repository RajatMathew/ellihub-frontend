import { type InputHTMLAttributes } from 'react';

import { Badge } from '@app/components/ui/badge';
import { Input, InputWrapper } from '@app/components/ui/input';

interface SidebarSearchProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Badge text to display, defaults to "⌘ K" */
  badgeText?: string;
  /** Callback when input value changes */
  onInputChange?: (value: string) => void;
}

/**
 * A reusable search input component for sidebars with optional badge display.
 *
 * @param {SidebarSearchProps} props - Component props
 * @param {string} [props.badgeText="⌘ K"] - Text displayed in the badge
 * @param {Function} [props.onInputChange] - Callback fired when input changes
 * @param {string} [props.placeholder="Search"] - Input placeholder text
 * @returns {JSX.Element} The sidebar search component
 *
 * @example
 * ```tsx
 * <SidebarSearch
 *   onInputChange={(value) => console.log(value)}
 *   badgeText="⌘ K"
 * />
 * ```
 */
export function SidebarSearch({
  badgeText = '⌘ K',
  onInputChange,
  placeholder = 'Search',
  ...inputProps
}: SidebarSearchProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onInputChange?.(e.target.value);
  };

  return (
    <div className="flex px-5 pt-3.5 shrink-0">
      <InputWrapper>
        <Input
          type="search"
          placeholder={placeholder}
          onChange={handleInputChange}
          {...inputProps}
        />
        <Badge variant="outline" className="whitespace-nowrap" size="sm">
          {badgeText}
        </Badge>
      </InputWrapper>
    </div>
  );
}
