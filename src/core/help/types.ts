export interface HelpArticle {
  slug: string;
  title: string;
  description: string;
  section: string;
  sectionOrder: number;
  order: number;
  tags: string[];
  content: string;
}

export interface HelpSection {
  title: string;
  order: number;
  articles: HelpArticle[];
}
