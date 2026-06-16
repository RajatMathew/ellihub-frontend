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
    'tpl_pdf_notice_global_default',
    'PDF_NOTICE',
    'global',
    'Global PDF Warning',
    'Default warning box available to all generated PDFs.',
    '{"title":"Important Notice","bodyHtml":"<p>Please review this document carefully before proceeding.</p>"}'::jsonb,
    ARRAY['global', 'warning'],
    true,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'tpl_pdf_notice_rfq_default',
    'PDF_NOTICE',
    'rfq',
    'RFQ Warning',
    'Default warning box used for RFQ vendor PDFs.',
    '{"title":"Review RFQ Before Quoting","bodyHtml":"<p>Please review all RFQ documents, drawings, specifications, and addenda before submitting your quote.</p>"}'::jsonb,
    ARRAY['rfq', 'warning'],
    true,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'tpl_pdf_notice_purchase_order_default',
    'PDF_NOTICE',
    'purchaseOrder',
    'Fabrication Warning',
    'Default warning box used for purchase order PDFs.',
    '{"title":"DO NOT START FABRICATION BEFORE READING THIS","bodyHtml":"<p>Please do not order any material or start production without Elli''s Project Manager''s approval signatures on the drawings and/or check-off list.</p>"}'::jsonb,
    ARRAY['purchase-order', 'warning'],
    true,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "Configuration" (id, name, value, type, parent, child, key1, key2)
VALUES
(
    'pdf-notice:purchaseOrder:include-by-default',
    'pdf.notice.include_by_default',
    'true',
    'pdf_notice',
    'pdf',
    'notice',
    'purchaseOrder',
    'includeByDefault'
),
(
    'pdf-notice:rfq:include-by-default',
    'pdf.notice.include_by_default',
    'false',
    'pdf_notice',
    'pdf',
    'notice',
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
