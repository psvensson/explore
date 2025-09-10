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

  // Create a button to reset the view
  const resetViewButton = document.createElement('button');
  resetViewButton.innerText = 'Reset View';
  resetViewButton.addEventListener('click', () => {
      // Call the reset view function (to be implemented in renderer.js)
      console.log('View reset triggered');
  });
  controlPanel.appendChild(resetViewButton);

  return { log };
}

if (typeof window !== 'undefined' && !(typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID)) {
  document.addEventListener('DOMContentLoaded', () => {
    try { initUI(); } catch(e){ console.error(e); }
  });
}