# Project Excel Data Inconsistency Report

Excel cleanup requirements and frontend/app field gaps

## Scope
Reviewed 11 project Excel workbooks from `/Users/albertfredy/Downloads/CF Project Files v3` and frontend project modules in `/Users/albertfredy/elli-ui/src/modules/project`.

## Data Present in Excel

- Projects: 11
- Prime contract/contact rows: 16
- Purchase Orders: 40
- PO line items: 84
- PO payments: 62
- RFQs: 14
- RFQ line items: 22
- RFQ attachment rows: 14
- Prime Change Orders: 12
- Prime CO line items: 12
- PO Change Orders / SCOs: 6
- PO CO line items: 6

## Excel vs Frontend Support

### Project
Frontend currently supports: Project name/number, GC, address, estimated dates, stage, division, contract number/value, retainage, tax, payment terms, TCO, contract upload.
Gap / risk: Actual Start/Completion shown but not submitted; division lookup uses GC_TYPE; Excel lacks required Description/TCO in some cases.

### Prime Contract / GC Contacts
Frontend currently supports: Project contract document upload and GC/contact directory exist.
Gap / risk: Excel mixes contact-only rows into contract sheet; no clear frontend project-level multiple-contract/contact import flow.

### RFQ
Frontend currently supports: RFQ list/detail/create, bid deadline, type/track, deliverables, attachments, vendors/quotes, award/create PO flow.
Gap / risk: Excel lacks description/type/bid deadline; frontend lacks issued date as form field; final amount is award/quote data, not simple RFQ header data.

### Purchase Order
Frontend currently supports: Linked RFQ, vendor, trade, expected date, tax, payment terms, line items, cost codes, backup documents, linked invoices/SCOs.
Gap / risk: Excel lacks many cost codes/units; PO form does not directly capture Created By/Issue Date/Status as Excel columns.

### PO Payments / Invoices
Frontend currently supports: Invoice module supports invoice number/date/due date, amount, tax, paid status, payment reference/method, attachments.
Gap / risk: Excel payment tab lacks invoice number, due date, payment method, tax fields, and payment attachments.

### Prime Change Orders
Frontend currently supports: Prime CO list, filters, summaries, Fieldwire sync status.
Gap / risk: No manual Excel-style create/edit form; no line-item or attachment UI for imported Prime CO rows.

### PO Change Orders / SCOs
Frontend currently supports: SCO list/detail/create, purchase order link, date, title, description, change type, line items, attachments, approve/reject/void flow.
Gap / risk: Excel reason, schedule impact days, markup %, creator, assignee, due date, approval date are not all first-class form fields.

## Issues With Examples

### 1. Project Stage
Issue: Stage values are inconsistent and misspelled. This will create duplicate/incorrect stages unless normalized.
Example: CF-BPL CP-2..v3.xlsx: Project "Brooklyn Public Library - CP2" has Stage = "Submitals". CF- PS 512Q..v3.xlsx has Stage blank.
Client should: Use a fixed dropdown list: ONBOARDING, SUBMITTALS, FABRICATION, INSTALLATION, CLOSEOUT.
Developer should: Frontend already has stage selection, but import must normalize/validate misspellings before creating stage records.

### 2. Project Dates
Issue: Some projects are missing start/end dates. The frontend also has actual start/completion fields, but those values are not currently included in create/update payloads.
Example: CF- PS 512Q..v3.xlsx: P.S. 512Q has Start_Date blank and End_Date blank. Frontend project form shows Actual Start Date and Actual Completion Date fields, but submit payload omits them.
Client should: Make project Start Date and End Date mandatory or explicitly mark as TBD. Add actual dates in Excel only if the client wants real dates tracked separately.
Developer should: Wire actualStartDate and actualCompletionDate through frontend schema, payload, backend, and project overview display.

### 3. Project Division
Issue: The frontend project form requires Division, but the division hook currently loads GC_TYPE lookups, not a project division lookup.
Example: Frontend file src/modules/project/hooks/lookup.hooks.ts: useDivisionsQuery() calls useLookupsQuery("GC_TYPE").
Client should: Confirm the valid division list to use in Excel, for example SCA, DDC, CIVIL, INSTITUTIONAL.
Developer should: Add/use a PROJECT_DIVISION lookup in frontend/backend instead of GC_TYPE for project division.

### 4. Prime Contract vs GC Contacts
Issue: Prime contract rows are mixed with GC contact-only rows. Contract fields are blank in contact-only rows.
Example: CF-CREEDMOORE 2..v3.xlsx: Ana Hermsdorf is listed with email/phone, but Contract_ID, Original_Contract_Value, Start_Date, End_Date, and document links are blank.
Client should: Separate contract data and GC contact data into different sheets or add a Row Type column: Contract / Contact.
Developer should: Support multiple GC contacts per project/contract and import them separately from prime contract records.

### 5. RFQ Required Fields
Issue: Excel RFQs do not provide every field the frontend requires to create an RFQ.
Example: Frontend RFQ form requires Title, Description, Track/Type, Bid Deadline, and at least one Deliverable. Excel RFQ sheet has RFQ_ID, Title, Vendor, Status, Final_Amount, Issued Date; it does not provide Description, Track/Type, or Bid Deadline.
Client should: Add RFQ Description, RFQ Type/Track, and Bid Deadline to the Excel template.
Developer should: Add an import-friendly RFQ mapping/validation flow. Do not silently invent required fields without a warning.

### 6. RFQ Header Data
Issue: RFQs exist, but status, final amount, and issued date are often blank. Frontend does not currently expose issued date as a normal RFQ form field.
Example: CF-CREEDMOORE 2..v3.xlsx: RFQ-2025-1562 has Vendor = Parksite, but Status, Final_Amount, and Issued Date are blank.
Client should: Complete RFQ Status, Issued Date, Bid Deadline, Final Amount, and Awarded Vendor where applicable.
Developer should: Add/support RFQ issued date, imported status, final amount, awarded vendor/amount, and clear RFQ status mapping.

### 7. RFQ Vendor Values
Issue: Some RFQs use vague vendor values such as "Multiple", which cannot identify actual vendors or quotes.
Example: CF- TURKISH AIR..v3.xlsx: RFQ-2025-1644 has Vendor = "Multiple".
Client should: Use one vendor per row or provide a separate RFQ Vendor Quotes sheet with RFQ ID, Vendor, Quote Amount, Quote Date, Lead Time, Attachments, and Awarded flag.
Developer should: Frontend supports RFQ invites/quotes and award flow; add import support for multiple vendor quotes from Excel.

### 8. RFQ Line Items
Issue: Excel has RFQ Unit_Price, but the current RFQ form hides unit price for deliverables. Cost code can exist in frontend schemas, but the form hides cost code for RFQ deliverables.
Example: RFQ_LINE_ITEMS has Unit_Price, but RFQ form LineItems uses hideUnitPrice and hideCostCode.
Client should: Clarify whether RFQ line item price is an estimated budget, vendor quote price, or final awarded price.
Developer should: Expose/import RFQ deliverable estimated unit price and cost code if the client expects these values to be visible/reportable.

### 9. RFQ Attachments
Issue: Attachment rows exist but many have no document name or document link, so no file can be imported. Frontend does support RFQ attachments when files exist.
Example: CF-CREEDMOORE 2..v3.xlsx: RFQ-2025-1562 attachment row has Document_Name blank and Document_Link blank.
Client should: Every attachment row must include Document Name and a downloadable Document Link.
Developer should: Keep RFQ attachment UI; add import validation for missing attachment URLs.

### 10. Purchase Orders
Issue: PO rows contain useful fields, but tax rate, document link, payment terms, and sometimes full row data are missing. Frontend supports linked RFQ, tax, payment terms, attachments, line items, and expected date.
Example: CF-BKLYN ANIMAL..v3.xlsx: PO 23108 has Tax_Rate blank and Document_Link blank. CF- PS 512Q..v3.xlsx has a blank PO row with PO_ID, Vendor, and PO_Amount missing.
Client should: Make PO ID, Vendor, PO Amount, Status, Issue Date, Trade, Tax Rate, Payment Terms, and Document Link required where applicable.
Developer should: Frontend already has linked RFQ and backup documents. Add/import Issue Date, Created By, and initial Status handling if those Excel fields need to be preserved exactly.

### 11. PO Line Items
Issue: Line items are present, but many units are blank and some quantity/unit price values are missing. Frontend PO line items require unit and cost code.
Example: CF-BKLYN ANIMAL..v3.xlsx: PO 23108 line item "Fabrication of Shop DWGs" has Unit blank. CF-EASTERN LIBRARY..v3.xlsx: PO 26054 line item has Qty, Unit, Unit_Price, and Price blank.
Client should: Complete Quantity, Unit, Unit Price, Price, and add Cost Code if PO creation/import should pass app validation.
Developer should: Add a Cost Code column to the Excel template or make import able to flag/default missing cost codes with user confirmation.

### 12. PO Payments vs Invoice UI
Issue: Excel payments are simple check/payment rows, while the frontend invoice module expects full invoice records.
Example: Excel PO_PAYMENTS has PO_ID, Date, CHK#, Note, Amount. Frontend invoice create schema requires Invoice Number, Invoice Date, Due Date, Total Amount, Tax Amount, Tax Rate, related SCO IDs, and Attachments.
Client should: Add Invoice Number, Invoice Date, Due Date, Payment Method, Payment Attachment Link, Tax Rate/Amount, and optionally Related SCO IDs.
Developer should: Either add a simple PO payment import flow or map Excel payment rows into invoices with clear generated invoice numbers and validation warnings.

### 13. Prime Change Orders
Issue: Prime COs and line items are present in Excel, but frontend Prime CO module is Fieldwire/list/sync-oriented and has no normal create/edit form for Excel-style manual COs.
Example: CF-BPL CP-2..v3.xlsx: CO 30400-0001 has Description and Amount, but Name, Reason, Creator, Assignee, and Document_Link are blank. Frontend Prime CO schema requires Fieldwire identifiers and revision/sync fields.
Client should: Complete CO ID, Name, Description, Status, Amount, Reason, Schedule Impact Days, Markup %, Creator, Assignee, Due Date, Approval Date, and Document Link.
Developer should: Add manual/imported Prime CO support, Prime CO attachments, and a Prime CO line-item UI/model if line item reporting is required.

### 14. PO Change Orders / SCOs
Issue: PO CO rows are present, but some statuses and approval dates are blank, and document links are missing. Frontend SCO form supports date/title/description/change type/line items/attachments, but not all Excel columns as first-class fields.
Example: CF-EASTERN LIBRARY..v3.xlsx: PO_CO_ID 25783-01 has Status blank, Approval_Date blank, and Document_Link blank. Frontend SCO form does not include separate Reason, Schedule Impact Days, Markup %, Creator, Assignee, Due Date, or Approval Date inputs.
Client should: Use fixed statuses: DRAFT, APPROVED, REJECTED, VOID. Complete due date, approval date, amount, and document link.
Developer should: Add/support SCO reason, schedule impact days, markup percent, creator, assignee, due date, approval date, imported status, attachments, and cost-coded line items.

## What Client Should Add/Fix in Excel

- Use fixed dropdown/status values for Project Stage, RFQ Status, PO Status, Prime CO Status, and PO CO/SCO Status.
- Add missing frontend-required fields to Excel: Project Description, TCO Date, RFQ Description, RFQ Type/Track, RFQ Bid Deadline, PO/SCO Cost Codes, Invoice Number, Invoice Date, and Due Date.
- Separate GC contacts from Prime Contract rows, or add Row Type so contacts are not mixed with contracts.
- Make IDs mandatory: Project Number, Contract ID, RFQ ID, PO ID, Prime CO ID, PO CO ID.
- Complete all required dates: project start/end, RFQ issued/bid deadline, PO issue/expected/delivery, invoice/payment date, CO due/approval dates.
- Provide real downloadable document links for every attachment row.
- Avoid vague vendor values like Multiple. Use one vendor per row or a vendor quotes sheet.
- Complete Quantity, Unit, Unit Price, and Price for all RFQ/PO/CO line items.
- Add Invoice Number, Payment Method, and Payment Attachment Link to payment data.

## What Developer Should Add/Support in App

- Project: wire actualStartDate and actualCompletionDate through frontend payload/backend; fix division lookup from GC_TYPE to PROJECT_DIVISION.
- Project import: handle Excel missing Project Description and TCO Date with validation rather than silent defaults.
- GC/Contacts: import multiple GC contacts separately from prime contract rows.
- RFQ: add/import issued date, imported status, final amount, awarded vendor/amount, multi-vendor quotes, RFQ attachments, and RFQ-to-PO display.
- RFQ form/import: support RFQ deliverable estimated unit price and cost code if Excel values are expected to be preserved.
- PO: preserve linked RFQ, backup documents, issue date, created by, initial status, tax/payment terms, and line item cost code validation.
- Payments/Invoices: either add a simple payment import flow or map payments to invoices with generated invoice numbers plus warnings; support payment method and payment attachments.
- Prime CO: add manual/imported Prime Change Order support independent of Fieldwire-only sync data, including attachments and line items.
- SCO: add first-class fields/import support for reason, schedule impact days, markup percent, creator, assignee, due date, approval date, imported status, attachments, and cost-coded line items.
- Importer: generate a validation report before import showing missing mandatory fields and invalid dropdown values by workbook/sheet/row.

## Recommended Client Message
The Excel files contain the right categories of project data, but several required values are missing or inconsistent. After checking the frontend, some Excel columns also do not map cleanly to current screens, especially Prime Change Orders, RFQ issued/final values, payment rows, and SCO schedule/markup metadata. Before final import, we need standardized dropdown values, complete IDs/dates/amounts, separate contact rows, and real document links for attachment rows.
