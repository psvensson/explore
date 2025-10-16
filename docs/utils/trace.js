// trace.js
// Scoped, gated tracing utilities to keep logs concise and relevant.
// Enable via:
//   - window.__EDITOR_TRACE__ = true (browser), or
//   - localStorage.setItem('editor_trace','1') (browser), or
//   - process.env.EDITOR_TRACE (tests/Node)
//
// Usage:
//   import { trace } from '../utils/trace.js';
//   const id = trace.newId(); // optional correlation id
//   trace.log('ui:click', { id, pos: 'x,y,z', structureId, rot });
//   trace.logOnce('state:init', { version });
//   trace.logOnChange('ui:hover', `${x},${y},${z}`, { pos: [x,y,z], allowed });
//
// All logs are single-line JSON-ish to stay readable.

function _isEnabled() {
  try {
    if (typeof window !== 'undefined') {
      if (window.__EDITOR_TRACE__) return true;
      try {
        if (window.localStorage && window.localStorage.getItem('editor_trace') === '1') return true;
      } catch (_) {}
    }
    if (typeof process !== 'undefined' && process.env && process.env.EDITOR_TRACE) return true;
  } catch (_) {}
  return false;
}

const _onceKeys = new Set();
const _lastByKey = new Map();

function _ts() {
  try {
    return new Date().toISOString().split('T')[1].replace(/Z$/, '');
  } catch (_) {
    return '';
  }
}

function _print(category, payload) {
  // eslint-disable-next-line no-console
  console.log(`[${_ts()}] [${category}]`, payload);
}

export const trace = {
  enabled() {
    return _isEnabled();
  },
  newId() {
    try {
      const n = (Date.now() % 1e8).toString(36);
      const r = Math.random().toString(36).slice(2, 6);
      return `${n}${r}`;
    } catch (_) {
      return `${Date.now()}`;
    }
  },
  log(category, payload) {
    if (!_isEnabled()) return;
    try {
      _print(category, payload);
    } catch (_) {}
  },
  logOnce(category, key, payload) {
    if (!_isEnabled()) return;
    const k = `${category}::${key}`;
    if (_onceKeys.has(k)) return;
    _onceKeys.add(k);
    try {
      _print(category, payload);
    } catch (_) {}
  },
  logOnChange(category, key, payload) {
    if (!_isEnabled()) return;
    const k = `${category}::${key}`;
    const prev = _lastByKey.get(k);
    const cur = JSON.stringify(payload);
    if (prev === cur) return;
    _lastByKey.set(k, cur);
    try {
      _print(category, payload);
    } catch (_) {}
  }
};

export default trace;
