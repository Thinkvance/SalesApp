---
name: PaymentConfirmationForm UI improvements
description: UI structure of PaymentConfirmationForm - card layout, live total, pre-submit confirmation modal
type: project
---

PaymentConfirmationForm.jsx was redesigned with these sections:

1. **Shipment Info Card** — purple header strip with AWB badge, three sub-sections: Sender, Receiver (conditional), Shipment meta. No input boxes for read-only data.

2. **Pricing Details section** — Logistics Cost (always locked, no border), Cost/KG (locked when auto-filled or already set, shows "(auto-filled from rate card)" label), Discount Amount, Additional Charges. Live total summary (purple card) updates as user types using `watch()` from react-hook-form.

3. **Pre-submit confirmation modal** — triggered by "Get Payment" button via `handleGetPaymentPreview`. Shows Logistics Cost, Additional Charges, Discount, Total (Client Pays). "Confirm & Send" calls `onSubmit(pendingFormData)`.

**Why:** User wanted no input-box styling for read-only fields, auto-populated cost/kg to be locked, and a review step before sending payment request to customer.

**How to apply:** Do not change the onSubmit / paymentConfirm business logic. UI-only changes are safe to iterate on.
