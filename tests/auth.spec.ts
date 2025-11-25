import { expect, test } from '@playwright/test';

test.describe('Admin Authentication', () => {
  test('shows login form for unauthenticated access to admin', async ({ page }) => {
    // Clear any existing auth
    await page.context().clearCookies();
    await page.addInitScript(() => {
      localStorage.removeItem('admin-basic-auth');
    });
    
    // Try to access admin page directly
    await page.goto('/admin');
    
    // Should show the login form, not the dashboard
    await expect(page.getByPlaceholder(/username/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /continue/i })).toBeVisible();
  });

  test('fails with invalid credentials', async ({ page }) => {
    // This depends on how the login UI is implemented. 
    // If it uses browser native basic auth, we can't easily test "invalid credentials" UI flow without more setup.
    // But if there is a login page, we can fill it.
    
    // Assuming there might be a login page or we are testing the API endpoint directly for auth.
    const response = await page.request.post('/api/admin/auth', {
      headers: {
        'Authorization': 'Basic ' + Buffer.from('wrong:wrong').toString('base64')
      }
    });
    expect(response.status()).toBe(401);
  });

  test('succeeds with valid credentials', async ({ page }) => {
    const username = process.env.ADMIN_BASIC_USER ?? 'admin';
    const password = process.env.ADMIN_BASIC_PASS ?? 'password';
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');

    const response = await page.request.post('/api/admin/auth', {
      headers: {
        'Authorization': `Basic ${credentials}`
      }
    });
    expect(response.status()).toBe(200);
  });
});
