# Admin editing on the main page (2026-10-20)

Branch `admin-inline-edit`. The owner signs in once and then edits the live iMessage page itself.
The old `/admin` dashboard is gone.

```
 visitor ──GET /──────────────▶ static page (ISR, 60 s)        no admin code, no admin request
 owner   ──/admin──▶ Sign In ──POST /api/admin/session──▶ cookies: admin_session (httpOnly, Strict, 30 d)
                                                                  admin_hint=1 (readable by the page)
 owner   ──GET /──▶ same static page ──hint seen──▶ GET /api/admin/session ──admin:true──▶
                    loadAdminUi() (one lazy chunk) ──▶ edit controls show
 edit    ──Server Action (isAdmin() check)──▶ Supabase (service key) ──▶ revalidatePath('/')
 upload  ──Server Action createUpload──▶ signed upload URL ──browser PUT──▶ Storage `chat-attachments`
```

## Decisions and why

- **Sign-in at a hidden URL, `/admin`**, with the existing `ADMIN_BASIC_USER` / `ADMIN_BASIC_PASS` (owner's choice).
  No new secret: the cookie key is `sha256("admin-session|" + ADMIN_BASIC_PASS + "|" + SUPABASE_SERVICE_ROLE_KEY)`.
  A password change signs out every device.
- **The page stays static.** Admin detection runs only in the browser. Only browsers with `admin_hint=1` ask the server,
  so visitors make no extra request. The hint cookie is not a secret. The real check is the httpOnly `admin_session`
  cookie, which every Server Action verifies.
- **Admin code loads in one go, after the session check** (`src/components/messages/admin/loadAdminUi.ts`).
  First version used `next/dynamic` for each part. Screenshots showed the messages, the composer and the
  New Conversation pane blank for a moment while each part loaded. Now admin mode turns on only after all parts load.
  E2E test: "switching to admin mode never blanks …".
- **Uploads go straight from the browser to Supabase** with a signed upload URL, so files over Vercel's 4.5 MB body
  limit work. Allowed: PNG, JPEG, GIF, WebP, AVIF, PDF, up to 20 MB. SVG and HTML are refused (they can run scripts).
  HEIC is refused because most browsers cannot show it. Without HEIC in the list, an iPhone sends a JPEG.
- **Deleting a conversation deletes its messages, then the thread.** Uploaded files stay in Storage.
- Removed with the old dashboard: `src/lib/adminAuth.ts` (Basic auth), `src/lib/supabaseClient.ts` (anon key client
  that the old dashboard used to upload), `src/components/EmojiClientProvider.tsx`, and the root `middleware.ts`.
  That middleware never ran: with a `src/` folder, Next.js reads only `src/middleware.ts`. Checked: the built server
  answered `GET /api/admin/session` with 200 and no `WWW-Authenticate` header.

## Fresh review (2026-10-20) and fixes

| Finding | Action |
| ------- | ------ |
| Sign-in limit was per IP address only. Changing address gave 10 more tries. | Added a second limit: 30 failures from all addresses in 15 min. Not covered by a test (it would lock out the other tests that share the server). |
| HEIC allowed. | Removed. Unit test. |
| Empty Order field was saved as 0. | Now an error "Order must be a whole number." E2E test. |
| Could not remove the caption of a message that has a file. | `editMessage` reads the row and allows empty text when it has a file. E2E test. |
| Phone: after deleting the open conversation, the screen stayed on a conversation. | Goes back to the list. E2E test. |
| Every Edit/Delete button had the same name for screen readers. | Name now includes the first 40 characters of the message. E2E test. |
| Upload type and size come from the browser and are not checked again after upload. | Accepted: only the signed-in owner can upload. |
| Sign-out does not cancel a copied cookie. | Accepted: change the password to sign out everywhere. |
| Delete of messages and thread is two steps with no transaction. | Accepted: if step two fails, the error shows and the owner can try again. |

Same-bug search: `Number(` / `parseInt(` on user input, same-name buttons, and `image/heic` in `src`. No other cases.

## Known limits

- The sign-in limits live in server memory, so each Vercel instance counts on its own.
- Uploaded files stay in Storage after their message or conversation is deleted.
- Guess, not checked: the `chat-attachments` bucket may still let the anon key upload (the old code did that).
  The code no longer uses the anon key, but the bucket policy in Supabase did not change.

## Email change

`EMAIL_TO` (where `/api/contact` sends visitor messages) is now `ssdear@gmail.com` in Vercel for production, preview and
development, set with `vercel env update`. It takes effect at the next deploy. The e2e tests now blank `RESEND_API_KEY`
and `EMAIL_TO`, so test runs cannot send real email.

## How to check it

```
npx jest __tests__/lib/admin          # session, limiter, input checks
npx playwright test tests/admin-inline.spec.ts
```

Results on 2026-10-20: jest 62 pass (3 suites fail as before this work: Inventory, PlayerPreview, supabaseAdmin),
Playwright 38/38, `next build`: `/` static with 1 min revalidate, none of the 8 first-load files contain admin code.
