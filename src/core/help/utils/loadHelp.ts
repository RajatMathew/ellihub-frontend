import type { HelpArticle, HelpSection } from '@core/help/types';

type FrontmatterData = {
  title?: string;
  description?: string;
  section?: string;
  sectionOrder?: number;
  order?: number;
  tags?: string[];
};

function toTitle(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function parseNumber(value: string) {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function stripQuotes(value: string) {
  return value.trim().replace(/^["']|["']$/g, '');
}

function parseTags(value: string) {
  const trimmed = value.trim();
  const normalized =
    trimmed.startsWith('[') && trimmed.endsWith(']') ? trimmed.slice(1, -1) : trimmed;
  return normalized
    .split(',')
    .map((tag) => stripQuotes(tag))
    .filter(Boolean);
}

function parseFrontmatter(raw: string): { data: FrontmatterData; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, content: raw.trim() };

  const [, frontmatter = '', content = ''] = match;
  const data: FrontmatterData = {};

  for (const line of frontmatter.split('\n')) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (key === 'title') data.title = stripQuotes(value);
    if (key === 'description') data.description = stripQuotes(value);
    if (key === 'section') data.section = stripQuotes(value);
    if (key === 'sectionOrder') data.sectionOrder = parseNumber(value);
    if (key === 'order') data.order = parseNumber(value);
    if (key === 'tags') data.tags = parseTags(value);
  }

  return { data, content: content.trim() };
}

const files = import.meta.glob('./../docs/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export const helpArticles: HelpArticle[] = Object.entries(files)
  .map(([path, raw]) => {
    const fileName = path.split('/').pop() ?? 'index.md';
    const slug = fileName.replace(/\?.*$/, '').replace(/\.md$/, '');
    const { data, content } = parseFrontmatter(raw as string);

    return {
      slug,
      title: data.title ?? toTitle(slug),
      description: data.description ?? '',
      section: data.section ?? 'Getting Started',
      sectionOrder: data.sectionOrder ?? 999,
      order: data.order ?? 999,
      tags: data.tags ?? [],
      content,
    };
  })
  .sort(
    (a, b) => a.sectionOrder - b.sectionOrder || a.order - b.order || a.title.localeCompare(b.title)
  );

export const helpSections: HelpSection[] = Object.values(
  helpArticles.reduce<Record<string, HelpSection>>((sections, article) => {
    const existing = sections[article.section];
    if (existing) {
      existing.articles.push(article);
      existing.order = Math.min(existing.order, article.sectionOrder);
      return sections;
    }

    sections[article.section] = {
      title: article.section,
      order: article.sectionOrder,
      articles: [article],
    };

    return sections;
  }, {})
).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

export function getHelpArticle(slug?: string) {
  const normalizedSlug = slug ?? 'index';
  return helpArticles.find((article) => article.slug === normalizedSlug) ?? helpArticles[0];
}
