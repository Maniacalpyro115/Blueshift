(() => {
  "use strict";

  window.SoulBattle = window.SoulBattle || {};

  function createRendererRegistry() {
    const renderers = new Map();
    return {
      register(type, renderer) {
        if (typeof type !== "string" || typeof renderer !== "function") return false;
        renderers.set(type, renderer);
        return true;
      },
      draw(type, payload) {
        const renderer = renderers.get(type);
        return renderer ? renderer(payload) !== false : false;
      },
      has(type) { return renderers.has(type); }
    };
  }

  window.SoulBattle.renderers = { createRendererRegistry };
})();
