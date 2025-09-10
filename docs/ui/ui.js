// This file handles the user interface logic. It includes functions to create and manage controls and widgets for interacting with the 3D renderer and dungeon generator.

export function initUI(rootId = 'control-panel') {
  const controlPanel = document.getElementById(rootId);
  if (!controlPanel) throw new Error(`Control panel #${rootId} not found`);
  controlPanel.innerHTML = '';
  const log = [];
  function logAction(msg){ log.push(msg); }
  const generateDungeonButton = document.createElement('button');
  generateDungeonButton.innerText = 'Generate Dungeon';
  generateDungeonButton.addEventListener('click', () => {
    logAction('generate');
    if (window.generateDungeon) window.generateDungeon();
  });
  controlPanel.appendChild(generateDungeonButton);

  // Create a slider for camera zoom
  const zoomSlider = document.createElement('input');
  zoomSlider.type = 'range';
  zoomSlider.min = 1;
  zoomSlider.max = 100;
  zoomSlider.value = 50;
  zoomSlider.addEventListener('input', () => {
      // Call the zoom function (to be implemented in renderer.js)
      console.log(`Zoom level set to: ${zoomSlider.value}`);
  });
  controlPanel.appendChild(zoomSlider);

  // Camera zoom numeric input
  const zoomInput = document.createElement('input');
  zoomInput.type = 'number';
  zoomInput.min = 5; zoomInput.max = 300; zoomInput.value = 50;
  zoomInput.addEventListener('change', () => {
    if (window.dungeonRenderer) window.dungeonRenderer.setZoomDistance(Number(zoomInput.value));
  });
  controlPanel.appendChild(zoomInput);

  // Pan buttons
  const panContainer = document.createElement('div');
  const directions = [ ['↑',0,-40], ['←',40,0], ['→',-40,0], ['↓',0,40] ];
  directions.forEach(([label, dx, dy]) => {
    const b = document.createElement('button'); b.textContent = label; b.style.margin='2px';
    b.addEventListener('click', () => { if (window.dungeonRenderer) window.dungeonRenderer.pan(dx, dy); });
    panContainer.appendChild(b);
  });
  controlPanel.appendChild(panContainer);

  // Create a button to reset the view
  const resetViewButton = document.createElement('button');
  resetViewButton.innerText = 'Reset View';
  resetViewButton.addEventListener('click', () => {
      // Call the reset view function (to be implemented in renderer.js)
      console.log('View reset triggered');
  });
  controlPanel.appendChild(resetViewButton);
  resetViewButton.addEventListener('click', () => { if (window.dungeonRenderer) window.dungeonRenderer.resetView(); });

  return { log };
}

if (typeof window !== 'undefined' && !(typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID)) {
  document.addEventListener('DOMContentLoaded', () => {
    try { initUI(); } catch(e){ console.error(e); }
  });
}