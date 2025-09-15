import { initUI } from '../docs/ui/ui.js';

describe('ui', () => {
  test('throws if panel missing', () => {
    document.body.innerHTML='';
    expect(() => initUI()).toThrow(/Control panel/);
  });
  test('initializes and logs actions', () => {
    document.body.innerHTML='<div id="control-panel"></div>';
    const { log } = initUI();
    const btn = document.querySelector('button');
    btn.click();
  expect(log.some(entry => entry.startsWith('generate-wfc-'))).toBe(true);
  });
});
