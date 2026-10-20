/**
 * Loads every admin-only component in one go. The page switches to admin mode only after
 * this resolves, so no admin part renders empty while its code is still on the way.
 * Visitors never call it, so they never download these files.
 */
export async function loadAdminUi() {
  const [listActions, newThread, composer, details, message] = await Promise.all([
    import('./AdminListActions'),
    import('./NewThreadPane'),
    import('./AdminComposer'),
    import('./DetailsSheet'),
    import('./AdminMessage'),
  ]);
  return {
    AdminListActions: listActions.default,
    NewThreadPane: newThread.default,
    AdminComposer: composer.default,
    DetailsSheet: details.default,
    AdminMessage: message.default,
  };
}

export type AdminUi = Awaited<ReturnType<typeof loadAdminUi>>;
