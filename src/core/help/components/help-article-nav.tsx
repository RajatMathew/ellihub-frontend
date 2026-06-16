import { useMemo, useState } from 'react';

import { ArrowLeft, ChevronDown, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@app/components/ui/button';
import { Input, InputGroup, InputWrapper } from '@app/components/ui/input';
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

  // All sections open by default
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside className={cn('flex min-h-0 flex-col border-e bg-zinc-50 dark:bg-zinc-900/60 overflow-hidden', className)}>
      {/* Header */}
      <div className="shrink-0 border-b border-border/50 px-4 pt-3 pb-4 flex flex-col gap-3">
        <Button
          asChild
          className="justify-start -ms-2 px-2 text-muted-foreground hover:text-foreground"
          size="sm"
          variant="ghost"
        >
          <Link to="/app/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to app
          </Link>
        </Button>
        <InputGroup>
          <InputWrapper>
            <Search className="text-muted-foreground/50" />
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

      {/* Nav */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <nav className="py-3">
          {filteredSections.length === 0 ? (
            <p className="px-5 text-sm text-muted-foreground">No results.</p>
          ) : (
            filteredSections.map((section, i) => {
              const isOpen = !collapsed[section.title];
              return (
                <div key={section.title} className={cn(i !== 0 && 'mt-1')}>
                  {/* Collapsible section header */}
                  <button
                    className="group flex w-full items-center justify-between px-4 py-2 text-left transition-colors hover:bg-accent/30"
                    onClick={() => toggleSection(section.title)}
                    type="button"
                  >
                    <span className="text-[15px] font-semibold text-foreground/80 tracking-tight">
                      {section.title}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 text-foreground/70 transition-transform duration-200',
                        !isOpen && '-rotate-90'
                      )}
                    />
                  </button>

                  {/* Items */}
                  {isOpen && (
                    <ul className="pb-1">
                      {section.articles.map((article) => {
                        const isActive = selectedSlug === article.slug;
                        return (
                          <li key={article.slug}>
                            <button
                              className={cn(
                                'relative w-full text-left text-sm transition-colors duration-100',
                                'flex items-center pl-5 pr-3 py-[7px] border-l-2',
                                isActive
                                  ? 'border-l-blue-600 dark:border-l-blue-400 bg-blue-50 dark:bg-blue-900/20 text-foreground font-medium'
                                  : 'border-l-transparent text-muted-foreground hover:text-foreground hover:bg-accent/40'
                              )}
                              onClick={() => onSelect(article)}
                              type="button"
                              title={article.title}
                            >
                              <span className="block min-w-0 truncate">{article.title}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })
          )}
        </nav>
      </div>
    </aside>
  );
}
