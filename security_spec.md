# FEGGY FOODSTUFF Security Specification (Phase 0 TDD)

## 1. Data Invariants

1. **Identity & PII Isolation**: A `/users/{userId}` document may only be read or modified by the authenticated owner (`request.auth.uid == userId`) or a verified platform admin (`isAdmin()`). No unverified email or non-owner user may read PII (`email`, `phone`, `deliveryAddress`).
2. **No Self-Assigned Admin Privileges**: Users cannot write to `/admins/{adminId}` or attach `role` / `isAdmin` shadow fields to `/users/{userId}`. Only the verified bootstrap admin (`usitakatelvin@gmail.com` with `email_verified == true`) or existing `/admins/{uid}` admins can manage `/admins` and `/products`.
3. **Pay Small Small Plan Integrity**: Every `/installmentPlans/{planId}` created by a customer must match `userId == request.auth.uid`, enforce minimum thresholds (`daily >= 500`, `weekly >= 5000`, `monthly >= 1000`), ensure `amountPaidNgn <= totalTargetNgn`, `outstandingBalanceNgn == totalTargetNgn - amountPaidNgn`, and bind timestamps strictly to `request.time`.
4. **Immutable Financial Ledger**: `/payments/{paymentId}` documents require `gatewayStatus == 'success'`, `currency == 'NGN'`, `amountNgn > 0`, and cannot be updated or deleted by customers once written.
5. **Terminal State Locking**: Once an `InstallmentPlan` reaches `status == 'delivered'` or `status == 'cancelled'`, or an `Order` reaches `deliveryStatus == 'delivered'`, customers cannot mutate the document.
6. **Secure List Queries**: Every `allow list` on private collections (`/installmentPlans`, `/orders`, `/payments`, `/subscriptions`, `/reminderLogs`) strictly requires `isAdmin() || (isSignedIn() && resource.data.userId == request.auth.uid)`.
7. **Path Variable & Payload Size Hardening**: Every document ID path variable must satisfy `isValidId(id)` (`^[a-zA-Z0-9_\-]+$`, max 128 chars), and every string and array field enforces strict length bounds.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Shadow Field Injection on User Profile**: Creating `/users/u1` with `{ uid: 'u1', ..., isAdmin: true }` -> MUST return `PERMISSION_DENIED` (`hasOnly` rejects ghost key).
2. **Identity Spoofing on Installment Plan**: User `u1` creating `/installmentPlans/p1` with `userId: 'u2'` -> MUST return `PERMISSION_DENIED`.
3. **Email Spoofing Admin Bypass**: Token with `email: 'usitakatelvin@gmail.com'` and `email_verified: false` attempting to create `/products/prod1` -> MUST return `PERMISSION_DENIED`.
4. **Cross-Customer PII Read**: User `u1` attempting `get` on `/users/u2` -> MUST return `PERMISSION_DENIED`.
5. **Blanket List Scraping on Orders**: User `u1` querying `/orders` without `where('userId', '==', 'u1')` -> MUST return `PERMISSION_DENIED`.
6. **Below-Minimum Daily Contribution Bypass**: Creating `/installmentPlans/p2` with `frequency: 'daily'` and `installmentAmountNgn: 100` (below ₦500 min) -> MUST return `PERMISSION_DENIED`.
7. **Below-Minimum Weekly Contribution Bypass**: Creating `/installmentPlans/p3` with `frequency: 'weekly'` and `installmentAmountNgn: 2000` (below ₦5,000 min) -> MUST return `PERMISSION_DENIED`.
8. **Balance Tampering on Plan Update**: User updating `installmentPlans/p1` to set `totalTargetNgn: 1` or `amountPaidNgn: 999999` exceeding `totalTargetNgn` -> MUST return `PERMISSION_DENIED`.
9. **Immutable Payment Receipt Tampering**: User attempting to `update` or `delete` `/payments/pay1` to alter `amountNgn` -> MUST return `PERMISSION_DENIED`.
10. **Terminal State Mutation**: User attempting to update `/installmentPlans/p1` after `status == 'delivered'` -> MUST return `PERMISSION_DENIED`.
11. **Path ID Poisoning**: Creating `/orders/../../evil` or 500-char ID -> MUST return `PERMISSION_DENIED`.
12. **Client Timestamp Forgery**: Creating `/orders/o1` with a forged past `createdAt` not equal to `request.time` -> MUST return `PERMISSION_DENIED`.
