// Prevent the Console Ninja VS Code extension from hooking into local jest runs.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Module = require('module');

const originalLoad = Module._load;
const stub = {
  __esModule: true,
  default: () => ({
    stop() {},
  }),
};

Module._load = function patchedLoad(request, parent, isMain) {
  if (typeof request === 'string' && request.includes('wallabyjs.console-ninja')) {
    return stub;
  }
  void parent;
  void isMain;
  return originalLoad.apply(this, arguments);
};
