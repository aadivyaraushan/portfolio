import { credentialsMatch, sessionSecret, signSession, verifySession, SESSION_MAX_AGE_S } from '@/lib/admin/server/session';

const env = { ADMIN_BASIC_USER: 'me', ADMIN_BASIC_PASS: 'correct horse', SUPABASE_SERVICE_ROLE_KEY: 'service-key' };
const secret = sessionSecret(env)!;
const now = Date.UTC(2026, 9, 20);

describe('admin session token', () => {
  it('accepts a token it signed, until it expires', () => {
    const token = signSession(now, secret);
    expect(verifySession(token, now, secret)).toBe(true);
    expect(verifySession(token, now + (SESSION_MAX_AGE_S - 1) * 1000, secret)).toBe(true);
    expect(verifySession(token, now + (SESSION_MAX_AGE_S + 1) * 1000, secret)).toBe(false);
  });

  it('rejects a changed, forged, empty, or malformed token', () => {
    const token = signSession(now, secret);
    const [expires, mac] = token.split('.');
    expect(verifySession(`${Number(expires) + 999999}.${mac}`, now, secret)).toBe(false);
    expect(verifySession(`${expires}.${'0'.repeat(mac.length)}`, now, secret)).toBe(false);
    expect(verifySession(undefined, now, secret)).toBe(false);
    expect(verifySession('', now, secret)).toBe(false);
    expect(verifySession('not-a-token', now, secret)).toBe(false);
    expect(verifySession(`${expires}.zz`, now, secret)).toBe(false);
  });

  it('rejects every old token when the admin password changes', () => {
    const token = signSession(now, secret);
    const newSecret = sessionSecret({ ...env, ADMIN_BASIC_PASS: 'new password' })!;
    expect(verifySession(token, now, newSecret)).toBe(false);
  });

  it('has no secret, so nobody can sign in, when the server is not configured', () => {
    expect(sessionSecret({ ...env, ADMIN_BASIC_PASS: '' })).toBeNull();
    expect(sessionSecret({ ...env, SUPABASE_SERVICE_ROLE_KEY: undefined })).toBeNull();
  });
});

describe('credentialsMatch', () => {
  it('accepts only the exact username and password', () => {
    expect(credentialsMatch('me', 'correct horse', env)).toBe(true);
    expect(credentialsMatch('me', 'correct horse ', env)).toBe(false);
    expect(credentialsMatch('Me', 'correct horse', env)).toBe(false);
    expect(credentialsMatch('me', '', env)).toBe(false);
  });

  it('rejects everything when the admin login is not set on the server', () => {
    expect(credentialsMatch('', '', { ...env, ADMIN_BASIC_USER: '', ADMIN_BASIC_PASS: '' })).toBe(false);
  });
});
