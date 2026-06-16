import { useNavigate, useParams } from 'react-router-dom';

import { Separator } from '@app/components/ui/separator';
import { HelpArticleNav } from '@core/help/components/help-article-nav';
import { HelpMarkdown } from '@core/help/components/help-markdown';
import { getHelpArticle, helpSections } from '@core/help/utils/loadHelp';

function getArticlePath(slug: string) {
  return slug === 'index' ? '/help' : `/help/${slug}`;
}

export default function HelpPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const article = getHelpArticle(slug);

  if (!article) {
    return <div className="p-6 text-sm text-muted-foreground">No help article is available.</div>;
  }

  return (
    <div className="w-full min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b bg-background px-5">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">ElliHub</p>
          <h1 className="text-base font-semibold">Help Center</h1>
        </div>
      </header>

      <div className="border-b md:hidden">
        <HelpArticleNav
          className="max-h-80 border-e-0"
          onSelect={(nextArticle) => navigate(getArticlePath(nextArticle.slug))}
          sections={helpSections}
          selectedSlug={article.slug}
        />
      </div>

      <article className="mx-auto w-full max-w-4xl px-6 py-8 lg:px-10">
        <div className="mb-5 space-y-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">{article.section}</p>
          <h2 className="text-3xl font-semibold tracking-normal">{article.title}</h2>
          {article.description && (
            <p className="text-sm text-muted-foreground">{article.description}</p>
          )}
        </div>
        <Separator className="mb-5" />
        <HelpMarkdown content={article.content} title={article.title} />
      </article>
    </div>
  );
}
