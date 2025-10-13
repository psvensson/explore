/* Jest setup for jsdom environment polyfills and test utilities (ESM) */

// Polyfill document.elementFromPoint (missing in jsdom)
if (typeof document !== 'undefined' && typeof document.elementFromPoint !== 'function') {
  document.elementFromPoint = () => null;
}

// Polyfill requestAnimationFrame/cancelAnimationFrame
if (typeof window !== 'undefined') {
  if (typeof window.requestAnimationFrame !== 'function') {
    window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
  }
  if (typeof window.cancelAnimationFrame !== 'function') {
    window.cancelAnimationFrame = (id) => clearTimeout(id);
  }
}

// Polyfill matchMedia for components that query it
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = () => ({
    matches: false,
    media: '',
    onchange: null,
    addListener() {}, // deprecated
    removeListener() {}, // deprecated
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false; }
  });
}

// Polyfill CanvasRenderingContext2D for simple draw calls (avoid errors)
if (typeof window !== 'undefined' && window.HTMLCanvasElement && !window.HTMLCanvasElement.prototype.getContext) {
  window.HTMLCanvasElement.prototype.getContext = function getContext() {
    const ctx = {
      canvas: this,
      // no-op stubs
      fillRect() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {},
      fillText() {}, measureText() { return { width: 0 }; }, setLineDash() {}, save() {}, restore() {},
      translate() {}, scale() {}, rotate() {}, arc() {}, strokeRect() {}, drawImage() {},
      getImageData() { return { data: [] }; }, putImageData() {},
      createLinearGradient() { return { addColorStop() {} }; },
      createPattern() { return {}; },
      createImageData() { return {}; }
    };
    return ctx;
  };
}

// Polyfill URL.createObjectURL/revokeObjectURL used by file download flows
if (typeof URL !== 'undefined') {
  if (typeof URL.createObjectURL !== 'function') {
    URL.createObjectURL = () => 'blob:jest-mock';
  }
  if (typeof URL.revokeObjectURL !== 'function') {
    URL.revokeObjectURL = () => {};
  }
}
