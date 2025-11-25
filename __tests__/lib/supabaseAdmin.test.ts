jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ admin: true })),
}));

describe('getSupabaseAdmin', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('throws if env variables are missing', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    const { getSupabaseAdmin } = await import('../../src/lib/supabaseAdmin');
    expect(() => getSupabaseAdmin()).toThrow(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for admin client.',
    );
  });

  it('creates client when env variables are set', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    const { getSupabaseAdmin } = await import('../../src/lib/supabaseAdmin');
    const client = getSupabaseAdmin();
    const { createClient } = require('@supabase/supabase-js');

    expect(createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'service-key',
    );
    expect(client).toEqual({ admin: true });
  });
});
