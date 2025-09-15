// This file handles the user interface logic. It includes functions to create and manage controls and widgets for interacting with the 3D renderer and dungeon generator.

export function initUI(rootId = 'control-panel') {
  const controlPanel = document.getElementById(rootId);
  if (!controlPanel) throw new Error(`Control panel #${rootId} not found`);
  controlPanel.innerHTML = '';
  const log = [];
  function logAction(msg){ log.push(msg); }
  // Title label
  const title = document.createElement('div');
  title.textContent = 'Dungeon Generation';
  title.style.fontWeight='600';
  title.style.marginBottom='4px';
  controlPanel.appendChild(title);

  // WFC size controls
  const sizeWrap = document.createElement('div');
  sizeWrap.style.marginTop='8px';
  // Renamed axes to semantic Width / Height / Length per user request
  sizeWrap.innerHTML = '<label>Width <input id="wfc-size-x" type="number" value="3" min="1" style="width:60px"/></label> ' +
    '<label>Height <input id="wfc-size-y" type="number" value="3" min="1" style="width:60px"/></label> ' +
    '<label>Length <input id="wfc-size-z" type="number" value="3" min="1" style="width:60px"/></label>';
  controlPanel.appendChild(sizeWrap);

  const generateWFCButton = document.createElement('button');
  generateWFCButton.innerText = 'Generate';
  generateWFCButton.style.marginTop='6px';
  generateWFCButton.addEventListener('click', () => {
    const sx = parseInt(document.getElementById('wfc-size-x').value,10);
    const sy = parseInt(document.getElementById('wfc-size-y').value,10);
    const sz = parseInt(document.getElementById('wfc-size-z').value,10);
    logAction(`generate-wfc-${sx}x${sy}x${sz}`);
    if (window.generateWFCDungeon) window.generateWFCDungeon({x:sx,y:sy,z:sz});
  });
  controlPanel.appendChild(generateWFCButton);

  // Stair demo generation (minimal stair pair) button present in index.html
  const stairDemoBtn = document.getElementById('generate-stair-demo');
  if (stairDemoBtn){
    stairDemoBtn.addEventListener('click', ()=>{
      if (window.generateStairDemo) window.generateStairDemo();
    });
  }

  // Debug toggles wrapper
  const debugWrap = document.createElement('div');
  debugWrap.style.marginTop='10px';
  debugWrap.style.fontSize='12px';
  debugWrap.style.display='flex';
  debugWrap.style.flexDirection='column';
  debugWrap.style.gap='4px';

  const tileIdToggle = document.createElement('label');
  tileIdToggle.style.cursor='pointer';
  tileIdToggle.innerHTML = '<input id="toggle-tileids" type="checkbox" style="vertical-align:middle;margin-right:6px"/> Show Tile IDs';
  debugWrap.appendChild(tileIdToggle);
  controlPanel.appendChild(debugWrap);

  // Persist state across regenerations (session only)
  if (window.__SHOW_TILE_IDS) document.getElementById('toggle-tileids').checked = true;
  tileIdToggle.addEventListener('change', (e)=>{
    const checked = document.getElementById('toggle-tileids').checked;
    window.__SHOW_TILE_IDS = checked;
    if (window.dungeonRenderer && window.dungeonRenderer.rebuildTileIdOverlays){
      window.dungeonRenderer.rebuildTileIdOverlays();
    }
  });

  // Build/version label (auto-updated by pre-commit hook)
  const versionEl = document.createElement('div');
  versionEl.style.marginTop = '10px';
  versionEl.style.fontSize = '14px';
  versionEl.style.fontWeight = '600';
  versionEl.style.background = '#0f2740';
  versionEl.style.color = '#cfe6ff';
  versionEl.style.padding = '6px 10px';
  versionEl.style.borderRadius = '6px';
  versionEl.style.display = 'inline-block';
  versionEl.style.letterSpacing = '0.3px';
  versionEl.textContent = 'Version: loading…';
  controlPanel.appendChild(versionEl);
  try {
    fetch('version.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(v => { if (v && (v.build!=null || v.version)) versionEl.textContent = `Version: ${v.version||v.build}`; else versionEl.textContent='Version: n/a'; })
      .catch(()=>{ versionEl.textContent='Version: n/a'; });
  } catch(_) {}

  return { log };
}

if (typeof window !== 'undefined' && !(typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID)) {
  document.addEventListener('DOMContentLoaded', () => {
    try { initUI(); } catch(e){ console.error(e); }
  });
}