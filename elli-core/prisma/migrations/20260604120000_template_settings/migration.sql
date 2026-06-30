CREATE TYPE "TemplateSettingKind" AS ENUM (
    'PDF_TERMS',
    'MAIL_FEATURE',
    'MAIL_SENDER_GROUP',
    'MAIL_SIGNATURE',
    'PDF_PROFILE'
);

CREATE TYPE "TemplateSettingStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "TemplateSetting" (
    "id" TEXT NOT NULL,
    "kind" "TemplateSettingKind" NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "value" JSONB NOT NULL,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" "TemplateSettingStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateSetting_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TemplateSetting_kind_key_idx" ON "TemplateSetting"("kind", "key");
CREATE INDEX "TemplateSetting_kind_key_isDefault_idx" ON "TemplateSetting"("kind", "key", "isDefault");
CREATE INDEX "TemplateSetting_deletedAt_idx" ON "TemplateSetting"("deletedAt");

CREATE UNIQUE INDEX "TemplateSetting_one_default_per_slot_idx"
    ON "TemplateSetting"("kind", "key")
    WHERE "isDefault" = true AND "deletedAt" IS NULL;

INSERT INTO "TemplateSetting" (
    "id",
    "kind",
    "key",
    "name",
    "description",
    "value",
    "tags",
    "isDefault",
    "status"
) VALUES
(
    'tpl_pdf_terms_purchase_order_default',
    'PDF_TERMS',
    'purchaseOrder',
    'Default Purchase Order Terms',
    'Default terms and conditions page used for purchase order PDFs.',
    '{"html":"<p>All materials, labor, equipment, and services shall comply with the approved purchase order, project specifications, and applicable codes.</p><p>The vendor is responsible for confirming quantities, delivery dates, and site requirements before fulfillment.</p><p>Invoices must reference the purchase order number and are subject to verification against delivered goods or completed services.</p>"}'::jsonb,
    ARRAY['purchase-order', 'terms'],
    true,
    'ACTIVE'
),
(
    'tpl_mail_sender_auth_default',
    'MAIL_SENDER_GROUP',
    'auth',
    'Auth Senders',
    'Sender mailbox options for authentication emails.',
    '{"allowed":["hello@cofount.onmicrosoft.com"],"default":"hello@cofount.onmicrosoft.com"}'::jsonb,
    ARRAY['auth'],
    true,
    'ACTIVE'
),
(
    'tpl_mail_sender_rfq_default',
    'MAIL_SENDER_GROUP',
    'rfq',
    'RFQ Senders',
    'Sender mailbox options for RFQ emails.',
    '{"allowed":["hello@cofount.onmicrosoft.com","adithya@cofount.onmicrosoft.com","purchasing@ellicorp.com"],"default":"hello@cofount.onmicrosoft.com"}'::jsonb,
    ARRAY['rfq'],
    true,
    'ACTIVE'
),
(
    'tpl_mail_sender_po_default',
    'MAIL_SENDER_GROUP',
    'po',
    'Purchase Order Senders',
    'Sender mailbox options for purchase order emails.',
    '{"allowed":["purchasing@ellicorp.com","ap@ellicorp.com"],"default":"purchasing@ellicorp.com"}'::jsonb,
    ARRAY['purchase-order'],
    true,
    'ACTIVE'
),
(
    'tpl_mail_sender_change_order_default',
    'MAIL_SENDER_GROUP',
    'changeOrder',
    'Change Order Senders',
    'Sender mailbox options for change order emails.',
    '{"allowed":["projects@ellicorp.com","contracts@ellicorp.com"],"default":"projects@ellicorp.com"}'::jsonb,
    ARRAY['change-order'],
    true,
    'ACTIVE'
),
(
    'tpl_mail_signature_global_default',
    'MAIL_SIGNATURE',
    'global',
    'Default Signature',
    'Global default signature block used when a user has no saved signature profile.',
    '{"name":"Lissette Olivo","role":"Chief Executive Officer","email":"lissette@ellicorp.com","address":"50-01 Metropolitan Ave, Ridgewood, NY 11385","phone":"718-418-9002","fax":"718-418-4629","certificationLine":"M/WBE Certified      Elli NY Design is An Equal Opportunity Employer.","images":[{"fileName":"elli-logo.png","contentId":"elli-logo","width":135,"height":41,"alt":"Elli NY Design Corp","line":1},{"fileName":"signature-ribbon.png","contentId":"signature-ribbon","width":67,"height":47,"alt":"Certification ribbon","line":1},{"fileName":"mwbe-certified.png","contentId":"mwbe-certified","width":110,"height":28,"alt":"M/WBE Certified","line":2},{"fileName":"equal-opportunity.png","contentId":"equal-opportunity","width":179,"height":26,"alt":"Equal Opportunity Employer","line":2},{"fileName":"nycsca.png","contentId":"nycsca","width":226,"height":30,"alt":"NYCSCA","line":2}]}'::jsonb,
    ARRAY['global'],
    true,
    'ACTIVE'
),
(
    'tpl_pdf_profile_elli_default',
    'PDF_PROFILE',
    'elliDefault',
    'Elli Default PDF Profile',
    'Default company profile used for generated RFQ and purchase order PDFs.',
    '{"company":{"name":"ELLI N.Y. DESIGN CORP.","addressLines":["50-01 METROPOLITAN AVE","RIDGEWOOD, NY 11385"],"phone":"718-418-9002","logoPath":"assets/logo.png"},"shipToName":"Elli NY Design Corp"}'::jsonb,
    ARRAY['elli'],
    true,
    'ACTIVE'
),
(
    'tpl_mail_feature_auth_password_reset_default',
    'MAIL_FEATURE',
    'auth.passwordReset',
    'Password Reset Email',
    'Default password reset email content.',
    '{"senderGroup":"auth","subject":"Reset your ElliHub password","body":"Hello {{userName}},\n\nWe received a request to reset your ElliHub password.\n\nUse this secure link to choose a new password:\n{{resetUrl}}\n\nThis link expires in {{expiresInMinutes}} minutes. If you did not request this, you can ignore this email."}'::jsonb,
    ARRAY['auth'],
    true,
    'ACTIVE'
),
(
    'tpl_mail_feature_rfq_vendor_request_default',
    'MAIL_FEATURE',
    'rfq.vendorRequest',
    'RFQ Vendor Request',
    'Default single-vendor RFQ email.',
    '{"senderGroup":"rfq","subject":"RFQ {{rfqNumber}} - {{projectName}} - {{rfqTitle}}","body":"Hello {{vendorName}},\n\nPlease review the attached Request for Quote for {{projectName}}.\n\nRFQ: {{rfqNumber}}\nTitle: {{rfqTitle}}\nBid Deadline: {{bidDeadline}}\n\nPlease send your proposal before the deadline. Let us know if you have any questions.","pdfProfileKey":"elliDefault"}'::jsonb,
    ARRAY['rfq'],
    true,
    'ACTIVE'
),
(
    'tpl_mail_feature_rfq_vendor_request_all_default',
    'MAIL_FEATURE',
    'rfq.vendorRequestAll',
    'RFQ Vendor Request - All Vendors',
    'Default bulk RFQ email.',
    '{"senderGroup":"rfq","subject":"RFQ {{rfqNumber}} - {{projectName}} - {{rfqTitle}}","body":"Hello,\n\nPlease review the attached Request for Quote for {{projectName}}.\n\nRFQ: {{rfqNumber}}\nTitle: {{rfqTitle}}\nBid Deadline: {{bidDeadline}}\n\nPlease send your proposal before the deadline. Let us know if you have any questions.","pdfProfileKey":"elliDefault"}'::jsonb,
    ARRAY['rfq', 'bulk'],
    true,
    'ACTIVE'
);
