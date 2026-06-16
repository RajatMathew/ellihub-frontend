import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Check } from 'lucide-react';

interface LabelOption {
  value: string;
  label: string;
}

interface InlineAddFormProps {
  placeholder: string;
  inputType?: string;
  value: string;
  onValueChange: (value: string) => void;
  labelValue: string;
  onLabelChange: (value: string) => void;
  labelOptions: LabelOption[];
  onSubmit: () => void;
  isPending?: boolean;
  error?: string;
}

export function InlineAddForm({
  placeholder,
  inputType = 'text',
  value,
  onValueChange,
  labelValue,
  onLabelChange,
  labelOptions,
  onSubmit,
  isPending = false,
  error,
}: InlineAddFormProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder={placeholder}
          type={inputType}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className="h-8 flex-1 text-sm"
          aria-invalid={!!error}
        />
        <Select value={labelValue} onValueChange={onLabelChange}>
          <SelectTrigger className="h-8 w-full text-xs sm:w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {labelOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          mode="icon"
          className="size-8 self-end sm:self-auto"
          onClick={onSubmit}
          disabled={!value.trim() || isPending}
          type="button"
          aria-label="Add item"
        >
          <Check className="size-4" />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
