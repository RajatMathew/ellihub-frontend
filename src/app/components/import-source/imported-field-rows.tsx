import { InfoRow } from '@/app/components/info-row';
import { formatImportedValue, importedLinkHref, type ImportedField } from '@/app/lib/import-source';

/**
 * Labelled values an import kept - a record's details, or its workbook row -
 * one row each, formatted by kind. A link opens in a new tab.
 */
export function ImportedFieldRows({ fields }: { fields: ImportedField[] }) {
  return (
    <>
      {fields.map((field, index) => {
        const href = importedLinkHref(field);
        return (
          <InfoRow key={`${field.label}-${index}`} label={field.label}>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-2 hover:underline"
              >
                Open
              </a>
            ) : (
              formatImportedValue(field)
            )}
          </InfoRow>
        );
      })}
    </>
  );
}
