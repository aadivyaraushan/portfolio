# iMessage redesign: implementation notes

Branch: `imessage-redesign` (not committed yet). Written 2026-10-19.

## Goal

Keep the "personal messenger" idea, but:

1. Remove the slow first load.
2. Make the page look and act like Apple iMessage.
3. Rewrite each thread as one message, in normal capital case, in the same voice.

## How the page loads now

```
Before:  browser ──HTML (empty shell)──▶ JS runs ──GET /api/conversations──▶ server
                                                     └─ 1 query for threads + 1 query per thread
         then fetch 386 KB emoji table + Google Font, then staggered fade-in animations

After:   Vercel cache ──HTML with every thread already inside──▶ browser (done)
         server rebuilds the cached HTML at most once per 60 s, or at once after an admin edit
```

- `src/app/page.tsx` is a server component with `revalidate = 60` (ISR).
- `src/lib/threads/server/loadThreads.ts` runs 2 queries in parallel (threads, messages) instead of 1 + N in series.
- Emoji names become image URLs on the server (`server/emoji.ts`), so the 386 KB emoji table never reaches the browser.
- Admin writes call `revalidateHome()` so edits show at once, not after 60 s.

### Measured result

Production builds of the old (HEAD) and new code, same mock data, simulated slow phone
(Chrome CPU 4× slower, 150 ms latency, 1.6 Mbps down), 3 runs each, time from navigation until the first
message text is fully visible:

| Version | First message visible | Data downloaded |
| ------- | --------------------- | --------------- |
| Old     | 2246–2266 ms          | 1068 KB         |
| New     | 282–311 ms            | 600 KB          |

The mock database answers in about 1 ms. Against real Supabase the old version is slower still,
because its 1 + N queries run in series after the page loads. The new version pays that cost on the server, not in the visitor's browser.

How to reproduce: build both versions with
`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54330 SUPABASE_SERVICE_ROLE_KEY=mock-service-key npx next build`,
serve the mock with `MOCK_SUPABASE_PORT=54330 node scripts/testing/mock-supabase.mjs <fixture.json>`,
then run `next start` and time it in Playwright with CDP network and CPU throttling.

## Decisions

| Decision | Why |
| -------- | --- |
| ISR at 60 s, plus revalidate on admin edits | Fast cached HTML. Admin edits still show at once. |
| Pinned threads keep the admin `index` order | The old code sorted them A–Z, which ignored the order set in admin. |
| Thread titles stay lowercase | The old API lowercased them, and the lowercase titles are part of the voice. Easy to change in `loadThreads.ts`. |
| On a phone, the page opens on the first thread, not the list | A first-time visitor sees the "about me" message at once. The back arrow opens the list. |
| Sender label "Aadivya" above each group | It looks like a group chat in iMessage, and makes clear who is talking. |
| Message text is turned into links in React, not with `dangerouslySetInnerHTML` | Removes an HTML injection risk. |
| Times: server renders Chicago time, browser switches to local relative time after hydration | Prevents a hydration mismatch. |
| Text fields show only the caret on focus | Matches Messages. The search field gets a soft macOS-style ring. |
| On a phone, the list does not mark the open thread | In iOS only one pane shows, so a selection color means nothing there. |
| Tailwind and the old CSS move to `src/app/admin/admin.css` | The public page no longer loads them. The admin page looks the same. |

## Thread text (copy)

- New text: `scripts/content/thread-copy.json` (one message per thread, capital case, same words).
- Edits beyond capital case: "Micheal" → "Michael", "etheruem" → "Ethereum", removed a duplicate "Ultimate Spider-Man",
  "in the sidebar" → "threads", resume text is "Resume:".
- To apply it to the live database (this deletes the extra message rows, so it needs the owner's OK):
  1. `vercel env pull .env.local`
  2. `node --experimental-strip-types scripts/content/apply-thread-copy.mjs` (dry run, prints the Supabase host)
  3. `node --experimental-strip-types scripts/content/apply-thread-copy.mjs --apply` (saves a backup to `scripts/content/backups/` first)

## Tests

- Unit: `npx jest __tests__/lib/threads __tests__/components/messages`
- End to end (starts its own mock Supabase and dev server): `npx playwright test tests/messages-page.spec.ts`
- Failed before this work and still fail (not touched): `__tests__/lib/supabaseAdmin.test.ts`,
  `Inventory.test.tsx`, `PlayerPreview.test.tsx`.

## Independent review (2026-10-19) and fixes

A fresh reviewer agent checked the work against its own rubric. What it found and what changed:

| Finding | Action |
| ------- | ------ |
| `/api/conversations/messages`, `/messages/[threadId]/[messageId]`, `/threads` let anyone write or delete with the service key. No UI used them (also not before this work). | Deleted, with `appendMessage`/`deleteMessage`/`createThread` and their tests. E2E test asserts 404. |
| Same kind of bug, found in the follow-up search: `/api/gmail/send` sent email from `inbox@aadivya.net` to any address, with no login. Unused. | Deleted. Same E2E test asserts 404. `/api/contact` stays (rate-limited, sends only to the owner). |
| One malformed `attachment_url` made the home page fail. | `fileNameFromUrl` catches it, logs a warning, and uses the thread name. Unit test. |
| Copy script would delete a second attachment in one thread. | `planThreadCopy` now stops with an error for that thread. Unit test. |
| Try Again on the error page did not fetch again (`reset()` alone does not, in Next.js 15). | `router.refresh()` + `reset()` in `startTransition`. E2E test fails Supabase, recovers it, clicks Try Again. |
| Text fields had no focus cue for keyboard users. | Composer border darkens, "From:" turns blue, search gets a ring. E2E test. |
| Titles are lowercase while message text is now capitalized. | Left as is. Owner's call. |

Search done for the same bug class: every route in `src/app/api`. Only `/api/admin/*` is behind `middleware.ts`.
`/api/contact` is public on purpose. `src/lib/gmail.ts` is unused, but nothing in the web app reaches it, so it was left.

## Open items

- Titles and taglines stay lowercase (`loadThreads.ts`). Change only if the owner wants capitals there too.
- The "18 y/o" text in "about me" and "principles" can be out of date.
- A deploy builds `/` from live Supabase. If Supabase is down at build time, the build fails and the old deploy keeps serving (seen with the mock stopped).
- `src/lib/gmail.ts` is dead code.
