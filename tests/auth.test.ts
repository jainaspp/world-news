import { afterEach, describe, expect, it } from 'vitest';
import { isCronAuthorized } from '../server/auth';

const ORIGINAL = process.env.CRON_SECRET;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL;
});

describe('cron auth', () => {
  it('rejects every request when CRON_SECRET is missing', () => {
    delete process.env.CRON_SECRET;
    expect(isCronAuthorized('Bearer anything')).toBe(false);
    expect(isCronAuthorized(undefined)).toBe(false);
  });

  it('accepts only the exact bearer token from the environment', () => {
    process.env.CRON_SECRET = 'test-secret-value';
    expect(isCronAuthorized('Bearer test-secret-value')).toBe(true);
    expect(isCronAuthorized('Bearer other')).toBe(false);
    expect(isCronAuthorized('test-secret-value')).toBe(false);
  });
});
