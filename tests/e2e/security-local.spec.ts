import { test, expect } from '@playwright/test';

// Opt-in: these are bounded negative requests to LOCAL infrastructure only.
// Never run this suite against a preview/public domain or real payment session.
test.describe('isolated local adversarial boundary checks', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(({ baseURL }) => {
    const url = new URL(baseURL || 'http://invalid');
    test.skip(process.env.PHASE0_LOCAL_SECURITY !== '1', 'Explicit local-security opt-in required');
    expect(['127.0.0.1', 'localhost', '[::1]']).toContain(url.hostname);
    expect(url.protocol).toBe('https:');
  });

  for (const path of ['/api/admin/operations', '/api/admin/dashboard', '/api/admin/orders']) {
    test(`unauthenticated ${path} is denied`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(401);
      expect(await response.text()).not.toMatch(/service_role|SUPABASE_SERVICE_ROLE_KEY|private@example/);
    });
  }
  for (const cookie of ['prestigeso_admin=forged', 'prestigeso_admin=eyJyb2xlIjoiYWRtaW4ifQ==.forged']) {
    test(`forged admin cookie denied ${cookie.length}`, async ({ request }) => {
      const response = await request.get('/api/admin/operations', { headers: { Cookie: cookie }, maxRedirects: 0 });
      expect(response.status()).toBe(401);
    });
  }
  test('SQL injection-shaped admin mutation cannot pass auth gate', async ({ request, baseURL }) => {
    const response = await request.post('/api/admin/db', { headers: { Origin: baseURL! },
      data: { action: 'delete', table: "orders; DROP TABLE orders; --", filters: [{ column: 'id', op: 'eq', value: "1 OR 1=1" }] } });
    expect(response.status()).toBe(401);
  });
  test('cross-site admin refund POST denied before financial code', async ({ request }) => {
    const response = await request.post('/api/admin/orders/refund', {
      headers: { Origin: 'https://attacker.invalid', 'Sec-Fetch-Site': 'cross-site', Cookie: 'prestigeso_admin=forged' },
      data: { orderId: 1, newStatus: 'İade Edildi' } });
    expect(response.status()).toBe(401);
  });
  test('outbox cannot be externally forced by forged session', async ({ request }) => {
    const response = await request.post('/api/admin/operations', { data: { action: 'dispatch_email', id: '00000000-0000-0000-0000-000000000001' } });
    expect(response.status()).toBe(401);
  });
  test('forged callback signature fails before database and providers', async ({ request }) => {
    const response = await request.post('/api/paytr/callback', {
      form: { merchant_oid: 'PHASE0FORGED', status: 'success', total_amount: '1000', hash: 'not-a-valid-hmac' } });
    expect(response.status()).toBe(400);
    expect(await response.text()).toContain('bad hash');
  });
  test('duplicate amount and SQL-shaped merchant id rejected', async ({ request }) => {
    for (const data of ['merchant_oid=PHASE0FORGED&status=success&total_amount=1000&total_amount=1&hash=bad',
      'merchant_oid=1%27+OR+1%3D1&status=success&total_amount=1000&hash=bad']) {
      const response = await request.post('/api/paytr/callback', { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, data });
      expect(response.status()).toBe(400);
    }
  });
  test('oversized callback body is rejected with bounded input', async ({ request }) => {
    const response = await request.post('/api/paytr/callback', { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, data: 'padding=' + 'x'.repeat(17000) });
    expect(response.status()).toBe(413);
  });
  test('maintenance secret cannot be bypassed with prefix or malformed header', async ({ request }) => {
    for (const authorization of ['Bearer forged', 'Basic forged']) {
      const response = await request.get('/api/maintenance', { headers: { Authorization: authorization } });
      expect(response.status()).toBe(401);
    }
  });
});
