import { createLoginLimiter } from '@/lib/admin/server/loginLimiter';

describe('login limiter', () => {
  it('blocks an address after too many wrong passwords, then lets it try again later', () => {
    const limiter = createLoginLimiter({ maxFailures: 3, windowMs: 60_000 });
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) {
      expect(limiter.check('1.2.3.4', t0).allowed).toBe(true);
      limiter.recordFailure('1.2.3.4', t0);
    }
    expect(limiter.check('1.2.3.4', t0 + 1000)).toEqual({ allowed: false, retryAfterS: 59 });
    expect(limiter.check('5.6.7.8', t0).allowed).toBe(true);
    expect(limiter.check('1.2.3.4', t0 + 60_001).allowed).toBe(true);
  });

  it('forgets earlier failures after a correct sign-in', () => {
    const limiter = createLoginLimiter({ maxFailures: 2, windowMs: 60_000 });
    limiter.recordFailure('ip', 0);
    limiter.reset('ip');
    limiter.recordFailure('ip', 1);
    expect(limiter.check('ip', 2).allowed).toBe(true);
  });
});
