# Security Specification — Naga Tangga Nih Bos (Aether Serpent 3D)

## 1. Data Invariants
1. **Strict Ownership & PII Isolation (`/users/{userId}`)**:
   - Every `/users/{userId}` document contains PII (`email`) and must only be readable (`get`) and writable (`create`, `update`, `delete`) by the authenticated owner whose `request.auth.uid == userId` AND `request.auth.token.email_verified == true`.
   - Directory/collection listing (`allow list`) on `/users` is strictly denied (`false`) to prevent account enumeration.
2. **Master Gate Subcollection (`/users/{userId}/boards/{boardId}`)**:
   - A `CustomBoard` document cannot exist without a valid parent `/users/{userId}` document (`exists(/databases/.../users/$(userId))`).
   - `ownerUid` must strictly match `userId` and `request.auth.uid`, and `id` must match `boardId`.
3. **PII-Free Public Leaderboard Projection (`/publicProfiles/{userId}`)**:
   - Contains zero PII (`email`, phone, etc. forbidden by `keys().hasOnly(...)`).
   - `allow list` explicitly evaluates `resource.data.isPublic == true`.
   - Only the verified owner (`request.auth.uid == userId && email_verified == true`) may create, update, or delete their `publicProfiles/{userId}` document.
4. **Temporal & Schema Integrity**:
   - All `createdAt` fields must equal `request.time` on `create` and remain immutable (`incoming().createdAt == existing().createdAt`) on `update`.
   - All `updatedAt` fields must equal `request.time` on both `create` and `update`.
   - Every string enforces bounded `.size()`, every list enforces bounded `.size()` and index-0 type check, and every `update` uses action-based `affectedKeys().hasOnly(...)`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return `PERMISSION_DENIED`)
1. **Unauthenticated User Read PII**: Anonymous client `get('/users/alice')` -> DENIED.
2. **Cross-User PII Snooping**: Signed-in verified `bob` attempts `get('/users/alice')` -> DENIED.
3. **User Enumeration Scrape**: Signed-in verified `bob` attempts `list('/users')` -> DENIED.
4. **Unverified Email Account Write**: User `charlie` with `email_verified: false` attempts `create('/users/charlie', ...)` -> DENIED.
5. **Identity Spoofing on Create**: Verified `bob` attempts `create('/users/bob', { uid: 'alice', ... })` -> DENIED.
6. **Shadow / Ghost Field Injection (`isAdmin: true`)**: Verified `bob` sends `{ ..., isAdmin: true }` to `/users/bob` -> DENIED by `keys().hasOnly(...)`.
7. **PII Leak into Public Profile**: Verified `bob` attempts `create('/publicProfiles/bob', { ..., email: 'bob@evil.com' })` -> DENIED.
8. **Invalid / Poisoned Document ID**: Verified `bob` writes to `/users/bob/boards/bad..id..with$$chars` -> DENIED by `isValidId(boardId)`.
9. **Array Resource Exhaustion ("Denial of Wallet")**: Verified `bob` submits `unlockedAchievements` with 100 entries or integer elements -> DENIED by `.size() <= 24` & element check.
10. **Immutable Field Tampering**: Verified `bob` updates `/users/bob` changing `uid`, `email`, or `createdAt` -> DENIED.
11. **Client-Spoofed Timestamp**: Verified `bob` sets `updatedAt: new Date(0)` instead of `serverTimestamp()` (`request.time`) -> DENIED.
12. **Orphaned Board Without Parent User**: Verified `bob` writes `/users/bob/boards/b1` when `/users/bob` does not exist -> DENIED by Master Gate `exists(...)`.

## 3. Verification
All 12 adversarial payloads are codifed in `firestore.rules.test.ts` and validated against the ESLint security rules plugin (`@firebase/eslint-plugin-security-rules`) prior to deployment.
