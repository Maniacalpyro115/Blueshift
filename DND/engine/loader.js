(() => {
  "use strict";

  window.SoulBattle = window.SoulBattle || {};

  const definitions = new Map();

  function register(id, definition) {
    const normalizedId = typeof id === "string" ? id.trim().toLowerCase() : "";
    if (!normalizedId || !definition || typeof definition !== "object") {
      throw new TypeError("Encounter registration requires an id and definition.");
    }
    if (definitions.has(normalizedId)) {
      throw new Error(`Encounter already registered: ${normalizedId}`);
    }
    definitions.set(normalizedId, definition);
    return definition;
  }

  function get(id) {
    return definitions.get(typeof id === "string" ? id.toLowerCase() : "") || null;
  }

  function list() {
    return Array.from(definitions, ([id, definition]) => ({
      id,
      name: typeof definition.name === "string" ? definition.name : id.toUpperCase(),
      isNew: definition.isNew === true,
      definition
    }));
  }

  window.SoulBattle.encounters = { register, get, list };
})();
