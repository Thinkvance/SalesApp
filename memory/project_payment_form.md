---
name: PaymentConfirmationForm rate-card auto-fill
description: fetchLowestRate integration in PaymentConfirmationForm - country mapping, weight slab logic, service normalisation
type: project
---

Auto-fill Cost/KG in PaymentConfirmationForm.jsx uses fetchLowestRate(destination, service, weightSlab).

**Key utility functions in src/Utility/fetchLowestRate.js:**
- `COUNTRY_NAME_MAP` — maps booking DB country names ("United Kingdom") to rate card doc IDs ("UK")
- `getWeightSlab(kg)` — maps actual weight number to rate card slab string (e.g. 10 → "8.1 to 10 Kg")
- `normaliseService(service)` — maps "Duty Free" → "EcoDutyFree", others pass through unchanged

**Why:** Rate card Firestore collection uses short-code document IDs (UK, USA) but booking DB stores full country names. Weight slabs in rate cards use specific string labels that don't match the numeric weight.

**How to apply:** Any future rate lookups must go through these three helpers before hitting Firestore.
