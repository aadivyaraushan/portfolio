// Prevent the Console Ninja VS Code extension from hooking into local jest runs.
const Module = require('module');
const path = require('path');

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
  return originalLoad.apply(this, arguments);
};
