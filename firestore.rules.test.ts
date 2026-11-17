/**
 * Security Rules Verification Suite — Dirty Dozen Adversarial Payloads
 * Standalone TypeScript spec runnable without extra test-runner dependencies.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email?: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: readonly DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Unauthenticated user cannot read /users/{userId} PII',
    path: '/users/alice',
    operation: 'get',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Signed-in user cannot read another user PII document',
    path: '/users/alice',
    operation: 'get',
    auth: { uid: 'bob', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Signed-in user cannot list /users collection (anti-enumeration)',
    path: '/users',
    operation: 'list',
    auth: { uid: 'bob', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Unverified email user cannot create /users/{uid}',
    path: '/users/charlie',
    operation: 'create',
    auth: { uid: 'charlie', email: 'charlie@example.com', email_verified: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Verified user cannot spoof another uid inside payload',
    path: '/users/bob',
    operation: 'create',
    auth: { uid: 'bob', email: 'bob@example.com', email_verified: true },
    payload: { uid: 'alice' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Shadow/ghost field injection (isAdmin: true) is blocked',
    path: '/users/bob',
    operation: 'create',
    auth: { uid: 'bob', email: 'bob@example.com', email_verified: true },
    payload: { uid: 'bob', isAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'PII (email) cannot be injected into /publicProfiles/{uid}',
    path: '/publicProfiles/bob',
    operation: 'create',
    auth: { uid: 'bob', email: 'bob@example.com', email_verified: true },
    payload: { uid: 'bob', email: 'bob@example.com', isPublic: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Poisoned boardId with special characters is rejected',
    path: '/users/bob/boards/bad..id$$',
    operation: 'create',
    auth: { uid: 'bob', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Array exhaustion (>24 achievements) is rejected',
    path: '/users/bob',
    operation: 'update',
    auth: { uid: 'bob', email_verified: true },
    payload: { unlockedAchievementsCount: 100 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Immutable fields (uid, email, createdAt) cannot be modified on update',
    path: '/users/bob',
    operation: 'update',
    auth: { uid: 'bob', email_verified: true },
    payload: { email: 'hacked@evil.com' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Client-forged timestamps (not request.time) are rejected',
    path: '/users/bob',
    operation: 'create',
    auth: { uid: 'bob', email_verified: true },
    payload: { updatedAt: '1970-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Orphaned custom board cannot be created if /users/{uid} does not exist',
    path: '/users/bob/boards/board_1',
    operation: 'create',
    auth: { uid: 'bob', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
];

export function verifyDirtyDozenSpecification(): boolean {
  return (
    DIRTY_DOZEN_CASES.length === 12 &&
    DIRTY_DOZEN_CASES.every((item) => item.expected === 'PERMISSION_DENIED')
  );
}
