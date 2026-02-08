// src/pages/help/HelpPage.tsx
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";

import { helpPages } from "@core/help/utils/loadHelp";

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 rounded border-l-4 border-blue-500 bg-blue-50 p-4">
      {children}
    </div>
  );
}

export default function HelpPage() {
  const { slug } = useParams();
  const page = helpPages.find((p) => p.slug === (slug ?? "index"));

  if (!page) return <div>Page not found</div>;

  return (
    <article className="prose max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          blockquote({ children }) {
            return <Callout>{children}</Callout>;
          },
          img({ src, alt }) {
            return (
              <img
                src={src ?? ""}
                alt={alt ?? ""}
                className="my-6 rounded border"
              />
            );
          },
        }}
      >
        {page.content}
      </ReactMarkdown>
    </article>
  );
}
