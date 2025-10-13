/**
 * MeshGeneratorRegistry - Singleton for managing mesh generator instances
 * 
 * Provides centralized registration and access to mesh generators, allowing
 * runtime switching between different visual styles.
 */
class MeshGeneratorRegistry {
  constructor() {
    if (MeshGeneratorRegistry._instance) {
      return MeshGeneratorRegistry._instance;
    }

    this._generators = new Map();
    this._activeGeneratorId = null;
    
    MeshGeneratorRegistry._instance = this;
  }

  /**
   * Register a mesh generator
   * @param {BaseMeshGenerator} generator - Generator instance to register
   * @throws {Error} If generator doesn't implement required interface
   */
  register(generator) {
    if (!generator || typeof generator.getId !== 'function') {
      throw new Error('Generator must implement getId() method');
    }

    const id = generator.getId();
    
    // Validate generator implements required methods
    const requiredMethods = [
      'generateTileMesh',
      'generateWall',
      'generateFloor',
      'generateCeiling',
      'generateStairs',
      'getName'
    ];

    for (const method of requiredMethods) {
      if (typeof generator[method] !== 'function') {
        throw new Error(`Generator '${id}' must implement ${method}() method`);
      }
    }

    this._generators.set(id, generator);

    // Set as active if it's the first generator
    if (this._activeGeneratorId === null) {
      this._activeGeneratorId = id;
    }

    if (typeof window !== 'undefined' && window.__DEBUG_MESH_GENERATORS__) {
      console.log(`[MeshGeneratorRegistry] Registered generator: ${id} (${generator.getName()})`);
    }
  }

  /**
   * Unregister a mesh generator
   * @param {string} id - Generator ID to unregister
   * @returns {boolean} True if generator was unregistered
   */
  unregister(id) {
    const existed = this._generators.delete(id);
    
    // If we unregistered the active generator, switch to another
    if (existed && this._activeGeneratorId === id) {
      const remainingIds = Array.from(this._generators.keys());
      this._activeGeneratorId = remainingIds.length > 0 ? remainingIds[0] : null;
    }

    return existed;
  }

  /**
   * Get a registered generator by ID
   * @param {string} id - Generator ID
   * @returns {BaseMeshGenerator|null} Generator instance or null
   */
  getGenerator(id) {
    return this._generators.get(id) || null;
  }

  /**
   * Get the currently active generator
   * @returns {BaseMeshGenerator|null} Active generator or null
   * @throws {Error} If active generator ID is set but generator not found
   */
  getActiveGenerator() {
    if (this._activeGeneratorId === null) {
      return null;
    }

    const generator = this._generators.get(this._activeGeneratorId);
    if (!generator) {
      throw new Error(`Active generator '${this._activeGeneratorId}' not found in registry`);
    }

    return generator;
  }

  /**
   * Set the active generator by ID
   * @param {string} id - Generator ID to activate
   * @throws {Error} If generator ID not registered
   */
  setActiveGenerator(id) {
    if (!this._generators.has(id)) {
      throw new Error(`Cannot set active generator: '${id}' not registered`);
    }

    const previousId = this._activeGeneratorId;
    this._activeGeneratorId = id;

    if (typeof window !== 'undefined') {
      // Dispatch event for UI to listen to
      window.dispatchEvent(new CustomEvent('meshGeneratorChanged', {
        detail: {
          previousId,
          currentId: id,
          generator: this._generators.get(id)
        }
      }));

      if (window.__DEBUG_MESH_GENERATORS__) {
        console.log(`[MeshGeneratorRegistry] Active generator changed: ${previousId} -> ${id}`);
      }
    }
  }

  /**
   * Get all registered generator IDs
   * @returns {string[]} Array of generator IDs
   */
  getGeneratorIds() {
    return Array.from(this._generators.keys());
  }

  /**
   * Get all registered generators with metadata
   * @returns {Array<{id: string, name: string, description: string, generator: BaseMeshGenerator}>}
   */
  getAllGenerators() {
    return Array.from(this._generators.entries()).map(([id, generator]) => ({
      id,
      name: generator.getName(),
      description: generator.getDescription ? generator.getDescription() : '',
      generator
    }));
  }

  /**
   * Get the active generator ID
   * @returns {string|null} Active generator ID or null
   */
  getActiveGeneratorId() {
    return this._activeGeneratorId;
  }

  /**
   * Check if a generator is registered
   * @param {string} id - Generator ID
   * @returns {boolean} True if registered
   */
  hasGenerator(id) {
    return this._generators.has(id);
  }

  /**
   * Clear all registered generators
   * FOR TESTING ONLY
   */
  _clearAll() {
    this._generators.clear();
    this._activeGeneratorId = null;
  }

  /**
   * Reset singleton instance
   * FOR TESTING ONLY
   */
  static _resetInstance() {
    MeshGeneratorRegistry._instance = null;
  }
}

// Export singleton instance getter
export function getGeneratorRegistry() {
  return new MeshGeneratorRegistry();
}

// Export class for testing
export { MeshGeneratorRegistry };
