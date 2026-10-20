import { preconnect } from 'react-dom';
import MessagesApp from '@/components/messages/MessagesApp';
import { loadThreads } from '@/lib/threads/server/loadThreads';

// The page is built on the server with the messages already in the HTML, then cached.
// It rebuilds at most once a minute, and at once after an admin edit (see revalidateHome).
// If Supabase fails during a rebuild, Next.js keeps serving the last good page.
export const revalidate = 60;

export default async function Home() {
  preconnect('https://em-content.zobj.net'); // Apple emoji images for thread icons
  const threads = await loadThreads();
  return <MessagesApp threads={threads} />;
}
