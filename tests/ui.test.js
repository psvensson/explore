import { initUI } from '../docs/ui/ui.js';

describe('ui', () => {
  test('throws if panel missing', () => {
    document.body.innerHTML='';
    expect(() => initUI()).toThrow(/Control panel/);
  });
  
  test('initializes and logs actions', () => {
    document.body.innerHTML='<div id="control-panel"></div>';
    const { log } = initUI();
    
    // The generate button is now inside the generation tab which should be active by default
    const generateBtn = document.querySelector('button[innerText="Generate"]') || 
                       Array.from(document.querySelectorAll('button')).find(b => b.innerText === 'Generate');
    
    expect(generateBtn).toBeTruthy();
    generateBtn.click();
    expect(log.some(entry => entry.startsWith('generate-wfc-'))).toBe(true);
  });

  test('tileset editor tab switches correctly and shows real editor content', async () => {
    // Set up DOM with new main tab structure
    document.body.innerHTML = `
      <div class="main-tab-nav">
        <button class="main-tab-button active" data-main-tab="3d">3D Generation</button>
        <button class="main-tab-button" data-main-tab="editor">Tileset Editor</button>
      </div>
      <div class="main-tab-content">
        <div id="main-3d-pane" class="main-tab-pane active">
          <div id="control-panel"></div>
        </div>
        <div id="main-editor-pane" class="main-tab-pane">
          <div id="tileset-editor-container"></div>
        </div>
      </div>
    `;
    
    // Initialize UI with real code - NO MOCKING
    const { log } = initUI();
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Find main tab buttons
    const tabButtons = document.querySelectorAll('.main-tab-button');
    const viewTab = Array.from(tabButtons).find(btn => 
      btn.getAttribute('data-main-tab') === '3d');
    const editorTab = Array.from(tabButtons).find(btn => 
      btn.getAttribute('data-main-tab') === 'editor');
    
    // Verify tab buttons exist
    expect(tabButtons.length).toBe(2);
    expect(viewTab).toBeTruthy();
    expect(editorTab).toBeTruthy();
    expect(editorTab.textContent.trim()).toBe('Tileset Editor');
    
    // Verify initial state - 3D view tab should be active
    const viewPane = document.getElementById('main-3d-pane');
    const editorPane = document.getElementById('main-editor-pane');
    
    expect(viewPane).toBeTruthy();
    expect(editorPane).toBeTruthy();
    expect(viewTab.classList.contains('active')).toBe(true);
    expect(viewPane.classList.contains('active')).toBe(true);
    expect(editorTab.classList.contains('active')).toBe(false);
    expect(editorPane.classList.contains('active')).toBe(false);
    
    // Capture the initial content of the editor pane
    const initialEditorContent = editorPane.innerHTML;
    expect(initialEditorContent.trim()).toBe('<div id="tileset-editor-container"></div>'); // Should contain just the container initially
    
    // Click the tileset editor tab - this should trigger real module loading
    editorTab.click();
    
    // Wait for tab switching
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify tab states switched
    expect(viewTab.classList.contains('active')).toBe(false);
    expect(editorTab.classList.contains('active')).toBe(true);
    expect(viewPane.classList.contains('active')).toBe(false);
    expect(editorPane.classList.contains('active')).toBe(true);
    
    // Wait longer for the real tileset editor to load and initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if the real tileset editor was initialized
    expect(window.mainTilesetEditor).toBeTruthy();
    
    // Verify the editor pane now has content (the real tileset editor should have added content)
    const finalEditorContent = editorPane.innerHTML;
    expect(finalEditorContent.trim()).not.toBe(''); // Should have content now
    expect(finalEditorContent).not.toBe(initialEditorContent); // Content should have changed
    
    // Check for specific tileset editor content
    expect(finalEditorContent).toContain('tileset'); // Should contain tileset-related content
    
    // Verify the editor is visible (not hidden by CSS)
    const editorStyle = window.getComputedStyle(editorPane);
    expect(editorStyle.display).not.toBe('none');
    expect(editorStyle.visibility).not.toBe('hidden');
    
    // Check if there are any error messages in the content
    expect(finalEditorContent.toLowerCase()).not.toContain('error loading');
    expect(finalEditorContent.toLowerCase()).not.toContain('failed to load');
    
    console.log('Editor pane content after loading:', finalEditorContent.substring(0, 200) + '...');
  });

  test('tileset editor loads and displays content when tab is clicked', async () => {
    // Fresh DOM for this test with new main tab structure
    document.body.innerHTML = `
      <div class="main-tab-nav">
        <button class="main-tab-button active" data-main-tab="3d">3D Generation</button>
        <button class="main-tab-button" data-main-tab="editor">Tileset Editor</button>
      </div>
      <div class="main-tab-content">
        <div id="main-3d-pane" class="main-tab-pane active">
          <div id="control-panel"></div>
        </div>
        <div id="main-editor-pane" class="main-tab-pane">
          <div id="tileset-editor-container"></div>
        </div>
      </div>
    `;
    
    // Clear any existing tileset editor
    delete window.mainTilesetEditor;
    
    // Initialize UI (this should use the real code with no mocking)
    initUI();
    
    // Wait for tab button setup
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Find the editor tab and pane
    const editorTab = Array.from(document.querySelectorAll('.main-tab-button'))
      .find(btn => btn.getAttribute('data-main-tab') === 'editor');
    const editorPane = document.getElementById('main-editor-pane');
    
    expect(editorTab).toBeTruthy();
    expect(editorPane).toBeTruthy();
    
    // Verify initial state
    expect(editorPane.innerHTML.trim()).toBe('<div id="tileset-editor-container"></div>');
    expect(window.mainTilesetEditor).toBeUndefined();
    
    // Click the editor tab
    editorTab.click();
    
    // Wait for the real tileset editor to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify the tileset editor loaded successfully
    expect(window.mainTilesetEditor).toBeTruthy();
    expect(typeof window.mainTilesetEditor).toBe('object');
    
    // Verify content was added to the editor pane
    const finalContent = editorPane.innerHTML;
    expect(finalContent.length).toBeGreaterThan(1000); // Should have substantial content
    expect(finalContent).toContain('tileset-editor'); // Should contain main editor class
    
    // Verify the tab is active and visible
    expect(editorTab.classList.contains('active')).toBe(true);
    expect(editorPane.classList.contains('active')).toBe(true);
    
    // Verify editor pane is visible (not hidden by CSS)
    const editorStyle = window.getComputedStyle(editorPane);
    expect(editorStyle.display).not.toBe('none');
    
    // Should contain hierarchical editor elements
    const hasOverview = finalContent.includes('overview') || finalContent.includes('Overview');
    const hasSteps = finalContent.includes('step') || finalContent.includes('Step');
    expect(hasOverview || hasSteps).toBe(true);
  });
});
