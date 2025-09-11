// This file handles the user interface logic. It includes functions to create and manage controls and widgets for interacting with the 3D renderer and dungeon generator.

export function initUI(rootId = 'control-panel') {
  const controlPanel = document.getElementById(rootId);
  if (!controlPanel) throw new Error(`Control panel #${rootId} not found`);
  controlPanel.innerHTML = '';
  const log = [];
  function logAction(msg){ log.push(msg); }
  // Classic generator button
  const generateDungeonButton = document.createElement('button');
  generateDungeonButton.innerText = 'Generate Dungeon';
  generateDungeonButton.addEventListener('click', () => {
    logAction('generate');
    if (window.generateDungeon) window.generateDungeon();
  });
  controlPanel.appendChild(generateDungeonButton);

  // WFC size controls
  const sizeWrap = document.createElement('div');
  sizeWrap.style.marginTop='8px';
  sizeWrap.innerHTML = '<label>Size X <input id="wfc-size-x" type="number" value="3" min="1" style="width:60px"/></label> ' +
    '<label>Y <input id="wfc-size-y" type="number" value="3" min="1" style="width:60px"/></label> ' +
    '<label>Z <input id="wfc-size-z" type="number" value="3" min="1" style="width:60px"/></label>';
  controlPanel.appendChild(sizeWrap);

  const generateWFCButton = document.createElement('button');
  generateWFCButton.innerText = 'Generate WFC Dungeon';
  generateWFCButton.style.marginTop='6px';
  generateWFCButton.addEventListener('click', () => {
    const sx = parseInt(document.getElementById('wfc-size-x').value,10);
    const sy = parseInt(document.getElementById('wfc-size-y').value,10);
    const sz = parseInt(document.getElementById('wfc-size-z').value,10);
    logAction(`generate-wfc-${sx}x${sy}x${sz}`);
    if (window.generateWFCDungeon) window.generateWFCDungeon({x:sx,y:sy,z:sz});
  });
  controlPanel.appendChild(generateWFCButton);

  return { log };
}

if (typeof window !== 'undefined' && !(typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID)) {
  document.addEventListener('DOMContentLoaded', () => {
    try { initUI(); } catch(e){ console.error(e); }
  });
}