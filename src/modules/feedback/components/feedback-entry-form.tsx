import { Button } from '@/app/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { FeedbackFileDropZone } from '@/modules/feedback/components/feedback-file-drop-zone';
import { useSubmitFeedbackMutation } from '@/modules/feedback/hooks/use-submit-feedback';
import {
  feedbackFormSchema,
  type FeedbackFormData,
} from '@/modules/feedback/schemas/feedback.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface FeedbackEntryFormProps {
  onCancel: () => void;
  onSubmitted: () => void;
}

function getCurrentUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;

  return window.location.href;
}

function getUserAgent(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;

  return navigator.userAgent;
}

export function FeedbackEntryForm({ onCancel, onSubmitted }: FeedbackEntryFormProps) {
  const submitFeedback = useSubmitFeedbackMutation();
  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      title: '',
      message: '',
      files: [],
    },
  });

  const handleSubmit = async (values: FeedbackFormData) => {
    await submitFeedback.mutateAsync({
      ...values,
      currentUrl: getCurrentUrl(),
      userAgent: getUserAgent(),
    });
    form.reset();
    onSubmitted();
  };

  const isSubmitting = submitFeedback.isPending;

  return (
    <Form {...form}>
      <form onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}>
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3 rounded-md border border-primary/10 bg-primary/5 px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
              className="text-primary hover:bg-primary/10 hover:text-primary"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <p className="text-xs font-medium text-primary/80">
              New feedback lands in Feedback first.
            </p>
          </div>

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">Title</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Short summary"
                    disabled={isSubmitting}
                    className="h-11 bg-card text-sm shadow-xs shadow-black/5"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">
                  Feedback details <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    required
                    disabled={isSubmitting}
                    placeholder="What happened, what did you expect, and where did you see it?"
                    className="min-h-36 resize-y bg-card text-sm shadow-xs shadow-black/5"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="files"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">Attachments</FormLabel>
                <FormControl>
                  <FeedbackFileDropZone
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-2 pt-6 sm:grid-cols-[1fr_2fr]">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-11 bg-card font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="h-11 font-semibold"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Send feedback
          </Button>
        </div>
      </form>
    </Form>
  );
}
