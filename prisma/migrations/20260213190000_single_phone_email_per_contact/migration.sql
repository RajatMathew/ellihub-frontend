-- Convert emails array to single email object (take first item, null if empty)
ALTER TABLE "Contact" ADD COLUMN "email" JSONB;
UPDATE "Contact" SET "email" = CASE
    WHEN "emails" IS NOT NULL AND jsonb_array_length("emails") > 0 THEN "emails"->0
    ELSE NULL
END;
ALTER TABLE "Contact" DROP COLUMN "emails";

-- Convert phoneNumbers array to single phoneNumber object (take first item, null if empty)
ALTER TABLE "Contact" ADD COLUMN "phoneNumber" JSONB;
UPDATE "Contact" SET "phoneNumber" = CASE
    WHEN "phoneNumbers" IS NOT NULL AND jsonb_array_length("phoneNumbers") > 0 THEN "phoneNumbers"->0
    ELSE NULL
END;
ALTER TABLE "Contact" DROP COLUMN "phoneNumbers";
