// Barramento de eventos simples: os sistemas conversam entre si sem depender uns dos outros.
// Isso facilita plugar coisas novas no futuro (ex.: sincronizar com servidor, conquistas, amigos).
const listeners = new Map();

export const Events = {
  on(name, fn) {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(fn);
    return () => listeners.get(name).delete(fn);
  },
  emit(name, payload) {
    const set = listeners.get(name);
    if (set) for (const fn of set) fn(payload);
  },
};
