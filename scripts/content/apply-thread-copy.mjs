// Rewrites each thread into one message, using the text in thread-copy.json.
//
//   Dry run (reads only, changes nothing):
//     node --experimental-strip-types scripts/content/apply-thread-copy.mjs
//   Apply (saves a backup of every message row first, then writes):
//     node --experimental-strip-types scripts/content/apply-thread-copy.mjs --apply
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (for example in .env.local,
// from `vercel env pull .env.local`). The live page picks up the change within 60 seconds.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { planThreadCopy } from './planThreadCopy.ts';

const here = dirname(fileURLToPath(import.meta.url));
config({ path: '.env.local' });
config();

const apply = process.argv.includes('--apply');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(url, key);
const copy = JSON.parse(readFileSync(join(here, 'thread-copy.json'), 'utf8'));

async function rows(table, columns) {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) throw new Error(`${table} query failed: ${error.message}`);
  return data;
}

const threads = await rows('threads', 'id, title');
const messages = await rows('messages', '*');
const plan = planThreadCopy(threads, messages, copy);

console.log(`Supabase project: ${new URL(url).host}`);
for (const t of plan.threads) {
  const status = t.changed ? `keep 1, delete ${t.deleteIds.length}, rewrite text` : 'no change';
  console.log(`- ${t.title}: ${status}`);
}
if (plan.missingInDb.length) console.warn('Copy entries with no thread in the database:', plan.missingInDb);
if (plan.notInCopy.length) console.warn('Threads with no new copy (left as they are):', plan.notInCopy);

if (!apply) {
  console.log('\nDry run. Nothing changed. Add --apply to write.');
  process.exit(0);
}

const backupDir = join(here, 'backups');
mkdirSync(backupDir, { recursive: true });
const backupPath = join(backupDir, `messages-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
writeFileSync(backupPath, JSON.stringify({ threads, messages }, null, 2));
console.log(`\nBackup of ${messages.length} message rows: ${backupPath}`);

for (const t of plan.threads.filter((p) => p.changed)) {
  if (!t.keepId) {
    console.warn(`- ${t.title}: no message to rewrite, skipped`);
    continue;
  }
  const { error: updateError } = await supabase.from('messages').update({ text: t.text }).eq('id', t.keepId);
  if (updateError) throw new Error(`${t.title}: update failed: ${updateError.message}`);
  if (t.deleteIds.length) {
    const { error: deleteError } = await supabase.from('messages').delete().in('id', t.deleteIds);
    if (deleteError) throw new Error(`${t.title}: delete failed: ${deleteError.message}`);
  }
  console.log(`- ${t.title}: done`);
}

const after = planThreadCopy(await rows('threads', 'id, title'), await rows('messages', '*'), copy);
const pending = after.threads.filter((t) => t.changed).map((t) => t.title);
console.log(pending.length ? `Still different: ${pending.join(', ')}` : 'Check passed: every thread now has its one new message.');
