INSERT INTO "TemplateSetting" (
    "id",
    "kind",
    "key",
    "name",
    "description",
    "value",
    "tags",
    "isDefault",
    "status",
    "createdAt",
    "updatedAt"
) VALUES
(
    'tpl_mail_feature_purchase_order_vendor_issue_default',
    'MAIL_FEATURE',
    'purchaseOrder.vendorIssue',
    'Purchase Order Email',
    'Default purchase order email sent to a vendor.',
    '{"senderGroup":"po","subject":"Purchase Order {{poNumber}} - {{projectName}}","body":"Hello {{vendorName}},\n\nPlease review the attached Purchase Order for {{projectName}}.\n\nPO: {{poNumber}}\nDescription: {{poDescription}}\nExpected Delivery: {{expectedDate}}\nTotal: {{total}}\n\nPlease confirm receipt and let us know if you have any questions.","pdfProfileKey":"elliDefault"}'::jsonb,
    ARRAY['purchase-order'],
    true,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'tpl_mail_feature_sub_change_order_vendor_approval_default',
    'MAIL_FEATURE',
    'subChangeOrder.vendorApproval',
    'SCO Email',
    'Default approved sub change order email sent to a vendor.',
    '{"senderGroup":"changeOrder","subject":"Sub Change Order {{scoNumber}} - {{projectName}}","body":"Hello {{vendorName}},\n\nPlease review the attached approved Sub Change Order for {{projectName}}.\n\nSCO: {{scoNumber}}\nPO: {{poNumber}}\nTitle: {{scoTitle}}\nChange Type: {{changeType}}\nTotal: {{total}}\n\nPlease confirm receipt and let us know if you have any questions.","pdfProfileKey":"elliDefault"}'::jsonb,
    ARRAY['sub-change-order'],
    true,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
