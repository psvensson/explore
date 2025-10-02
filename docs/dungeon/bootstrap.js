/**
 * Application Bootstrap - Initialize core systems before UI loads
 * This file ensures the persistence system is available before any UI components try to use it.
 */

// Node.js compatibility guard
if (typeof window !== 'undefined') {
  
  /**
   * Initialize the persistence system
   * Creates window.dataMerger and ensures it's ready before UI components load
   */
  async function initializePersistence() {
    try {
      console.log('[Bootstrap] Initializing persistence system...');
      
      // Import TileStructures and make it globally available so DataMerger can update it
      const { TileStructures } = await import('./tile_structures.js');
      window.TileStructures = TileStructures;
      
      // Dynamic import to avoid issues in Node.js environments
      const { DataMerger } = await import('./persistence/data_merger.js');
      
      // Create global instance
      window.dataMerger = new DataMerger();
      
      // Initialize with error handling
      await window.dataMerger.initialize();
      
      console.log('[Bootstrap] Persistence system ready');
      
      // Set flag to indicate persistence is available
      window.__PERSISTENCE_READY__ = true;
      
      // Dispatch custom event for components that need to know
      document.dispatchEvent(new CustomEvent('persistenceReady', {
        detail: { dataMerger: window.dataMerger }
      }));
      
      return window.dataMerger;
      
    } catch (error) {
      console.error('[Bootstrap] Failed to initialize persistence system:', error);
      
      // Set fallback flag
      window.__PERSISTENCE_FAILED__ = true;
      
      // Dispatch failure event
      document.dispatchEvent(new CustomEvent('persistenceError', {
        detail: { error }
      }));
      
      // Don't throw - allow app to continue without persistence
      return null;
    }
  }
  
  /**
   * Main bootstrap function
   * Initializes all core systems in the correct order
   */
  async function bootstrap() {
    console.log('[Bootstrap] Starting application bootstrap...');
    
    try {
      // Initialize persistence first
      await initializePersistence();
      
      console.log('[Bootstrap] Bootstrap complete');
      
      // Set global flag indicating bootstrap is done
      window.__APP_BOOTSTRAPPED__ = true;
      
      // Dispatch bootstrap complete event
      document.dispatchEvent(new CustomEvent('appBootstrapped'));
      
    } catch (error) {
      console.error('[Bootstrap] Bootstrap failed:', error);
      window.__APP_BOOTSTRAP_FAILED__ = true;
    }
  }
  
  /**
   * Auto-initialize when appropriate
   * Ensures bootstrap runs before other modules try to use global services
   */
  function initializeBootstrap() {
    // Prevent double initialization
    if (window.__APP_BOOTSTRAP_STARTED__) {
      return;
    }
    window.__APP_BOOTSTRAP_STARTED__ = true;
    
    // Run bootstrap
    bootstrap();
  }
  
  // Initialize immediately if DOM is ready, otherwise wait
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBootstrap);
  } else {
    // DOM already loaded, initialize on next tick to allow other scripts to load
    setTimeout(initializeBootstrap, 0);
  }
  
  // Export for manual initialization if needed
  window.initializeAppBootstrap = initializeBootstrap;
}

// Export for ES module usage
export { };