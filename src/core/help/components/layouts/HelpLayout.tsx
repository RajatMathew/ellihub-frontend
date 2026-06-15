import { Outlet, useNavigate, useParams } from 'react-router-dom';

import { HelpArticleNav } from '@core/help/components/help-article-nav';
import { getHelpArticle, helpSections } from '@core/help/utils/loadHelp';

export function HelpLayout() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const selectedArticle = getHelpArticle(slug);

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <HelpArticleNav
        className="hidden w-80 shrink-0 md:flex"
        onSelect={(article) =>
          navigate(article.slug === 'index' ? '/help' : `/help/${article.slug}`)
        }
        sections={helpSections}
        selectedSlug={selectedArticle?.slug ?? 'index'}
      />
      <main className="min-w-0 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
