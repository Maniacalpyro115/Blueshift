(() => {
  "use strict";

  window.SoulBattle = window.SoulBattle || {};

  function createExtensionHost(definition, api) {
    const extension = definition?.runtime;
    if (!extension) return createEmptyExtension();
    const instance = typeof extension === "function" ? extension(api) : extension;
    return { ...createEmptyExtension(), ...(instance || {}) };
  }

  function createEmptyExtension() {
    return {
      createState: () => ({}),
      hooks: {},
      renderers: {},
      defenseModes: {},
      renderLayers: {}
    };
  }

  function callHook(extension, name, payload) {
    return extension?.hooks?.[name]?.(payload);
  }

  window.SoulBattle.extensions = { createExtensionHost, callHook };
})();
