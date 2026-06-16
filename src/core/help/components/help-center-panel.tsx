import { useState } from 'react';

import { ArrowLeft, CircleHelp, ExternalLink, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@app/components/ui/button';
import { Input, InputGroup, InputWrapper } from '@app/components/ui/input';
import { ScrollArea } from '@app/components/ui/scroll-area';
import { Separator } from '@app/components/ui/separator';
import { useLayout } from '@app/hooks/use-layout';
import { cn } from '@app/lib/utils';
import { HelpMarkdown } from '@core/help/components/help-markdown';
import type { HelpArticle } from '@core/help/types';
import { getHelpArticle, helpSections } from '@core/help/utils/loadHelp';

function getArticlePath(slug: string) {
  return slug === 'index' ? '/help' : `/help/${slug}`;
}

function articleMatches(article: HelpArticle, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [article.title, article.description, article.section, ...article.tags]
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery);
}

export function HelpCenterRail({ className }: { className?: string }) {
  const { isHelpOpen, setHelpOpen } = useLayout();
  const [query, setQuery] = useState('');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const selectedArticle = selectedSlug ? getHelpArticle(selectedSlug) : undefined;
  const articlePath = selectedArticle ? getArticlePath(selectedArticle.slug) : '/help';
  const filteredSections = helpSections
    .map((section) => ({
      ...section,
      articles: section.articles.filter((article) => articleMatches(article, query)),
    }))
    .filter((section) => section.articles.length > 0);

  if (!isHelpOpen) return null;

  return (
    <aside
      aria-label="Help"
      className={cn(
        'fixed inset-y-0 end-0 z-30 flex w-full flex-col border-s bg-background shadow-xl transition-transform sm:w-(--help-panel-width) lg:shadow-left-panel',
        className
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex h-(--header-height) shrink-0 items-center justify-between gap-3 border-b px-5">
          <h2 className="text-base font-semibold">Help</h2>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link target="_blank" to={articlePath}>
                <ExternalLink />
                Open in new tab
              </Link>
            </Button>
            <Button
              aria-label="Close Help Center"
              mode="icon"
              onClick={() => setHelpOpen(false)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X />
            </Button>
          </div>
        </header>

        <div className="border-b p-4">
          <InputGroup>
            <InputWrapper>
              <Search />
              <Input
                aria-label="Search help articles"
                className="min-w-0"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedSlug(null);
                }}
                placeholder="Search help"
                value={query}
              />
            </InputWrapper>
          </InputGroup>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          {selectedArticle ? (
            <div className="px-5 py-4">
              <Button
                className="mb-4"
                onClick={() => setSelectedSlug(null)}
                size="sm"
                type="button"
                variant="ghost"
              >
                <ArrowLeft />
                Back
              </Button>
              <div className="mb-4 space-y-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {selectedArticle.section}
                </p>
                <h3 className="text-xl font-semibold tracking-normal">{selectedArticle.title}</h3>
                {selectedArticle.description && (
                  <p className="text-sm text-muted-foreground">{selectedArticle.description}</p>
                )}
              </div>
              <Separator className="mb-4" />
              <HelpMarkdown content={selectedArticle.content} title={selectedArticle.title} />
            </div>
          ) : (
            <div className="space-y-6 p-4">
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Help resources</h3>
                <p className="text-sm text-muted-foreground">
                  Find short guides for the current workflow, project setup, and docs authoring.
                </p>
              </section>

              {filteredSections.length === 0 ? (
                <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
                  No help articles found.
                </div>
              ) : (
                filteredSections.map((section) => (
                  <section className="space-y-2" key={section.title}>
                    <h3 className="text-xs font-medium uppercase text-muted-foreground">
                      {section.title}
                    </h3>
                    <div className="divide-y rounded-md border bg-background">
                      {section.articles.map((article) => (
                        <button
                          className="block w-full px-4 py-3 text-start transition-colors hover:bg-accent"
                          key={article.slug}
                          onClick={() => setSelectedSlug(article.slug)}
                          type="button"
                        >
                          <span className="block text-sm font-medium">{article.title}</span>
                          {article.description && (
                            <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
                              {article.description}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </section>
                ))
              )}

              <Separator />

              <Button asChild className="w-full" variant="outline">
                <Link target="_blank" to="/help">
                  <ExternalLink />
                  Browse full Help Center
                </Link>
              </Button>
            </div>
          )}
        </ScrollArea>
      </div>
    </aside>
  );
}

export function HelpCenterPanel({ className }: { className?: string }) {
  const { helpToggle, isHelpOpen } = useLayout();

  return (
    <Button
      aria-label={isHelpOpen ? 'Close Help Center' : 'Open Help Center'}
      aria-pressed={isHelpOpen}
      className={className}
      data-state={isHelpOpen ? 'open' : 'closed'}
      mode="icon"
      onClick={helpToggle}
      size="icon"
      type="button"
      variant="ghost"
    >
      <CircleHelp />
    </Button>
  );
}
