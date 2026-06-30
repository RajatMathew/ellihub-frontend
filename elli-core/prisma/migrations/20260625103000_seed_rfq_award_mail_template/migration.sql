WITH existing_default AS (
    SELECT EXISTS (
        SELECT 1
        FROM "TemplateSetting"
        WHERE "kind" = 'MAIL_FEATURE'
          AND "key" = 'rfq.awardNotice'
          AND "isDefault" = true
          AND "status" = 'ACTIVE'
          AND "deletedAt" IS NULL
    ) AS has_default
)
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
)
SELECT
    'tpl_mail_rfq_award_notice_default',
    'MAIL_FEATURE',
    'rfq.awardNotice',
    'RFQ Award Email',
    'Default email sent to the awarded RFQ vendor.',
    '{"senderGroup":"rfq","subject":"Award Notice - RFQ {{rfqNumber}} - {{projectName}}","body":"Hello {{vendorName}},\n\nWe are pleased to inform you that your quote for {{rfqNumber}} - {{rfqTitle}} has been awarded.\n\nProject: {{projectName}}\nAwarded Amount: {{awardedAmount}}\nRFQ Date: {{rfqDate}}\n\nOur team will follow up with the purchase order and next steps. Please let us know if you have any questions."}'::jsonb,
    ARRAY['rfq', 'email', 'award'],
    NOT existing_default.has_default,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM existing_default
ON CONFLICT (id) DO NOTHING;
