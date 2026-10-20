import 'server-only';
import { revalidatePath } from 'next/cache';

/** Call after any admin write, so the cached public page shows the change on the next visit. */
export function revalidateHome() {
  revalidatePath('/');
  console.info('[threads] home page revalidated');
}
