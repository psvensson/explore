// debug_log.js
// Lightweight gated logger. Enable by setting either:
//   window.__DUNGEON_DEBUG__ = true (in browser)
//   or process.env.DUNGEON_DEBUG (in tests / Node)
// Keeps noisy console output out of normal test runs while preserving
// the ability to inspect internal pipeline behavior when needed.

export function dbg(namespace, ...args) {
  try {
    const enabled = (typeof window !== 'undefined' && window.__DUNGEON_DEBUG__) ||
      (typeof process !== 'undefined' && process.env && process.env.DUNGEON_DEBUG);
    if (!enabled) return;
    const ts = new Date().toISOString().split('T')[1].replace(/Z$/, '');
    // eslint-disable-next-line no-console
    console.log(`[${ts}] ${namespace}`, ...args);
  } catch (_) {
    // Swallow any logging-time failures safely.
  }
}

export default dbg;