import { useEffect, useRef } from 'react';
import type React from 'react';

import lightGallery from 'lightgallery';
import lgZoom from 'lightgallery/plugins/zoom';
import ReactMarkdown from 'react-markdown';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';

import 'lightgallery/css/lightgallery.css';
import 'lightgallery/css/lg-zoom.css';

import { cn } from '@app/lib/utils';

function childrenToText(children: React.ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(childrenToText).join('');
  return '';
}

function MediaLink({
  href,
  label,
  type,
}: {
  href: string;
  label: string;
  type: 'video' | 'embed';
}) {
  if (type === 'video') {
    return (
      <span className="my-5 block overflow-hidden rounded-md border bg-background">
        <video
          aria-label={label || 'Help video'}
          className="aspect-video w-full bg-muted"
          controls
          preload="metadata"
          src={href}
        />
        {label && (
          <span className="block border-t px-4 py-2 text-xs text-muted-foreground">{label}</span>
        )}
      </span>
    );
  }

  return (
    <span className="my-5 block overflow-hidden rounded-md border bg-background">
      <iframe
        className="min-h-[640px] w-full bg-background md:h-[800px]"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"
        src={href}
        title={label || href}
      />
      {label && (
        <span className="block border-t px-4 py-2 text-xs text-muted-foreground">{label}</span>
      )}
    </span>
  );
}

/** Wraps an image in a lightgallery-enabled anchor so clicking opens the fullscreen viewer. */
function LightGalleryImage({ src, alt }: { src: string; alt: string }) {
  const containerRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const instance = lightGallery(el, {
      plugins: [lgZoom],
      licenseKey: '0000-0000-000-0000',
      speed: 300,
      download: false,
      counter: false,
    });

    return () => {
      instance.destroy();
    };
  }, [src]);

  return (
    <span className="my-5 block overflow-hidden rounded-md border bg-background">
      <a ref={containerRef} href={src} className="block">
        <img
          alt={alt}
          className="w-full cursor-zoom-in object-contain transition-opacity hover:opacity-90"
          loading="lazy"
          src={src}
        />
      </a>
      {alt && (
        <span className="block border-t px-4 py-2 text-xs text-muted-foreground">{alt}</span>
      )}
    </span>
  );
}

function removeLeadingTitle(content: string, title?: string) {
  if (!title) return content;
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return content.replace(new RegExp(`^#\\s+${escapedTitle}\\s*(?:\\r?\\n)+`), '');
}

export function HelpMarkdown({
  content,
  className,
  title,
}: {
  content: string;
  className?: string;
  title?: string;
}) {
  const renderedContent = removeLeadingTitle(content, title);

  return (
    <article
      className={cn(
        'max-w-none text-sm leading-6 text-foreground',
        '[&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline',
        '[&_blockquote]:my-4 [&_blockquote]:rounded-md [&_blockquote]:border-s-4 [&_blockquote]:border-primary [&_blockquote]:bg-muted [&_blockquote]:px-4 [&_blockquote]:py-3',
        '[&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs',
        '[&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-normal',
        '[&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold',
        '[&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold',
        '[&_hr]:my-6 [&_hr]:border-border',
        '[&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:ps-6 [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:ps-6',
        '[&_pre]:my-4 [&_pre]:overflow-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:bg-muted [&_pre]:p-4',
        '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
        '[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-start',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          a({ children, href }) {
            const label = childrenToText(children).trim();
            const [prefix, ...rest] = label.split(':');
            const mediaLabel = rest.join(':').trim();
            const mediaType = prefix.toLowerCase();

            if (href && (mediaType === 'video' || mediaType === 'embed')) {
              return <MediaLink href={href} label={mediaLabel} type={mediaType} />;
            }

            const isExternal = href?.startsWith('http');
            return (
              <a
                href={href}
                rel={isExternal ? 'noreferrer' : undefined}
                target={isExternal ? '_blank' : undefined}
              >
                {children}
              </a>
            );
          },
          img({ alt, src }) {
            return <LightGalleryImage src={src ?? ''} alt={alt ?? ''} />;
          },
        }}
      >
        {renderedContent}
      </ReactMarkdown>
    </article>
  );
}
