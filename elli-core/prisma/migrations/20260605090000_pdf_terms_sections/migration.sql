INSERT INTO "TemplateSetting" (
    id,
    kind,
    key,
    name,
    description,
    value,
    tags,
    "isDefault",
    status
) VALUES
(
    'tpl_pdf_terms_global_default',
    'PDF_TERMS',
    'global',
    'Global Terms and Conditions',
    'Default terms and conditions available to all generated PDFs.',
    '{"html":"<p>All work, materials, services, and deliveries shall comply with the project documents, approved scopes, applicable laws, codes, and site requirements.</p><p>Recipients are responsible for reviewing quantities, schedules, exclusions, and clarifications before proceeding.</p>"}'::jsonb,
    ARRAY['global', 'terms'],
    true,
    'ACTIVE'
),
(
    'tpl_pdf_terms_rfq_default',
    'PDF_TERMS',
    'rfq',
    'RFQ Terms and Conditions',
    'Default terms and conditions page used for RFQ vendor PDFs.',
    '{"html":"<p>Quotes must include all materials, labor, equipment, delivery, taxes, exclusions, and lead times required to complete the requested scope.</p><p>Submitted pricing is subject to review against the RFQ documents, project requirements, and any issued clarifications.</p>"}'::jsonb,
    ARRAY['rfq', 'terms'],
    true,
    'ACTIVE'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "Configuration" (id, name, value, type, parent, child, key1, key2)
VALUES
(
    'pdf-terms:purchaseOrder:include-by-default',
    'pdf.terms.include_by_default',
    'true',
    'pdf_terms',
    'pdf',
    'terms',
    'purchaseOrder',
    'includeByDefault'
),
(
    'pdf-terms:rfq:include-by-default',
    'pdf.terms.include_by_default',
    'false',
    'pdf_terms',
    'pdf',
    'terms',
    'rfq',
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
