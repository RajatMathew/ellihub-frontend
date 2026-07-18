# Excel Sheet and App Comparison Notes

Date: 2026-06-04

## Simple Summary

The Excel files contain useful project, vendor, GC, purchase order, payment, contract, RFQ, and change order information.

The app already has many of these portions, but not all Excel details have a proper place in the app yet.

The main concern is not that the app is missing everything. The main concern is that some important historical details from Excel may be lost during migration if we do not prepare for them.

## Excel Files Checked

### Project Excel Files

These files contain project-wise data.

They include:

- project details
- prime contract details
- prime change orders
- RFQs
- purchase orders
- PO line items
- PO payments
- PO change orders
- document links

### GC Excel Files

These files contain general contractor information.

They include:

- GC company name
- address
- main phone
- fax
- email
- payment terms
- retainage percentage
- GC contacts
- primary contact flag

### Vendor Excel Files

These files contain vendor information.

They include:

- vendor name
- address
- phone
- fax
- email or website
- payment terms
- notes
- category/type information where available

## Things In Excel That Are Missing Or Weak In The App

### 1. Purchase Order Payments

Affected app portion: Purchase Orders / Payments

The Excel sheets have payment history for purchase orders.

They show:

- payment date
- check number or payment reference
- payment note
- amount paid

The app does not currently have a proper PO payment section.

This is important because without this, we cannot clearly know how much was already paid against each purchase order.

Recommended action:

- Add a PO payment section in the app.
- Each PO should be able to have multiple payments.

### 2. Prime Change Order Line Items

Affected app portion: Prime Change Orders

The Excel sheets have detailed line items for prime change orders.

They show:

- item name
- quantity
- unit
- unit price
- total price
- cost code or category

The app has prime change orders, but the detailed line-item breakdown is not fully available.

This means the app may keep the total amount but lose the details behind that total.

Recommended action:

- Add line items under prime change orders.
- Or decide to store those details as notes or attachments if line items are not needed in the app.

### 3. Prime Contract Details

Affected app portion: Projects / Prime Contracts

The Excel sheets have prime contract details.

They include:

- contract ID
- original contract value
- start date
- end date
- payment terms
- GC contact name
- GC contact email
- GC contact phone
- contract document link
- schedule document link

The app has a prime contract area, but it is mostly used for attaching contract files. It does not fully store contract details as separate fields.

This is important because a contract is not only a file. It also has value, dates, contact details, and terms.

Recommended action:

- Improve the prime contract section.
- Store contract number, value, dates, payment terms, GC contact, and document links properly.

### 4. Document Links

Affected app portion: Files / Attachments

The Excel sheets have many Dropbox or OneDrive links.

These appear in:

- prime contracts
- prime contract schedules
- prime change orders
- RFQ attachments
- purchase orders
- PO change orders

The app usually expects uploaded files, not only external links.

Recommended action:

- Decide how links should be handled before migration.
- Option 1: download files and upload them into the app.
- Option 2: keep links as external document links.
- Option 3: store links in notes if they are only for reference.

### 5. Purchase Order Change Order Extra Details

Affected app portion: Sub Change Orders / PO Change Orders

The Excel sheets have extra details for PO change orders.

They include:

- due date
- assignee
- schedule impact days
- markup percentage
- approval date
- document link

The app has subcontractor change orders, but not all these fields are clearly available.

Recommended action:

- Add missing tracking fields if the team needs them.
- At minimum, preserve these details during migration so they are not lost.

### 6. RFQ Vendor And Issued Date

Affected app portion: RFQs

The Excel RFQ sheets show:

- RFQ ID
- title
- vendor
- status
- final amount
- issued date
- RFQ line items

The app has RFQs, but vendor handling is more structured in the app. The app expects vendors and quotes to be linked properly, not just written as text.

The app also may not have a clear place for the old Excel issued date.

Recommended action:

- While importing RFQs, create proper vendor quote records where needed.
- Preserve the issued date if historical tracking is important.

### 7. Status Names Are Different

Affected app portion: Purchase Orders / Change Orders / RFQs

Excel uses statuses like:

- OPEN
- CLOSED
- APPROVED
- blank

The app uses statuses like:

- DRAFT
- ISSUED
- DELIVERED
- CANCELLED
- APPROVED
- REJECTED
- VOID

Recommended action:

- Create simple status mapping before migration.

Example:

- OPEN can become ISSUED
- CLOSED can become DELIVERED
- APPROVED can stay APPROVED
- blank should be checked manually

## GC Excel Notes

Affected app portion: General Contractors / Contacts

The GC Excel data mostly fits the app well.

The app already has places for:

- GC name
- address
- email
- phone
- website
- fax
- payment terms
- retainage percentage
- GC contacts
- primary contact

Important things to check:

- Some GC type values are blank in the cleaned sheet.
- The app requires a GC type, so we need a default or manual selection.
- Some contacts may have no email or phone.
- The app contact form expects at least one email or phone number.
- Primary contact should be preserved where Excel marks it.

Recommended action:

- Import GC companies.
- Import GC contacts.
- Set a default GC type where missing.
- Review contacts that have no email or phone.

## Vendor Excel Notes

Affected app portion: Vendors

The Vendor Excel data also mostly fits the app.

The app already has places for:

- vendor name
- vendor type
- category tags
- tax ID
- status
- address
- email
- phone
- website
- fax
- payment terms
- notes

Important things to check:

- Some vendor emails are missing.
- Some vendor rows have email and website mixed together in one source column.
- Some vendor type values are blank.
- Some category tags are blank.
- Some notes contain cleanup information from the source list.

One important app issue:

- The app currently requires vendor email.
- The Excel sheet has vendors with missing email.
- So those vendors may fail during import unless the app allows missing email or we provide a placeholder/review process.

Recommended action:

- Import vendors after cleaning email and website fields.
- Allow vendors without email, or mark them for manual review.
- Set default vendor type or category where missing.
- Keep useful notes from the Excel sheet.

## Things The App Has But Excel Does Not

The app also has extra fields and workflows that are not available in the Excel sheets.

These include:

- project division
- project status
- lead project manager
- project team members
- Fieldwire project data
- RFQ RFQ date
- RFQ type
- vendor quote workflow
- invoice workflow
- file storage details
- approval history
- rejection history
- cancellation history
- void history

This means the Excel sheets alone cannot fill the full app.

Some app fields will need:

- default values
- manual review
- separate setup
- or an import-only process

## Main Risk

The biggest risk is losing important money and project history.

The most important Excel data to protect is:

- PO payment history
- prime change order line-item details
- prime contract details
- document links
- approval dates
- change order tracking details
- GC primary contacts
- vendor contact and cleanup notes

## Recommended Next Steps

1. Add or plan a proper PO payment section in the app.

2. Decide how prime change order line items should be stored.

3. Improve the prime contract section so it stores more than just files.

4. Decide how external document links should be handled.

5. Create simple status mapping rules before importing.

6. Clean and review GC data, especially missing GC type and contacts without email or phone.

7. Clean and review Vendor data, especially missing emails and mixed email/website values.

8. Prepare default values for app fields that Excel does not have.

## Final Note

The app already has a good base, especially for projects, vendors, GCs, purchase orders, RFQs, and change orders.

But the Excel sheets contain important historical details that the app should not lose.

Before migration, we should make sure the app can safely handle payments, contracts, change order details, document links, GC contacts, and vendor cleanup issues.
