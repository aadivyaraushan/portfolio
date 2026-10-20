import { expect, Page, test } from '@playwright/test';

type AdminConversation = {
  id: string;
  title: string;
  preview: string;
  pinned?: boolean;
  icon?: string;
  messages: { id: string; text: string; time: string }[];
};

function adminFixtures(): AdminConversation[] {
  return [
    {
      id: 'thread-edge',
      title: 'unstable thread',
      preview: 'prone to errors',
      messages: [
        { id: 'm-1', text: 'seed admin message', time: '2024-01-05T10:00:00.000Z' },
      ],
    },
  ];
}

async function primeAdminFetch(
  page: Page,
  conversations: AdminConversation[],
  options: { failMessages?: boolean } = {}
) {
  await page.addInitScript(({ conversations, options }) => {
    const slugify = (value: string) =>
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `thread-${Date.now()}`;
    const store = conversations.map((conv) => ({
      ...conv,
      messages: conv.messages.map((m) => ({ ...m })),
    }));
    let messageCounter = store.flatMap((c) => c.messages).length;
    const mockState = { conversations: store, messagePosts: 0, appendFailures: 0 };
    const adminWindow = window as typeof window & { __adminMock?: typeof mockState };
    adminWindow.__adminMock = mockState;
    const originalFetch = window.fetch.bind(window);
    localStorage.setItem('admin-basic-auth', 'Basic stub-auth');
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input?.toString?.() ?? '';
      const method = (init?.method ?? 'GET').toString().toUpperCase();
      const parseBody = () => {
        try {
          return init?.body ? JSON.parse(init.body as string) : {};
        } catch {
          return {};
        }
      };
      if (url.includes('/api/admin/auth')) {
        return Promise.resolve(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      if (url.includes('/api/admin/conversations')) {
        if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
          return Promise.resolve(
            new Response(JSON.stringify({ conversations: store }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        if (method === 'POST') {
          const body = parseBody();
          const id = slugify(body?.title ?? '') || `thread-${Date.now()}`;
          const seededMessages =
            body?.seed && body.seed.trim().length
              ? [
                  {
                    id: `msg-${++messageCounter}`,
                    text: body.seed.trim(),
                    time: new Date().toISOString(),
                  },
                ]
              : [];
          const conversation = {
            id,
            title: body?.title ?? '',
            preview: body?.preview ?? '',
            pinned: !!body?.pinned,
            icon: body?.icon ?? undefined,
            messages: seededMessages,
          };
          store.unshift(conversation);
          return Promise.resolve(
            new Response(JSON.stringify({ conversation }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        if (method === 'PATCH') {
          const body = parseBody();
          const idx = store.findIndex((c) => c.id === body?.id);
          if (idx >= 0) {
            store[idx] = {
              ...store[idx],
              preview: body?.preview ?? store[idx].preview,
              title: body?.title ?? store[idx].title,
              pinned:
                typeof body?.pinned === 'boolean'
                  ? body.pinned
                  : store[idx].pinned,
              icon:
                typeof body?.icon === 'string'
                  ? body.icon || undefined
                  : store[idx].icon,
            };
          }
          return Promise.resolve(
            new Response(JSON.stringify({ conversation: store[idx] }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        if (method === 'DELETE') {
          const body = parseBody();
          const idx = store.findIndex((c) => c.id === body?.id);
          if (idx >= 0) store.splice(idx, 1);
          return Promise.resolve(
            new Response(JSON.stringify({ success: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
      }
      if (url.includes('/api/admin/messages')) {
        mockState.messagePosts += 1;
        if (method === 'POST') {
          if (options?.failMessages) {
            mockState.appendFailures += 1;
            return Promise.resolve(
              new Response(JSON.stringify({ error: 'append failed for testing' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
              })
            );
          }
          const body = parseBody();
          const convo = store.find((c) => c.id === body?.threadId);
          if (!convo) {
            return Promise.resolve(
              new Response(JSON.stringify({ error: 'missing conversation' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
              })
            );
          }
          const message = {
            id: `msg-${++messageCounter}`,
            text: body?.text ?? '',
            time: new Date().toISOString(),
          };
          convo.messages.push(message);
          return Promise.resolve(
            new Response(JSON.stringify({ message }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        if (method === 'PATCH') {
          const body = parseBody();
          const id = url.split('/').pop();
          const convo = store.find((c) => c.messages.some((m) => m.id === id));
          const msg = convo?.messages.find((m) => m.id === id);
          if (msg && typeof body?.text === 'string') {
            msg.text = body.text;
          }
          return Promise.resolve(
            new Response(JSON.stringify({ message: msg }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        if (method === 'DELETE') {
          const id = url.split('/').pop();
          const convo = store.find((c) => c.messages.some((m) => m.id === id));
          if (convo) {
            convo.messages = convo.messages.filter((m) => m.id !== id);
          }
          return Promise.resolve(
            new Response(JSON.stringify({ success: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
      }
      return originalFetch(input, init);
    };
  }, { conversations, options });
}

async function stubAdminWithAppendFailure(page: Page) {
  await primeAdminFetch(page, adminFixtures(), { failMessages: true });
}

test.describe('Admin dashboard edge cases', () => {
  test('shows API errors when conversations fail to load', async ({ page }) => {
    await page.route('**/api/admin/conversations', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'supabase offline' }),
      })
    );
    
    // Mock auth check to pass
    await page.route('**/api/admin/auth', (route) => 
      route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) })
    );

    // Set auth token
    await page.addInitScript(() => {
        localStorage.setItem('admin-basic-auth', 'Basic stub-auth');
    });

    await page.goto('/admin');

    await expect(page.locator('.admin-error')).toHaveText(/supabase offline/i);
    await expect(
      page.getByRole('button', { name: /create conversation/i })
    ).toBeDisabled();
  });

  test('preserves drafts and surfaces errors when appending a message fails', async ({ page }) => {
    await stubAdminWithAppendFailure(page);
    await page.goto('/admin');

    await expect(page.getByText(/dm backend — append messages/i)).toBeVisible();

    const appendBox = page.getByPlaceholder('type a new message to append...');
    await appendBox.fill('This will fail to append.');
    await page.getByRole('button', { name: /^add message$/i }).click();

    await page.waitForFunction(() => {
      const adminWindow = window as typeof window & {
        __adminMock?: { appendFailures: number };
      };
      return (adminWindow.__adminMock?.appendFailures ?? 0) > 0;
    });
    await expect(page.locator('.admin-error')).toContainText(/append failed/i);
    await expect(appendBox).toHaveValue('This will fail to append.');
    const failedRow = page.locator('.admin-msg-row').filter({
      hasText: 'This will fail to append.',
    });
    await expect(failedRow).toHaveCount(0);
  });
});
