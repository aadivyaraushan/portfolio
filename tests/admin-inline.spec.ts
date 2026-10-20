import { expect, Page, test } from '@playwright/test';
import { ADMIN_BASIC_PASS, ADMIN_BASIC_USER, MOCK_SUPABASE_URL } from '../playwright.config';

type Row = Record<string, unknown>;
type MockState = { threads: Row[]; messages: Row[]; uploads: string[] };

async function mockSupabase(path: '__reset' | '__fail') {
  const res = await fetch(`${MOCK_SUPABASE_URL}/${path}`, { method: 'POST' });
  expect(res.ok).toBe(true);
}

async function mockState(): Promise<MockState> {
  return (await fetch(`${MOCK_SUPABASE_URL}/__state`)).json();
}

const list = (page: Page) => page.getByRole('navigation', { name: 'Conversations' });
const thread = (page: Page) => page.getByRole('region', { name: 'Conversation' });
const details = (page: Page) => page.getByRole('dialog', { name: 'Details' });

async function signIn(page: Page) {
  await page.goto('/admin');
  await page.getByLabel('Username').fill(ADMIN_BASIC_USER);
  await page.getByLabel('Password').fill(ADMIN_BASIC_PASS);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(thread(page).getByRole('button', { name: 'Conversation Details' })).toBeVisible();
}

async function post(page: Page, text: string) {
  await thread(page).getByLabel('Message', { exact: true }).fill(text);
  await thread(page).getByRole('button', { name: 'Send' }).click();
}

test.beforeEach(async () => {
  await mockSupabase('__reset');
});

test.describe('Admin editing on the main page', () => {
  test('a visitor sees no admin controls, and the page asks nothing about admin', async ({ page }) => {
    const adminRequests: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/api/admin')) adminRequests.push(r.url());
    });
    await page.goto('/');
    await expect(thread(page).getByText(/from the fixture/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Conversation' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Conversation Details' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit message' })).toHaveCount(0);
    await expect(page.getByLabel('Your email')).toBeVisible();
    expect(adminRequests).toEqual([]);
  });

  test('a wrong password does not sign in', async ({ page, context }) => {
    await page.goto('/admin');
    await page.getByLabel('Username').fill(ADMIN_BASIC_USER);
    await page.getByLabel('Password').fill('wrong password');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toHaveText('Wrong username or password.');
    expect((await context.cookies()).map((c) => c.name)).not.toContain('admin_session');
  });

  test('signing in keeps the session in a cookie that page scripts cannot read', async ({ page, context }) => {
    await signIn(page);
    const session = (await context.cookies()).find((c) => c.name === 'admin_session');
    expect(session).toMatchObject({ httpOnly: true, sameSite: 'Strict' });
    expect(await page.evaluate(() => document.cookie)).not.toContain('admin_session');
    // The composer posts as the owner, so it does not ask for an email.
    await expect(page.getByLabel('Your email')).toHaveCount(0);
  });

  test('switching to admin mode never blanks the messages, the composer, or a new pane', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    // The admin parts are ready the moment admin mode shows, so nothing flashes empty.
    expect(await thread(page).getByTestId('bubble').isVisible()).toBe(true);
    expect(await thread(page).getByLabel('Message', { exact: true }).isVisible()).toBe(true);

    await page.getByRole('button', { name: 'All conversations' }).click();
    await list(page).getByRole('button', { name: 'New Conversation' }).click();
    expect(await thread(page).getByLabel('Title').isVisible()).toBe(true);
  });

  test('adds a message, and a visitor then sees it', async ({ page, browser }) => {
    await signIn(page);
    await list(page).getByRole('button', { name: /Projects/ }).click();
    await post(page, 'Shipped a new project today.');
    await expect(thread(page).getByText('Shipped a new project today.')).toBeVisible();
    await expect(thread(page).getByLabel('Message', { exact: true })).toHaveValue('');

    const saved = (await mockState()).messages.find((m) => m.text === 'Shipped a new project today.');
    expect(saved).toMatchObject({ thread_id: 'projects' });

    const visitor = await (await browser.newContext()).newPage();
    await visitor.goto('/');
    await list(visitor).getByRole('button', { name: /Projects/ }).click();
    await expect(thread(visitor).getByText('Shipped a new project today.')).toBeVisible();
  });

  test('edits a message, then deletes it', async ({ page }) => {
    await signIn(page);
    // A screen reader user hears which message each button changes.
    await expect(thread(page).getByRole('button', { name: 'Edit message' })).toHaveAccessibleName(/^Edit message: Hi! I'm Aadivya/);
    await thread(page).getByRole('button', { name: 'Edit message' }).click();
    await thread(page).getByLabel('Edit message text').fill('Hi! I am Aadivya, edited.');
    await thread(page).getByRole('button', { name: 'Save' }).click();
    await expect(thread(page).getByLabel('Edit message text')).toHaveCount(0);
    await expect(thread(page).getByTestId('bubble')).toHaveText('Hi! I am Aadivya, edited.');
    expect((await mockState()).messages.find((m) => m.id === 'm-about')).toMatchObject({ text: 'Hi! I am Aadivya, edited.' });

    await thread(page).getByRole('button', { name: 'Delete message' }).click();
    await thread(page).getByRole('button', { name: 'Confirm Delete' }).click();
    await expect(thread(page).getByText('Hi! I am Aadivya, edited.')).toHaveCount(0);
    expect((await mockState()).messages.find((m) => m.id === 'm-about')).toBeUndefined();
  });

  test('changes the title, tagline, icon, and pin of a conversation', async ({ page }) => {
    await signIn(page);
    await list(page).getByRole('button', { name: /Projects/ }).click();
    await thread(page).getByRole('button', { name: 'Conversation Details' }).click();
    await expect(details(page).getByLabel('Title')).toHaveValue('Projects');
    await expect(details(page).getByLabel('Icon')).toHaveValue('ROCKET');

    await details(page).getByLabel('Icon').fill('not an emoji');
    await details(page).getByRole('button', { name: 'Save' }).click();
    await expect(details(page).getByRole('alert')).toContainText('No Apple emoji is named "not an emoji"');

    // An empty Order is an error, not a silent 0.
    await details(page).getByLabel('Icon').fill('ROCKET');
    await details(page).getByLabel('Order').fill('');
    await details(page).getByRole('button', { name: 'Save' }).click();
    await expect(details(page).getByRole('alert')).toHaveText('Order must be a whole number.');
    await details(page).getByLabel('Order').fill('1');

    await details(page).getByLabel('Title').fill('Things I Built');
    await details(page).getByLabel('Tagline').fill('Side projects');
    await details(page).getByLabel('Icon').fill('Fire');
    await details(page).getByLabel('Pinned').uncheck();
    await details(page).getByRole('button', { name: 'Save' }).click();
    await expect(details(page)).toBeHidden();

    await expect(thread(page).getByRole('heading', { name: 'Things I Built' })).toBeVisible();
    await expect(thread(page).getByText('Side projects')).toBeVisible();
    await expect(list(page).locator('.row__title', { hasText: 'Things I Built' })).toBeVisible();
    await expect(list(page).locator('.pinned__name')).toHaveText(['About Me']);
    expect((await mockState()).threads.find((t) => t.id === 'projects')).toMatchObject({
      title: 'Things I Built',
      preview: 'Side projects',
      icon: 'Fire',
      pinned: false,
    });
  });

  test('creates a conversation, posts in it, and deletes it with its messages', async ({ page }) => {
    await signIn(page);
    await list(page).getByRole('button', { name: 'New Conversation' }).click();
    await thread(page).getByLabel('Title').fill('Ideas');
    await thread(page).getByLabel('Tagline').fill('Half-baked thoughts');
    await thread(page).getByRole('button', { name: 'Create' }).click();
    await expect(thread(page).getByRole('heading', { name: 'Ideas' })).toBeVisible();
    await expect(thread(page).getByText('No messages yet.')).toBeVisible();

    await post(page, 'A first idea.');
    await expect(thread(page).getByText('A first idea.')).toBeVisible();
    await expect(list(page).getByRole('button', { name: /Ideas/ })).toBeVisible();
    const created = (await mockState()).threads.find((t) => t.title === 'Ideas');
    expect(created).toMatchObject({ preview: 'Half-baked thoughts', pinned: false });

    await thread(page).getByRole('button', { name: 'Conversation Details' }).click();
    await details(page).getByRole('button', { name: 'Delete Conversation' }).click();
    await details(page).getByRole('button', { name: 'Confirm Delete' }).click();
    await expect(list(page).getByRole('button', { name: /Ideas/ })).toHaveCount(0);
    await expect(thread(page)).toBeVisible();
    const after = await mockState();
    expect(after.threads.find((t) => t.id === created?.id)).toBeUndefined();
    expect(after.messages.filter((m) => m.thread_id === created?.id)).toEqual([]);
  });

  test('attaches a file to a new message', async ({ page }) => {
    await signIn(page);
    await list(page).getByRole('button', { name: /Resume/ }).click();
    await thread(page).getByLabel('Attach File').setInputFiles({
      name: 'Portfolio 2026.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test file'),
    });
    await expect(thread(page).getByText('Portfolio 2026.pdf')).toBeVisible();
    await thread(page).getByRole('button', { name: 'Send' }).click();
    await expect(thread(page).getByRole('link', { name: /Portfolio-2026\.pdf/ })).toBeVisible();
    const state = await mockState();
    expect(state.uploads).toEqual([expect.stringMatching(/^chat-attachments\/resume\/\d+\/Portfolio-2026\.pdf$/)]);
    expect(state.messages.at(-1)).toMatchObject({ thread_id: 'resume', attachment_type: 'file' });
  });

  test('removes the caption from a message that has a file', async ({ page }) => {
    await signIn(page);
    await list(page).getByRole('button', { name: /Resume/ }).click();
    await thread(page).getByRole('button', { name: 'Edit message' }).click();
    await thread(page).getByLabel('Edit message text').fill('');
    await thread(page).getByRole('button', { name: 'Save' }).click();
    await expect(thread(page).getByLabel('Edit message text')).toHaveCount(0);
    await expect(thread(page).getByRole('link', { name: /Resume\.pdf/ })).toBeVisible();
    expect((await mockState()).messages.find((m) => m.thread_id === 'resume')).toMatchObject({ text: '' });
  });

  test('on a phone, deleting the open conversation goes back to the list', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await thread(page).getByRole('button', { name: 'Conversation Details' }).click();
    await details(page).getByRole('button', { name: 'Delete Conversation' }).click();
    await details(page).getByRole('button', { name: 'Confirm Delete' }).click();
    await expect(list(page)).toBeVisible();
    await expect(list(page).getByRole('button', { name: /About Me/ })).toHaveCount(0);
  });

  test('refuses a file type that is not an image or a document', async ({ page }) => {
    await signIn(page);
    await thread(page).getByLabel('Attach File').setInputFiles({
      name: 'page.html',
      mimeType: 'text/html',
      buffer: Buffer.from('<script>alert(1)</script>'),
    });
    await thread(page).getByRole('button', { name: 'Send' }).click();
    await expect(thread(page).getByRole('alert')).toContainText('Attach an image or a PDF');
    expect((await mockState()).uploads).toEqual([]);
  });

  test('signing out removes the controls', async ({ page, context }) => {
    await signIn(page);
    await list(page).getByRole('button', { name: 'Sign Out' }).click();
    await expect(page.getByRole('button', { name: 'New Conversation' })).toHaveCount(0);
    await expect(page.getByLabel('Your email')).toBeVisible();
    expect((await context.cookies()).map((c) => c.name)).not.toContain('admin_session');
  });

  test('an edit fails safely when the session has ended', async ({ page, context }) => {
    await signIn(page);
    const before = (await mockState()).messages.length;
    await context.clearCookies();
    await post(page, 'This must not be saved.');
    await expect(thread(page).getByRole('alert')).toContainText('Sign in again');
    expect((await mockState()).messages.length).toBe(before);
  });

  test('only a real session counts as admin, and the old admin API is gone', async ({ request, playwright, baseURL }) => {
    expect(await (await request.get('/api/admin/session')).json()).toEqual({ admin: false });
    const forged = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { Cookie: `admin_session=${Date.now() + 1e9}.${'a'.repeat(64)}` },
    });
    expect(await (await forged.get('/api/admin/session')).json()).toEqual({ admin: false });
    await forged.dispose();

    for (const path of ['/api/admin/conversations', '/api/admin/messages', '/api/admin/auth']) {
      expect((await request.get(path)).status()).toBe(404);
    }
  });
});
