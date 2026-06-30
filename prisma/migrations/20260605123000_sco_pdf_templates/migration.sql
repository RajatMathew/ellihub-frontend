INSERT INTO "TemplateSetting" (
    id,
    kind,
    key,
    name,
    description,
    value,
    tags,
    "isDefault",
    status,
    "createdAt",
    "updatedAt"
) VALUES
(
    'tpl_pdf_terms_sco_default',
    'PDF_TERMS',
    'subChangeOrder',
    'SCO Terms and Conditions',
    'Default terms and conditions page used for sub change order PDFs.',
    '{"html":"<p>This sub change order modifies the referenced purchase order only to the extent described in this document.</p><p>All changed work, materials, pricing, schedule impact, and supporting documentation are subject to project review and approval.</p><p>Invoices must reference the SCO number and linked purchase order number where applicable.</p>"}'::jsonb,
    ARRAY['sub-change-order', 'terms'],
    true,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'tpl_pdf_notice_sco_default',
    'PDF_NOTICE',
    'subChangeOrder',
    'SCO Warning',
    'Default warning box used for sub change order PDFs.',
    '{"title":"Review Approved Change Before Proceeding","bodyHtml":"<p>Please confirm that the linked purchase order, revised scope, pricing, and approval status are correct before starting the changed work.</p>"}'::jsonb,
    ARRAY['sub-change-order', 'warning'],
    true,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "Configuration" (id, name, value, type, parent, child, key1, key2)
VALUES
(
    'pdf-terms:subChangeOrder:include-by-default',
    'pdf.terms.include_by_default',
    'true',
    'pdf_terms',
    'pdf',
    'terms',
    'subChangeOrder',
    'includeByDefault'
),
(
    'pdf-notice:subChangeOrder:include-by-default',
    'pdf.notice.include_by_default',
    'false',
    'pdf_notice',
    'pdf',
    'notice',
    'subChangeOrder',
    'includeByDefault'
)
ON CONFLICT (id) DO UPDATE SET
    value = EXCLUDED.value,
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    parent = EXCLUDED.parent,
    child = EXCLUDED.child,
    key1 = EXCLUDED.key1,
    key2 = EXCLUDED.key2;
