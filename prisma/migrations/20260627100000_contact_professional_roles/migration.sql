WITH source_roles AS (
    SELECT DISTINCT old_role."label"
    FROM "Contact" contact
    JOIN "Lookup" old_role ON old_role."id" = contact."professionalRoleId"
    WHERE old_role."type" = 'PROFESSIONAL_ROLE'
), inserted_roles AS (
    INSERT INTO "Lookup" ("id", "type", "label")
    SELECT
        substr(md5('CONTACT_PROFESSIONAL_ROLE:' || source_roles."label"), 1, 8),
        'CONTACT_PROFESSIONAL_ROLE',
        source_roles."label"
    FROM source_roles
    ON CONFLICT DO NOTHING
    RETURNING "id", "label"
), contact_roles AS (
    SELECT "id", "label"
    FROM inserted_roles
    UNION
    SELECT "id", "label"
    FROM "Lookup"
    WHERE "type" = 'CONTACT_PROFESSIONAL_ROLE'
)
UPDATE "Contact" contact
SET "professionalRoleId" = contact_role."id"
FROM "Lookup" old_role
JOIN contact_roles contact_role ON lower(contact_role."label") = lower(old_role."label")
WHERE contact."professionalRoleId" = old_role."id"
  AND old_role."type" = 'PROFESSIONAL_ROLE';