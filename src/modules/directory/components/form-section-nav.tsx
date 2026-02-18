import { cn } from '@app/lib/utils';

export function FormSectionNav({
  sections,
  activeSection,
  onSectionChange,
}: {
  sections: readonly { id: string; label: string }[];
  activeSection: string;
  onSectionChange: (id: string) => void;
}) {
  return (
    <nav className="hidden w-44 shrink-0 lg:block">
      <ul className="space-y-1">
        {sections.map((section) => (
          <li key={section.id}>
            <button
              type="button"
              onClick={() => {
                onSectionChange(section.id);
                document
                  .getElementById(section.id)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={cn(
                'w-full text-left text-sm px-4 py-2 rounded-md border-l-2 transition-colors',
                activeSection === section.id
                  ? 'border-primary text-primary font-semibold bg-transparent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {section.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
