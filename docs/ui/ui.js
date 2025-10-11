// This file handles the user interface logic. It includes functions to create and manage controls and widgets for interacting with the 3D renderer and dungeon generator.

// Disable old UI system when widgets are active
if (typeof window !== 'undefined' && !window.__DISABLE_OLD_UI__) {
    console.log('[UI] Old UI system active');
    
    // Keep existing initialization for backward compatibility
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initUI('control-panel'));
    } else if (document.getElementById('control-panel')) {
        initUI('control-panel');
    }
} else {
    console.log('[UI] Old UI system disabled - using widget architecture');
}

export function initUI(rootId = 'control-panel') {
  const controlPanel = document.getElementById(rootId);
  if (!controlPanel) throw new Error(`Control panel #${rootId} not found`);
  controlPanel.innerHTML = '';
  const log = [];
  function logAction(msg){ log.push(msg); }

  // Initialize main tab system
  initMainTabSystem();

  // Create generation controls directly in control panel (no sub-tabs needed)
  const generationContainer = document.createElement('div');
  generationContainer.className = 'generation-controls';
  controlPanel.appendChild(generationContainer);
  
  // Title label
  const title = document.createElement('div');
  title.textContent = 'Dungeon Generation';
  title.style.fontWeight='600';
  title.style.marginBottom='4px';
  generationContainer.appendChild(title);

  // WFC size controls
  const sizeWrap = document.createElement('div');
  sizeWrap.style.marginTop='8px';
  // Renamed axes to semantic Width / Height / Length per user request
  sizeWrap.innerHTML = '<label>Width <input id="wfc-size-x" type="number" value="6" min="1" style="width:60px"/></label> ' +
    '<label>Height <input id="wfc-size-y" type="number" value="3" min="1" style="width:60px"/></label> ' +
    '<label>Length <input id="wfc-size-z" type="number" value="6" min="1" style="width:60px"/></label>';
  generationContainer.appendChild(sizeWrap);

  // Advanced WFC options
  const advWrap = document.createElement('div');
  advWrap.style.marginTop='6px';
  advWrap.style.fontSize='12px';
  advWrap.style.display='grid';
  advWrap.style.gridTemplateColumns='repeat(2, auto)';
  advWrap.style.gap='6px 10px';
  advWrap.innerHTML = [
    '<label>yieldEvery <input id="wfc-yield-every" type="number" value="500" min="1" style="width:70px"/></label>',
    '<label>maxSteps <input id="wfc-max-steps" type="number" value="30000" min="100" style="width:70px"/></label>',
    '<label>stallTimeoutMs <input id="wfc-stall-timeout" type="number" value="60000" min="100" style="width:70px"/></label>',
    '<label>maxYields <input id="wfc-max-yields" type="number" value="50" min="1" style="width:70px"/></label>',
    '<label><input id="wfc-center-seed" type="checkbox" checked/> Center Seed</label>',
    '<span style="font-size:10px;color:#666">Grow from center</span>'
  ].join(' ');
  generationContainer.appendChild(advWrap);

  const btnWrap = document.createElement('div');
  btnWrap.style.marginTop='6px';
  btnWrap.style.display='flex';
  btnWrap.style.gap='6px';
  const generateWFCButton = document.createElement('button');
  generateWFCButton.innerText = 'Generate';
  generateWFCButton.addEventListener('click', () => {
    const sx = parseInt(document.getElementById('wfc-size-x').value,10);
    const sy = parseInt(document.getElementById('wfc-size-y').value,10);
    const sz = parseInt(document.getElementById('wfc-size-z').value,10);
    const yieldEvery = parseInt(document.getElementById('wfc-yield-every').value,10);
    const maxSteps = parseInt(document.getElementById('wfc-max-steps').value,10);
    const stallTimeoutMs = parseInt(document.getElementById('wfc-stall-timeout').value,10);
    const maxYields = parseInt(document.getElementById('wfc-max-yields').value,10);
    const centerSeed = document.getElementById('wfc-center-seed').checked;
    logAction(`generate-wfc-${sx}x${sy}x${sz}${centerSeed ? '-centered' : ''}`);
    if (window.generateWFCDungeon) window.generateWFCDungeon({x:sx,y:sy,z:sz, yieldEvery, maxSteps, stallTimeoutMs, maxYields, centerSeed});
  });
  const cancelButton = document.createElement('button');
  cancelButton.innerText = 'Cancel';
  cancelButton.addEventListener('click', () => { if (window.cancelWFCDungeon) window.cancelWFCDungeon(); });
  btnWrap.appendChild(generateWFCButton);
  btnWrap.appendChild(cancelButton);
  generationContainer.appendChild(btnWrap);

  // Add tileset selector for generation
  const tilesetWrap = document.createElement('div');
  tilesetWrap.style.marginTop='8px';
  tilesetWrap.innerHTML = `
    <label for="tileset-selector" style="display: block; margin-bottom: 4px; font-weight: 500;">Tileset Configuration:</label>
    <div style="display: flex; gap: 6px; align-items: center;">
      <select id="tileset-selector" style="flex: 1; padding: 4px;">
        <option value="default">Default Tileset</option>
      </select>
      <button id="refresh-tilesets" style="padding: 4px 8px; font-size: 12px;">Refresh</button>
    </div>
  `;
  generationContainer.appendChild(tilesetWrap);

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
  debugWrap.style.padding='8px';
  debugWrap.style.backgroundColor='#f8f9fa';
  debugWrap.style.borderRadius='4px';
  debugWrap.style.border='1px solid #e9ecef';

  const debugTitle = document.createElement('div');
  debugTitle.textContent = 'Debug Options';
  debugTitle.style.fontWeight = '500';
  debugTitle.style.marginBottom = '6px';
  debugTitle.style.fontSize = '14px';
  debugWrap.appendChild(debugTitle);

  const debugGrid = document.createElement('div');
  debugGrid.style.display='grid';
  debugGrid.style.gridTemplateColumns='1fr 1fr';
  debugGrid.style.gap='4px';
  debugGrid.style.fontSize='12px';

  const tileIdToggle = document.createElement('label');
  tileIdToggle.style.cursor='pointer';
  tileIdToggle.innerHTML = '<input id="toggle-tileids" type="checkbox" style="vertical-align:middle;margin-right:6px"/> Show Tile IDs';
  debugGrid.appendChild(tileIdToggle);

  // WFC Debug logging toggle
  const debugLoggingToggle = document.createElement('label');
  debugLoggingToggle.style.cursor='pointer';
  debugLoggingToggle.innerHTML = '<input id="toggle-wfc-debug" type="checkbox" style="vertical-align:middle;margin-right:6px"/> WFC Debug';
  debugGrid.appendChild(debugLoggingToggle);
  
  // Render Debug logging toggle
  const renderDebugToggle = document.createElement('label');
  renderDebugToggle.style.cursor='pointer';
  renderDebugToggle.innerHTML = '<input id="toggle-render-debug" type="checkbox" style="vertical-align:middle;margin-right:6px"/> Render Debug';
  debugGrid.appendChild(renderDebugToggle);

  debugWrap.appendChild(debugGrid);
  generationContainer.appendChild(debugWrap);

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
  generationContainer.appendChild(versionEl);



  // Refresh tilesets button handler
  document.addEventListener('click', (e) => {
    if (e.target.id === 'refresh-tilesets') {
      console.log('Refresh tilesets clicked - functionality moved to main tileset editor');
    }
  });

  // Persist state across regenerations (session only)
  if (window.__SHOW_TILE_IDS) document.getElementById('toggle-tileids').checked = true;
  tileIdToggle.addEventListener('change', (e)=>{
    const checked = document.getElementById('toggle-tileids').checked;
    window.__SHOW_TILE_IDS = checked;
    if (window.dungeonRenderer && window.dungeonRenderer.rebuildTileIdOverlays){
      window.dungeonRenderer.rebuildTileIdOverlays();
    }
  });

  // Initialize WFC debug checkbox from global flag, URL, or session storage
  try {
    const urlFlag = (typeof URLSearchParams!=='undefined') && (new URLSearchParams(window.location.search).get('wfcDebug')==='1');
    const stored = (typeof sessionStorage!=='undefined') && sessionStorage.getItem('WFC_DEBUG')==='1';
    const initial = !!(window.__WFC_DEBUG__ || urlFlag || stored);
    const dbgCb = document.getElementById('toggle-wfc-debug');
    if (dbgCb) dbgCb.checked = initial;
    window.__WFC_DEBUG__ = initial;
  } catch(_) {}
  debugLoggingToggle.addEventListener('change', ()=>{
    const enabled = document.getElementById('toggle-wfc-debug').checked;
    window.__WFC_DEBUG__ = enabled;
    try { if (typeof sessionStorage!=='undefined') sessionStorage.setItem('WFC_DEBUG', enabled?'1':'0'); } catch(_) {}
  });

  // Initialize Render debug toggle
  try {
    const storedR = (typeof sessionStorage!=='undefined') && sessionStorage.getItem('RENDER_DEBUG')==='1';
    const initialR = !!(window.__RENDER_DEBUG__ || storedR);
    const rcb = document.getElementById('toggle-render-debug');
    if (rcb) rcb.checked = initialR;
    window.__RENDER_DEBUG__ = initialR;
  } catch(_) {}
  renderDebugToggle.addEventListener('change', ()=>{
    const enabled = document.getElementById('toggle-render-debug').checked;
    window.__RENDER_DEBUG__ = enabled;
    try { if (typeof sessionStorage!=='undefined') sessionStorage.setItem('RENDER_DEBUG', enabled?'1':'0'); } catch(_) {}
  });

  // Initialize tab button functionality after DOM is ready
  setTimeout(() => {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');
        
        // Update button states
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Update pane visibility
        tabPanes.forEach(pane => pane.classList.remove('active'));
        const targetPane = document.getElementById(`${targetTab}-tab`);
        if (targetPane) {
          targetPane.classList.add('active');
        }
        
        // Initialize main tab system and tileset editor
        if (!window.mainTabInitialized) {
          initMainTabSystem();
          initMainTilesetEditor();
          window.mainTabInitialized = true;
        }
      });
    });
  }, 100);

  // Version loading for the version element in generation tab
  try {
    fetch('version.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(v => { if (v && (v.build!=null || v.version)) versionEl.textContent = `Version: ${v.version||v.build}`; else versionEl.textContent='Version: n/a'; })
      .catch(()=>{ versionEl.textContent='Version: n/a'; });
  } catch(_) {}

  return { log };
}

// Main tab system for switching between 3D view and tileset editor
function initMainTabSystem() {
  const mainTabButtons = document.querySelectorAll('.main-tab-button');
  const mainTabPanes = document.querySelectorAll('.main-tab-pane');
  
  mainTabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-main-tab');
      
      // Update button states
      mainTabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Update pane visibility
      mainTabPanes.forEach(pane => pane.classList.remove('active'));
      const targetPane = document.getElementById(`main-${targetTab}-pane`);
      if (targetPane) {
        targetPane.classList.add('active');
      }
      
      // Initialize tileset editor when first opened
      if (targetTab === 'editor' && !window.mainTilesetEditor) {
        initMainTilesetEditor();
      }
    });
  });
}

// Initialize the main tileset editor in the full-page view
function initMainTilesetEditor() {
  const editorContainer = document.getElementById('tileset-editor-container');
  if (!editorContainer) {
    console.error('Tileset editor container not found');
    return;
  }
  
  try {
    import('./tileset_editor.js').then(module => {
      const { TilesetEditor } = module;
      window.mainTilesetEditor = new TilesetEditor(editorContainer);
    }).catch(error => {
      console.error('Failed to load main tileset editor:', error);
      editorContainer.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #e74c3c; max-width: 600px; margin: 0 auto;">
          <h2>Error Loading Tileset Editor</h2>
          <p>Failed to load the tileset editor module. Please check the console for details.</p>
          <pre style="color: #666; font-size: 12px; margin-top: 20px; text-align: left; background: #1a1a1a; padding: 15px; border-radius: 5px;">${error.message}</pre>
        </div>
      `;
    });
  } catch (error) {
    console.error('Failed to initialize main tileset editor:', error);
  }
}

// OLD UI INITIALIZATION DISABLED - NOW USING WIDGET SYSTEM
// if (typeof window !== 'undefined' && !(typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID)) {
//   document.addEventListener('DOMContentLoaded', () => {
//     try { initUI(); } catch(e){ console.error(e); }
//   });
// }