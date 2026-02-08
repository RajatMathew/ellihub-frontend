// src/pages/help/loadHelp.ts
/** Browser-safe frontmatter parse (no Buffer). Extracts title and order. */
function parseFrontmatter(raw: string): {
  data: { title?: string; order?: number };
  content: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, content: raw.trim() };
  const [, front, content] = match;
  const data: { title?: string; order?: number } = {};
  for (const line of front.split("\n")) {
    const titleMatch = line.match(/^title:\s*["']?([^"'\n]+)["']?/);
    if (titleMatch) data.title = titleMatch[1].trim();
    const orderMatch = line.match(/^order:\s*(\d+)/);
    if (orderMatch) data.order = parseInt(orderMatch[1], 10);
  }
  return { data, content: content.trim() };
}

const files = import.meta.glob("./../docs/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

export type HelpPageData = {
  slug: string;
  title: string;
  order: number;
  content: string;
};

export const helpPages: HelpPageData[] = Object.entries(files)
  .map(([path, raw]) => {
    const slug = path.split("/").pop()!.replace(/\?.*$/, "").replace(".md", "");
    const { data, content } = parseFrontmatter(raw as string);

    return {
      slug,
      title: data.title ?? slug,
      order: data.order ?? 999,
      content,
    };
  })
  .sort((a, b) => a.order - b.order);
