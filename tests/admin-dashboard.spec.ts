import { expect, Page, test } from '@playwright/test';

type AdminConversation = {
  id: string;
  title: string;
  preview: string;
  pinned?: boolean;
  icon?: string;
  messages: { id: string; text: string; time: string }[];
};

type ConversationFormInput = {
  title: string;
  preview: string;
  pinned: boolean;
  icon: string;
  seed: string;
};

function buildAdminFixtures(): AdminConversation[] {
  return [
    {
      id: 'thread-1',
      title: 'pinned thread',
      preview: 'first preview',
      pinned: true,
      icon: 'rocket',
      messages: [
        { id: 'm-1', text: 'pinned hello', time: '2024-01-01T10:00:00.000Z' },
      ],
    },
    {
      id: 'thread-2',
      title: 'second thread',
      preview: 'another preview',
      messages: [
        { id: 'm-2', text: 'second one', time: '2024-01-02T10:00:00.000Z' },
        {
          id: 'm-3',
          text: 'older follow up',
          time: '2024-01-02T11:30:00.000Z',
        },
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

async function stubAdminApi(page: Page) {
  const conversations = buildAdminFixtures().map((conv) => ({
    ...conv,
    messages: conv.messages.map((m) => ({ ...m })),
  }));

  await primeAdminFetch(page, conversations);
}

function getActiveCard(page: Page) {
  return page
    .locator('.admin-card')
    .filter({ hasText: 'delete thread' })
    .first();
}

async function createConversation(
  page: Page,
  overrides: Partial<ConversationFormInput> = {}
) {
  const form: ConversationFormInput = {
    title: 'Project Updates',
    preview: 'latest deploy notes',
    pinned: true,
    icon: 'sparkles',
    seed: 'Seed admin message',
    ...overrides,
  };

  await page.getByPlaceholder('title (e.g., quick links)').fill(form.title);
  await page
    .getByPlaceholder('preview (e.g., resume, email, socials)')
    .fill(form.preview);
  await page
    .getByRole('checkbox', { name: /^pinned$/i })
    .first()
    .setChecked(form.pinned);
  await page
    .getByPlaceholder('emoji unicode name (e.g., rocket, red heart)')
    .fill(form.icon);
  await page
    .getByPlaceholder('optional seed message to start the thread...')
    .fill(form.seed ?? '');
  await page.getByRole('button', { name: /create conversation/i }).click();
  await expect(
    page.getByRole('button', { name: new RegExp(form.title, 'i') })
  ).toBeVisible();

  return { card: getActiveCard(page), title: form.title };
}

test.describe('Admin dashboard operations', () => {
  test.beforeEach(async ({ page }) => {
    await stubAdminApi(page);
    await page.goto('/admin');
    await expect(page.getByText('dm backend — append messages')).toBeVisible();
  });

  test('lists seeded conversations including pinned ones', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /pinned thread/i })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /second thread/i })
    ).toBeVisible();
  });

  test('creates a new conversation with optional seed message', async ({
    page,
  }) => {
    const { card } = await createConversation(page);
    await expect(card.getByText('Seed admin message')).toBeVisible();
  });

  test('updates conversation metadata and persists changes', async ({
    page,
  }) => {
    const { card } = await createConversation(page, {
      title: 'Project Updates',
      preview: 'initial preview copy',
      seed: 'Seed admin message',
    });

    const metaInputs = card.locator('input.admin-textarea');
    await metaInputs.nth(0).fill('project updates v2');
    await metaInputs.nth(1).fill('fresh preview copy');
    await metaInputs.nth(2).fill('rocket');
    await card.getByRole('checkbox', { name: /^pinned$/i }).check();
    await card.getByRole('button', { name: /^save$/i }).first().click();
    await expect(metaInputs.nth(0)).toHaveValue('project updates v2');
    await expect(metaInputs.nth(1)).toHaveValue('fresh preview copy');
  });

  test('adds edits and deletes a message in a conversation', async ({
    page,
  }) => {
    const { card } = await createConversation(page);

    const appendBox = card.getByPlaceholder('type a new message to append...');
    await appendBox.fill('This is a new admin message.');
    await card.getByRole('button', { name: /^add message$/i }).click();
    await page.waitForFunction(() => {
      const adminWindow = window as typeof window & {
        __adminMock?: { messagePosts: number };
      };
      return (adminWindow.__adminMock?.messagePosts ?? 0) > 0;
    });
    const newMessageRow = page.locator('.admin-msg-row').first();
    await expect(newMessageRow.getByRole('textbox')).toHaveValue(
      'This is a new admin message.'
    );
    await expect(appendBox).toHaveValue('');

    const editableBox = newMessageRow.getByRole('textbox');
    await editableBox.fill('Edited admin message.');
    await newMessageRow.getByRole('button', { name: /^save$/i }).click();
    const editedRow = page.locator('.admin-msg-row').filter({
      hasText: 'Edited admin message.',
    });
    await expect(newMessageRow.getByRole('textbox')).toHaveValue(
      'Edited admin message.'
    );

    await editedRow
      .getByRole('button', { name: /delete message/i })
      .click();
    await expect(editedRow).toHaveCount(0);
  });

  test('deletes a conversation from the dashboard', async ({ page }) => {
    const { card, title } = await createConversation(page);
    await card.getByRole('button', { name: /delete thread/i }).click();
    await expect(
      page.getByRole('button', { name: new RegExp(title, 'i') })
    ).toHaveCount(0);
  });
});
