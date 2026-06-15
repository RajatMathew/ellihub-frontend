---
title: Create and Approve a Sub Change Order
description: Create a sub change order from an issued purchase order, add cost line details, generate the PDF, approve it, and verify the PO amount update.
section: Projects Page
sectionOrder: 1
order: 10
tags: projects, sub change order, sco, purchase order, po, cost codes, pdf, approval, scribe
---

# Create and Approve a Sub Change Order

Use this guide when an issued purchase order needs a subcontractor change tracked against it. The walkthrough uses sample PO numbers, cost codes, item names, quantities, tax, and dollar amounts only; use the actual purchase order, change reason, cost code, item details, and amounts for the SCO being created.

## Start the SCO

Open the project's **Sub Change Order** page and select **Add Sub Change Order**.

![Project Sub Change Order page](/help/scribe/create-approve-sub-change-order/scribe-assets/step-01.jpeg)

![Add Sub Change Order action](/help/scribe/create-approve-sub-change-order/scribe-assets/step-02.jpeg)

In the new SCO form, open **Select purchase order...** and choose the issued purchase order that the change belongs to.

![Purchase order selector](/help/scribe/create-approve-sub-change-order/scribe-assets/step-03.jpeg)

![Purchase order selected](/help/scribe/create-approve-sub-change-order/scribe-assets/step-04.jpeg)

> A sub change order should be tied to the correct issued PO before any cost lines are entered. This is what allows the approved SCO amount to roll back into the purchase order totals.

## Enter Change Details

Open **Select change type...** and choose the change type that best describes the work. If the change does not match a predefined type, choose **Other**.

![Change type selector](/help/scribe/create-approve-sub-change-order/scribe-assets/step-05.jpeg)

![Other change type selected](/help/scribe/create-approve-sub-change-order/scribe-assets/step-06.jpeg)

Complete the main SCO fields:

| Field | What to enter |
| --- | --- |
| **Title** | A short, specific name for the change, such as the added scope or work package. |
| **Description** | A clear explanation of the requested change and why it is being added to the PO. |

![SCO title field](/help/scribe/create-approve-sub-change-order/scribe-assets/step-07.jpeg)

![SCO description field](/help/scribe/create-approve-sub-change-order/scribe-assets/step-09.jpeg)

## Add the Cost Line

Enter the item or work description for the SCO line.

![SCO line item field](/help/scribe/create-approve-sub-change-order/scribe-assets/step-11.jpeg)

Choose the cost code that should receive the change amount. For example, the Scribe selects **02-100 - Concrete**, but the actual cost code should match the project budget and scope.

![Cost code selector](/help/scribe/create-approve-sub-change-order/scribe-assets/step-13.jpeg)

![Cost code selected](/help/scribe/create-approve-sub-change-order/scribe-assets/step-14.jpeg)

Open the **Unit** selector and choose the correct unit, such as **EACH**, that matches how the change is being priced.

![Unit selector](/help/scribe/create-approve-sub-change-order/scribe-assets/step-15.jpeg)

![Unit selected](/help/scribe/create-approve-sub-change-order/scribe-assets/step-16.jpeg)

Complete the line pricing fields:

| Field | What to enter |
| --- | --- |
| **Quantity** | The number of units included in the change. |
| **Rate** | The unit price for the item or work. |
| **Tax** | The tax percentage or tax value required for the line, if applicable. |

![Quantity field](/help/scribe/create-approve-sub-change-order/scribe-assets/step-17.jpeg)

![Rate field](/help/scribe/create-approve-sub-change-order/scribe-assets/step-19.jpeg)

![Tax field](/help/scribe/create-approve-sub-change-order/scribe-assets/step-21.jpeg)

Review the calculated line total before continuing. In the sample walkthrough, the entered quantity, rate, shipping or handling, and tax produce a total increase of **+$132.00** after the SCO is approved.

## Create the SCO

Select **Create SCO** after the purchase order, change details, cost code, unit, quantity, rate, tax, and total have been reviewed.

![Create SCO action](/help/scribe/create-approve-sub-change-order/scribe-assets/step-23.jpeg)

Confirm the SCO detail page opens with the assigned SCO number. SCO numbers are tied to the purchase order number; for example, the first SCO against `PO-040` appears as `PO-040-01`.

![Created SCO detail page](/help/scribe/create-approve-sub-change-order/scribe-assets/step-24.jpeg)

## Generate the SCO PDF

From the SCO detail page, select **Generate PDF**.

![Generate SCO PDF action](/help/scribe/create-approve-sub-change-order/scribe-assets/step-25.jpeg)

Review the generated PDF preview before moving the SCO forward. The PDF should reflect the selected PO, SCO number, title, description, cost line, terms, and total.

![Generated SCO PDF preview](/help/scribe/create-approve-sub-change-order/scribe-assets/step-26.jpeg)

## Approve the SCO

After the generated PDF has been reviewed, close the preview and select **Approve**.

![Approve action](/help/scribe/create-approve-sub-change-order/scribe-assets/step-27.jpeg)

Review the approval confirmation, then select **Approve** again to finalize the workflow action.

![Approve SCO confirmation](/help/scribe/create-approve-sub-change-order/scribe-assets/step-28.jpeg)

> Approval is the step that moves the SCO amount into the purchase order's approved change order total. Do not approve until the linked PO, cost code, line amount, tax, and generated document are correct.

## Verify the Purchase Order Update

After approval, select **View PO** from the SCO detail page.

![View linked PO action](/help/scribe/create-approve-sub-change-order/scribe-assets/step-29.jpeg)

On the purchase order detail page, confirm the approved SCO amount appears in the PO's change order or approved changes area. In the sample walkthrough, the PO shows **+$132.00**.

![Approved SCO amount on PO](/help/scribe/create-approve-sub-change-order/scribe-assets/step-30.jpeg)

Open the approved change amount or related SCO link to confirm it points back to the correct SCO, such as `PO-040-01`.

![Linked SCO from PO](/help/scribe/create-approve-sub-change-order/scribe-assets/step-31.jpeg)

Return to the PO record and verify the purchase order still shows the same approved SCO increase.

![Verified approved SCO amount](/help/scribe/create-approve-sub-change-order/scribe-assets/step-32.jpeg)

## Quick Checklist

- Correct project and **Sub Change Order** page are open.
- SCO is linked to the correct issued purchase order.
- Change type, title, and description explain the requested change.
- Every SCO line has the correct item description, cost code, unit, quantity, rate, and tax.
- Calculated total is reviewed before selecting **Create SCO**.
- SCO detail page opens with the expected SCO number.
- PDF is generated and reviewed before approval.
- Approval confirmation is completed only after the SCO is correct.
- **View PO** shows the approved SCO amount on the linked purchase order.
- The PO's change amount links back to the correct SCO record.
