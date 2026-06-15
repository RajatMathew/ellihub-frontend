import { useMemo, useState } from 'react';

import { Search } from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@app/components/ui/accordion';
import { Input, InputGroup, InputWrapper } from '@app/components/ui/input';
import { ScrollArea } from '@app/components/ui/scroll-area';
import { cn } from '@app/lib/utils';
import type { HelpArticle, HelpSection } from '@core/help/types';

function articleMatches(article: HelpArticle, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const haystack = [article.title, article.description, article.section, ...article.tags]
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

export function HelpArticleNav({
  sections,
  selectedSlug,
  onSelect,
  className,
}: {
  sections: HelpSection[];
  selectedSlug: string;
  onSelect: (article: HelpArticle) => void;
  className?: string;
}) {
  const [query, setQuery] = useState('');

  const filteredSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          articles: section.articles.filter((article) => articleMatches(article, query)),
        }))
        .filter((section) => section.articles.length > 0),
    [query, sections]
  );

  return (
    <aside className={cn('flex min-h-0 flex-col border-e bg-muted/70', className)}>
      <div className="border-b p-4">
        <InputGroup>
          <InputWrapper>
            <Search />
            <Input
              aria-label="Search help articles"
              className="min-w-0"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search help"
              value={query}
            />
          </InputWrapper>
        </InputGroup>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-3">
          {filteredSections.length === 0 ? (
            <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
              No help articles found.
            </div>
          ) : (
            <Accordion
              className="space-y-3"
              defaultValue={filteredSections.map((section) => section.title)}
              type="multiple"
            >
              {filteredSections.map((section) => (
                <AccordionItem
                  className="rounded-md border bg-background px-0"
                  key={section.title}
                  value={section.title}
                >
                  <AccordionTrigger className="px-3 py-3 text-sm">{section.title}</AccordionTrigger>
                  <AccordionContent className="px-2 pb-2">
                    <div className="space-y-1">
                      {section.articles.map((article) => (
                        <button
                          className={cn(
                            'flex w-full flex-col rounded-md px-3 py-2 text-start text-sm transition-colors hover:bg-accent',
                            selectedSlug === article.slug &&
                              'bg-accent font-medium text-accent-foreground'
                          )}
                          key={article.slug}
                          onClick={() => onSelect(article)}
                          type="button"
                        >
                          <span>{article.title}</span>
                          {article.description && (
                            <span className="line-clamp-2 text-xs font-normal text-muted-foreground">
                              {article.description}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
