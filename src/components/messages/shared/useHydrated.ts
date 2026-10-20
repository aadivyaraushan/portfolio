import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/** False during the server render and hydration, true after. Lets time labels switch to local time without a hydration mismatch. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
