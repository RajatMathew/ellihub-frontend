# Module-wise Excel vs Frontend Data Gap Report

Project workbook fields compared against current frontend UI support

## Method
Compared the current frontend UI/forms in `/Users/albertfredy/elli-ui/src/modules/project` with the Excel workbook sections under `/Users/albertfredy/Downloads/CF Project Files v3`. The report is organized module-wise so each module can be discussed separately with the client and developers.

## 1. Project Module

Frontend support: Project Name, Description, Job Number, Fieldwire Project, Project Stage, Project Status, GC, Lead PM, Address, Contract Number, Contract Type, Division, Payment Terms, Contract Value, Retainage %, Target Budget %, Tax Rate %, Estimated Start/End, Set Inactive Date, TCO Date, Actual Start/Completion, Contract Documents.

Excel fields: Project_Name, Project_Number, GC_Name, GC_Contact, Address, Start_Date, End_Date, Stage. Prime contract sheet also contains Contract_ID, Original_Contract_Value, Payment Terms, Contract document links, schedule document links.

| Frontend field/group | Excel field/value | Problem | Client should add/fix | Developer should add/support |
|---|---|---|---|---|
| Project Name | Project_Name<br>Example: P.S. 512Q in CF- PS 512Q..v3.xlsx | Supported in frontend and present in Excel. | Keep as-is. | No frontend change needed. |
| Description | No PROJECT sheet field<br>Example: Frontend requires Description, but Excel only has Project_Name/Address/GC fields. | Cannot create a complete project from Excel without inventing description. | Add Project Description column. | Importer should require description or generate with visible warning. |
| Job Number | Project_Number<br>Example: 32000 for P.S. 512Q | Supported in frontend and present in Excel. | Keep Project_Number mandatory. | No frontend change needed. |
| Project Stage | Stage<br>Example: Brooklyn Public Library - CP2 has Stage = Submitals; P.S. 512Q has Stage blank. | Excel has typo/blank values. Frontend expects selected lookup stage. | Use fixed dropdown values: ONBOARDING, SUBMITTALS, FABRICATION, INSTALLATION, CLOSEOUT. | Normalize/validate stage values before import. |
| Project Status | No PROJECT sheet field<br>Example: Frontend has project status; Excel has no project status column. | Status must be defaulted or manually chosen. | Add Project Status column if client wants status preserved. | Importer should default only with warning or require value. |
| GC | GC_Name, GC_Contact<br>Example: P.S. 512Q has GC_Name = MPCC Corp.; GC_Contact = Fred Lalezarian. | GC name exists, but GC_Contact is sometimes name/email mixed and not structured. | Split GC contact into name/email/phone columns. | Map GC contact data to contact records, not only project text. |
| Lead PM | No PROJECT sheet field<br>Example: Frontend requires Lead PM; Excel has no Lead PM. | Cannot know project owner/PM from Excel. | Add Lead PM column or confirm default PM rule. | Importer must require/default Lead PM with warning. |
| Address | Address<br>Example: P.S. 512Q address = 81 Rockdale Avenue New Rochelle NY 10801; some others include commas. | Frontend stores street/city/state/zip separately; Excel address is a single inconsistent string. | Use separate Street, City, State, Zip columns. | Importer should parse and flag unparseable addresses. |
| Contract Number | Contract_ID<br>Example: Turkish Air has Contract_ID = 4861-007S. | Field exists but is in PRIME_CONTRACTS sheet, not PROJECT sheet. | Keep Contract ID in contract sheet or mirror into project sheet. | Importer must join project + prime contract sheet. |
| Division | No reliable PROJECT sheet field<br>Example: Frontend requires Contract Category / Division. Excel does not provide this directly. | Frontend requires a field not present in Excel. | Add Division/Contract Category column. | Fix frontend division lookup; currently useDivisionsQuery reads GC_TYPE, not PROJECT_DIVISION. |
| Payment Terms | Payment_Terms in PRIME_CONTRACTS<br>Example: Turkish Air payment terms = 60. | Exists but is numeric/string, frontend expects enum like NET_60. | Use NET_15/NET_30/NET_45/NET_60/NET_90/DUE_ON_RECEIPT. | Normalize payment terms. |
| Contract Value | Original_Contract_Value<br>Example: Turkish Air has 1118850. | Supported but stored in prime contract sheet. | Keep value complete for every contract row. | Importer must join contract value into project financials. |
| Retainage %, Target Budget %, Tax Rate % | No project-level fields<br>Example: Excel project/prime contract sheet does not contain these frontend fields. | Frontend can store them but Excel cannot provide them. | Add retainage, target budget, and tax rate columns if required. | Importer should default only with warning. |
| Estimated Start/End | Start_Date, End_Date<br>Example: P.S. 512Q has both blank. | Frontend supports dates; Excel has missing values. | Make dates mandatory or mark TBD explicitly. | Importer should produce validation issue for blanks. |
| TCO Date | No direct PROJECT sheet field<br>Example: Frontend requires TCO Date; Excel has End_Date only. | Frontend required field not explicitly present in Excel. | Add TCO Date column or confirm End_Date should be TCO Date. | Importer should map only by approved rule. |
| Actual Start/Completion | No direct Excel fields<br>Example: Frontend shows these fields, but submit payload currently does not include them. | Both sides incomplete: Excel lacks fields and frontend does not persist them. | Add Actual Start Date and Actual Completion Date if needed. | Wire actualStartDate/actualCompletionDate through frontend payload/backend. |
| Contract Documents | Contract Document Link, Contract Scheduled Document Link<br>Example: Turkish Air has Dropbox contract and schedule links. | Excel has links; frontend supports contract document upload, but URLs need import handling. | Ensure every document link is downloadable. | Importer should create/link external documents or upload files. |

## 2. Prime Contract / GC Contact Module

Frontend support: Contract number/value/type/payment terms on project form; contract documents; GC and contact directory modules.

Excel fields: Contract_ID, GC_Name, GC_Contact_Name, GC_Contact_Email, GC_Contact_Phone, Original_Contract_Value, Start_Date, End_Date, Payment_Terms, Contract Document Link, Contract Scheduled Document Link.

| Frontend field/group | Excel field/value | Problem | Client should add/fix | Developer should add/support |
|---|---|---|---|---|
| Prime Contract record | Contract_ID + Original_Contract_Value<br>Example: Turkish Air: Contract_ID 4861-007S, value 1118850. | Can map to project contract fields, but Excel sheet may contain contact-only rows too. | Separate actual contracts from contacts. | Importer should ignore contact-only rows as contracts. |
| GC contacts | GC_Contact_Name/Email/Phone<br>Example: Creedmoor row: Ana Hermsdorf, ahermsdorf@prisdev.com, phone 974 882 1133 with no contract ID. | Contact-only rows are mixed inside prime contract sheet. | Move contacts to a GC Contacts sheet or add Row Type. | Support multiple contacts linked to GC/project. |
| Contract schedule | Contract Scheduled Document Link<br>Example: Some projects have link, PS 508Q has schedule link missing. | Schedule document cannot be attached when link is blank. | Provide schedule link or mark Not Available. | Importer should flag missing schedule link. |

## 3. RFQ Module

Frontend support: RFQ title, description, bid deadline, track/type, deliverables, unit, attachments, vendor invites/quotes, award flow, create PO from awarded RFQ.

Excel fields: RFQ_ID, Title, Vendor, Status, Final_Amount, Issued Date; RFQ line item Item/Unit/Qty/Unit_Price; attachment Document_Name/Document_Link.

| Frontend field/group | Excel field/value | Problem | Client should add/fix | Developer should add/support |
|---|---|---|---|---|
| RFQ ID / Number | RFQ_ID<br>Example: Creedmoor: RFQ-2025-1562. | Present and useful. | Keep mandatory. | Map to rfqNumber. |
| Title | Title<br>Example: RFQ-2025-1562 title = Corian Adhesive Tubes. | Present. | Keep mandatory. | No frontend change. |
| Description | No RFQ description field<br>Example: Frontend requires Description; Excel does not provide it. | Required UI field missing from Excel. | Add RFQ Description column. | Importer should require/flag missing description. |
| Track / Type | No RFQ type/track field<br>Example: Frontend requires Track (Type); Excel has Vendor and Title only. | Required UI field missing. | Add RFQ Type/Track column. | Importer should not guess trade without warning. |
| Bid Deadline | No Bid Deadline field<br>Example: Excel has Issued Date but often blank. | Frontend requires Bid Deadline; Excel cannot provide it. | Add Bid Deadline column. | Importer validation required. |
| Issued Date | Issued Date<br>Example: RFQ-2025-1562 has Issued Date blank. | Excel field exists but values are mostly blank; frontend form does not show Issued Date. | Complete Issued Date if it matters. | Add/display issued date or store as import metadata. |
| RFQ Status | Status<br>Example: RFQ-2025-1562 Status blank. | Excel status incomplete; frontend workflow has Draft/Published/Awarded/Void logic. | Use DRAFT/PUBLISHED/AWARDED/VOID. | Map status carefully to workflow state. |
| Vendor | Vendor<br>Example: Turkish Air RFQ-2025-1644 Vendor = Multiple. | Frontend supports vendor invites/quotes, but Multiple is not a vendor. | Use one vendor per row or RFQ Vendor Quotes sheet. | Import vendor quotes/invites from normalized rows. |
| Final Amount | Final_Amount<br>Example: RFQ-2025-1562 Final_Amount blank. | Excel has field but blanks; frontend treats amount as quote/award data. | Fill final/award amount where awarded. | Map to awarded amount or quote amount based on status. |
| Deliverable Item/Qty/Unit | RFQ_LINE_ITEMS Item, Qty, Unit<br>Example: RFQ lines exist; some Unit values blank. | Frontend requires unit for deliverables. | Complete Unit for every RFQ line item. | Importer should flag missing unit. |
| Deliverable Unit Price | RFQ_LINE_ITEMS Unit_Price<br>Example: Excel has Unit_Price, but frontend RFQ form hides unit price. | Value may be lost in UI unless mapped to estimate/quote. | Clarify if Unit_Price is estimate or vendor quote. | Expose/import estimated unit price or quote line price. |
| RFQ Attachments | Document_Name, Document_Link<br>Example: Creedmoor RFQ attachment row has both blank. | Frontend supports RFQ attachments, but Excel gives no file. | Provide document name and downloadable link. | Import should flag blank attachment rows. |

## 4. Purchase Order Module

Frontend support: Vendor, trade category, linked RFQ, description, expected delivery date, payment terms, tax, line items with unit/cost code/unit price, backup documents, linked invoices/SCOs.

Excel fields: PO_ID, Linked_RFQ_ID, Issue_Date, Status, Vendor, Trade, PO_Amount, Tax_Rate, Expected_Date, Delivery_Date, Payment_Terms, Lead_Time, Ship_To, Notes, Created_By, Document_Link; line items Item/Qty/Unit/Unit_Price/Price.

| Frontend field/group | Excel field/value | Problem | Client should add/fix | Developer should add/support |
|---|---|---|---|---|
| PO Number | PO_ID<br>Example: Brooklyn Animal PO_ID = 23108. | Present. | Keep mandatory. | Map to poNumber. |
| Vendor | Vendor<br>Example: PO 23108 Vendor = McLine Studios. | Present. | Keep mandatory. | No frontend change. |
| Linked RFQ | Linked_RFQ_ID<br>Example: Turkish Air PO 25969 linked to RFQ 1643. | Frontend supports Linked RFQ optional. | Use full RFQ ID/number consistently. | Importer should map numeric 1643 to RFQ record. |
| Trade Category | Trade<br>Example: PO 25969 Trade = Civil. | Frontend supports trade category, but app trade categories may not match free text. | Use controlled trade list matching app lookups. | Normalize or flag unknown trade. |
| Status | Status<br>Example: Excel uses OPEN/CLOSED; frontend schema uses DRAFT/ISSUED/DELIVERED/CANCELLED plus paid display states. | Status values do not match. | Use app-approved PO statuses or provide mapping rules. | Map OPEN to ISSUED and CLOSED to DELIVERED only if approved. |
| Issue Date / Created By | Issue_Date, Created_By<br>Example: PO 25969 Issue_Date = 2025-08-25, Created_By = Tomasz. | Excel has fields, but frontend PO form does not expose issue date/created by as editable form fields. | Keep these columns if audit history matters. | Add import/preserve issue date and created by. |
| Expected / Delivery Date | Expected_Date, Delivery_Date<br>Example: PO 25969 Delivery_Date = 2026-03-04, Expected_Date blank. | Frontend supports expected date and delivery status handling; Excel often has one date missing. | Complete both dates if known. | Importer should map delivery date to delivered state only by rule. |
| Tax Rate | Tax_Rate<br>Example: PO 23108 Tax_Rate blank; tax rate blank in most PO rows. | Frontend supports tax percent, Excel mostly missing. | Complete tax rate or mark tax exempt. | Importer should distinguish blank from zero tax. |
| Payment Terms | Payment_Terms<br>Example: Many PO rows blank. | Frontend requires payment terms. | Complete payment terms using NET_30 etc. | Importer should default only with warning. |
| Backup Document | Document_Link<br>Example: PO 23108 Document_Link blank. | Frontend supports backup documents; Excel lacks links. | Provide downloadable PO document links. | Importer should skip/flag blank links. |
| Line Item Unit | Unit<br>Example: PO 23108 line item Unit blank. | Frontend requires unit for line item. | Complete Unit for every PO line. | Importer should flag blank unit. |
| Line Item Cost Code | No PO line item cost code field<br>Example: Frontend PO line item requires Cost Code; Excel has no Cost_Code column. | Frontend-required line item field missing from Excel. | Add Cost Code column to PO_LINE_ITEMS. | Make cost code importable or allow explicit import default. |
| Line Item Qty/Price | Qty, Unit_Price, Price<br>Example: Eastern Library PO 26054 line has Qty, Unit, Unit_Price, Price blank. | Frontend requires positive quantity and unit price. | Complete numeric values. | Importer should block incomplete lines. |

## 5. PO Payments / Invoice Module

Frontend support: Invoice Number, Invoice Date, Due Date, Purchase Order, Vendor, Total Amount, Tax Rate/Amount, notes, attachments, mark paid with Paid Date, Payment Method, Payment Reference, Payment Notes.

Excel fields: PO_ID, Date, CHK#, Note, Amount.

| Frontend field/group | Excel field/value | Problem | Client should add/fix | Developer should add/support |
|---|---|---|---|---|
| Invoice Number | No field<br>Example: PO_PAYMENTS has no invoice number. | Frontend invoice create requires invoice number. | Add Invoice Number column. | Importer should generate only with visible warning if missing. |
| Invoice Date / Due Date | Date only<br>Example: Payment row Date = 2025-08-21 for BPL PO 25353; no due date. | Excel date may be payment date, not invoice date/due date. | Add Invoice Date, Due Date, Paid Date separately. | Importer must not treat payment date as all dates without rule. |
| Payment Reference | CHK#<br>Example: BPL PO 25353 payment has CHK# blank. | Frontend supports payment reference but Excel sometimes blank. | Make CHK#/reference mandatory for paid rows. | Importer should allow blank only if payment method supports it. |
| Payment Method | No field<br>Example: Excel payment rows do not identify ACH/check/card/etc. | Frontend mark-paid requires payment method. | Add Payment Method column. | Importer should map to payment method lookup. |
| Tax | No payment tax fields<br>Example: Frontend invoice has tax rate and tax amount. | Tax cannot be recreated from Excel payments. | Add tax rate/amount or mark no tax. | Importer should calculate only by approved rule. |
| Payment Attachment | No document link<br>Example: No payment backup link in PO_PAYMENTS. | Frontend invoice supports attachments but Excel gives none. | Add Payment/Invoice Document Link. | Importer should attach file when provided. |
| Amount | Amount<br>Example: P.S. 512Q blank payment row has Amount blank. | Frontend requires positive invoice amount. | Remove blank rows and complete Amount. | Importer should block blank amount rows. |

## 6. Prime Change Order Module

Frontend support: Prime CO list, status filters, financial summary, Fieldwire sync status. Schema expects Fieldwire IDs, revision IDs, sync timestamps, creator/assignee Fieldwire users.

Excel fields: CO_ID, Name, Description, Status, Amount, Reason, Schedule_Impact_Days, Markup_Pct, Total_CO_Amount, Creator, Assignee, Due_Date, Approval_Date, Document_Link; line items Category/Cost_Code/Item/Qty/Unit_Type/Unit_Price/Price.

| Frontend field/group | Excel field/value | Problem | Client should add/fix | Developer should add/support |
|---|---|---|---|---|
| Manual Prime CO | PRIME_COs rows<br>Example: BPL CO 30400-0001 exists in Excel. | Frontend Prime CO module is not a normal create/edit form; it is Fieldwire sync-oriented. | Confirm whether Excel Prime COs are manual/imported COs or Fieldwire exports. | Add manual/imported Prime CO support separate from Fieldwire sync. |
| CO Name | Name<br>Example: BPL CO 30400-0001 Name blank. | Frontend/detail needs name; Excel may be blank. | Make Name mandatory. | Importer should fall back only with warning. |
| Status | Status<br>Example: BPL CO status = Approved. | Frontend supports Prime CO status labels, but status text must match controlled list. | Use Draft/Requested/Pending Revision/Pending Approval/Approved/Rejected/Void. | Normalize status. |
| Reason/Creator/Assignee | Reason, Creator, Assignee<br>Example: BPL CO 30400-0001 has Reason, Creator, Assignee blank. | Important workflow/audit fields missing. | Complete these fields if required for approval history. | Add fields/import support outside Fieldwire user IDs. |
| Schedule Impact | Schedule_Impact_Days<br>Example: Column exists but often blank. | Frontend has schedule impact filters, Excel values incomplete. | Complete days or mark none. | Map days and schedule impact status. |
| Document Link | Document_Link<br>Example: BPL CO 30400-0001 Document_Link blank. | No attachment can be recreated. | Provide document links. | Add Prime CO attachment support. |
| Prime CO Line Items | PRIME_CO_LINE_ITEMS<br>Example: 12 line item rows exist across workbooks. | Frontend has no visible Prime CO line-item create/edit UI. | Keep line item sheet complete. | Add Prime CO line-item model/UI if reporting is required. |

## 7. PO Change Order / Sub Change Order Module

Frontend support: Purchase Order, Date, Change Type, Title, Description, line items with unit/cost code/unit price, negotiated discount, shipping/handling, tax, documents, approve/reject/void workflow.

Excel fields: PO_ID, PO_CO_ID, Name, Description, Status, Amount, Reason, Schedule_Impact_Days, Markup_Pct, Creator, Assignee, Due_Date, Approval_Date, Document_Link; line items Category/Cost_Code/Item/Qty/Unit_Type/Unit_Price/Price.

| Frontend field/group | Excel field/value | Problem | Client should add/fix | Developer should add/support |
|---|---|---|---|---|
| SCO Number | PO_CO_ID<br>Example: Eastern Library PO_CO_ID = 25783-01. | Present. | Keep mandatory. | Map to SCO number. |
| Purchase Order Link | PO_ID<br>Example: Eastern Library SCO references PO 25783. | Frontend requires purchase order. | Keep PO_ID mandatory. | Importer should block SCO if PO missing. |
| Date | Due_Date / Approval_Date<br>Example: Eastern Library SCO has Due_Date 2025-11-07, Approval_Date blank. | Frontend has one Date field; Excel has due and approval dates. | Add explicit SCO Date or clarify which date maps to frontend Date. | Add due date field or approved mapping rule. |
| Change Type | No direct field; Reason exists<br>Example: Frontend requires Change Type; Excel has Reason blank often. | Required frontend field missing from Excel. | Add Change Type column. | Importer should require/default with warning. |
| Title / Description | Name, Description<br>Example: Eastern Library name = CO for WW Shop Drawings. | Present. | Keep mandatory. | No major frontend change. |
| Status | Status<br>Example: Eastern Library 25783-01 Status blank. | Frontend workflow has DRAFT/APPROVED/REJECTED/VOID. | Complete status using fixed values. | Importer should map/flag blank status. |
| Reason | Reason<br>Example: Many rows blank. | Frontend detail has reasonForChange concept, but form does not expose it as separate field. | Complete Reason if needed. | Add reason field to form/import. |
| Schedule Impact Days | Schedule_Impact_Days<br>Example: Column exists but often blank. | Frontend SCO form does not expose schedule impact days. | Complete or mark none. | Add schedule impact days field if business wants it. |
| Markup % | Markup_Pct<br>Example: Column exists but often blank. | Frontend has discount/shipping/tax, not markup % as first-class field. | Complete markup if used. | Add markup percent support or decide not used. |
| Creator / Assignee | Creator, Assignee<br>Example: Often blank. | Frontend does not have creator/assignee form fields. | Complete if audit/ownership needed. | Add import metadata/assignee fields. |
| Document Link | Document_Link<br>Example: Eastern Library 25783-01 Document_Link blank. | Frontend supports SCO documents, Excel lacks link. | Provide document links. | Importer should flag blank document links. |
| Line Item Cost Code | Cost_Code<br>Example: PO_CO_LINE_ITEMS has Cost_Code, sometimes em dash. | Frontend line items support costCodeId. | Use valid cost code values, not em dash. | Map cost code text to catalog IDs. |

## 8. Files / Attachments Cross-module

Frontend support: Project contract documents, RFQ attachments, PO backup documents, invoice attachments, SCO documents. Prime CO attachments are not clearly supported in current frontend.

Excel fields: Contract Document Link, Contract Scheduled Document Link, RFQ Document_Link, PO Document_Link, PO CO Document_Link, Prime CO Document_Link. Payment attachment link is missing.

| Frontend field/group | Excel field/value | Problem | Client should add/fix | Developer should add/support |
|---|---|---|---|---|
| Project contract docs | Contract Document Link<br>Example: Turkish Air has contract Dropbox link. | Works if link is downloadable. | Keep downloadable links. | Importer should support external URLs. |
| RFQ docs | RFQ_ATTACHMENTS Document_Link<br>Example: Creedmoor RFQ attachment row blank. | Frontend supports RFQ docs but no link exists. | Add links. | Flag blank attachment rows. |
| PO docs | PURCHASE_ORDERS Document_Link<br>Example: PO 23108 Document_Link blank. | Frontend supports PO backup documents. | Add links. | Import/link PO documents. |
| Invoice/payment docs | No PO_PAYMENTS document link<br>Example: Payment rows have no file link. | Frontend supports invoice attachments but Excel cannot provide them. | Add Payment/Invoice Document Link. | Import invoice attachments. |
| Prime CO docs | PRIME_COs Document_Link<br>Example: BPL CO 30400-0001 Document_Link blank. | Frontend Prime CO attachments not clearly available. | Add links where docs exist. | Add Prime CO attachment support. |

## Main Client Template Changes

- Add frontend-required fields missing from Excel: Project Description, Lead PM, Project Status, Division, TCO Date, RFQ Description, RFQ Type/Track, RFQ Bid Deadline, PO/SCO Cost Codes, Invoice Number, Invoice Date, Due Date, Payment Method, and payment/invoice document links.
- Use controlled dropdown values for Project Stage, RFQ Status, PO Status, Prime CO Status, PO CO/SCO Status, Payment Terms, Units, Trade Category, Division, and Change Type.
- Separate GC contacts from Prime Contracts, or add Row Type so contacts are not treated as contracts.
- Provide downloadable links for every attachment row.
- Remove blank rows from PO, payment, RFQ attachment, and change order sheets.

## Main Developer Changes

- Fix frontend Project Division lookup to use project division data, not GC_TYPE.
- Persist Actual Start Date and Actual Completion Date if they remain visible in the Project form.
- Add/import validation report showing missing required frontend fields by workbook/sheet/row.
- Add manual/imported Prime CO support if Excel Prime COs are not Fieldwire records.
- Add/support Prime CO line items and Prime CO attachments.
- Add RFQ issued date/final amount/imported status support or define where these values belong.
- Add payment import strategy: either simple payment records or invoice mapping with generated invoice numbers and warnings.
- Add SCO fields for reason, due date, schedule impact days, markup %, creator, assignee, and approval date if those Excel columns must be preserved.
