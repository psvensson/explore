/**
 * DataMerger - Combines default and user data at runtime
 * 
 * Merges immutable default structures/tilesets with user-created content,
 * provides a unified interface for data access, and handles persistence.
 */

import { 
    DEFAULT_TILE_STRUCTURES, 
    isBuiltInStructure,
    DEFAULT_TILESETS,
    isBuiltInTileset,
    listBuiltInStructureIds
} from '../defaults/default_tile_structures.js';
import { StorageManager } from './storage_manager.js';

export class DataMerger {
    constructor() {
        this.storage = new StorageManager();
        this.initialized = false;
        this.mergedStructures = {};
        this.mergedTilesets = {};
        this.userStructures = {};
        this.userTilesets = {};
        this.initializationError = null;
    }

    /**
     * Initialize the data merger - loads user data and merges with defaults
     * @returns {Promise<boolean>} Success status
     */
    async initialize() {
        if (this.initialized) {
            return true;
        }

        try {
            console.log('[DataMerger] Initializing...');
            
            // Load user data
            const userStructuresResult = this.storage.loadUserStructures();
            const userTilesetsResult = this.storage.loadUserTilesets();

            if (!userStructuresResult.success) {
                console.warn('[DataMerger] Failed to load user structures:', userStructuresResult.error);
            }

            if (!userTilesetsResult.success) {
                console.warn('[DataMerger] Failed to load user tilesets:', userTilesetsResult.error);
            }

            // Store user data for later reference
            this.userStructures = userStructuresResult.data || {};
            this.userTilesets = userTilesetsResult.data || {};

            // Merge data layers
            this.mergedStructures = this._mergeStructures(
                DEFAULT_TILE_STRUCTURES, 
                this.userStructures
            );

            this.mergedTilesets = this._mergeTilesets(
                DEFAULT_TILESETS,
                this.userTilesets
            );

            // Update global objects for backward compatibility
            this._updateGlobalStructures();
            this._updateGlobalTilesets();

            this.initialized = true;
            
            console.log('[DataMerger] Initialized successfully:', {
                totalStructures: Object.keys(this.mergedStructures).length,
                userStructures: Object.keys(this.userStructures).length,
                totalTilesets: Object.keys(this.mergedTilesets).length,
                userTilesets: Object.keys(this.userTilesets).length
            });

            return true;

        } catch (error) {
            console.error('[DataMerger] Initialization failed:', error);
            this.initializationError = error;
            
            // Fallback to defaults only
            this.mergedStructures = { ...DEFAULT_TILE_STRUCTURES };
            this.mergedTilesets = { ...DEFAULT_TILESETS };
            this._updateGlobalStructures();
            this._updateGlobalTilesets();
            this.initialized = true;
            
            return false;
        }
    }

    /**
     * Get all merged structures (defaults + user)
     * @returns {object} All available structures
     */
    getAllStructures() {
        if (!this.initialized) {
            throw new Error('DataMerger not initialized. Call initialize() first.');
        }
        return { ...this.mergedStructures };
    }

    /**
     * Get all merged tilesets (defaults + user)
     * @returns {object} All available tilesets
     */
    getAllTilesets() {
        if (!this.initialized) {
            throw new Error('DataMerger not initialized. Call initialize() first.');
        }
        return { ...this.mergedTilesets };
    }

    /**
     * Save a user structure (creates or updates)
     * @param {string} id - Structure ID
     * @param {object} structure - Structure data
     * @returns {Promise<object>} Result with success boolean and optional error
     */
    async saveUserStructure(id, structure) {
        if (!this.initialized) {
            return { success: false, error: 'DataMerger not initialized' };
        }

        try {
            // Validate structure
            if (!this._validateStructure(structure)) {
                return { success: false, error: 'Invalid structure data' };
            }

            // Don't allow overwriting built-in structures
            if (isBuiltInStructure(id)) {
                return { success: false, error: 'Cannot modify built-in structures' };
            }

            // Update user structures
            this.userStructures[id] = structure;

            // Save to storage
            const result = this.storage.saveUserStructures(this.userStructures);
            
            if (result.success) {
                // Re-merge and update globals
                this.mergedStructures = this._mergeStructures(DEFAULT_TILE_STRUCTURES, this.userStructures);
                this._updateGlobalStructures();
                
                console.log('[DataMerger] Saved user structure:', id);
                return { success: true };
            } else {
                // Rollback changes
                delete this.userStructures[id];
                return result;
            }
        } catch (error) {
            console.error('[DataMerger] Failed to save user structure:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete a user structure
     * @param {string} id - Structure ID to delete
     * @returns {Promise<object>} Result with success boolean and optional error
     */
    async deleteUserStructure(id) {
        if (!this.initialized) {
            return { success: false, error: 'DataMerger not initialized' };
        }

        // Prevent deletion of built-in structures
        if (isBuiltInStructure(id)) {
            return { success: false, error: 'Cannot delete built-in structures' };
        }

        try {
            if (!this.userStructures[id]) {
                return { success: false, error: 'Structure not found in user data' };
            }

            // Remove structure
            delete this.userStructures[id];

            // Save to storage
            const result = this.storage.saveUserStructures(this.userStructures);
            
            if (result.success) {
                // Re-merge and update globals
                this.mergedStructures = this._mergeStructures(DEFAULT_TILE_STRUCTURES, this.userStructures);
                this._updateGlobalStructures();
                
                console.log('[DataMerger] Deleted user structure:', id);
                return { success: true };
            } else {
                // Rollback changes
                this.userStructures[id] = this.mergedStructures[id];
                return result;
            }
        } catch (error) {
            console.error('[DataMerger] Failed to delete user structure:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Save a user tileset (creates or updates)
     * @param {string} id - Tileset ID
     * @param {object} tileset - Tileset data
     * @returns {Promise<object>} Result with success boolean and optional error
     */
    async saveUserTileset(id, tileset) {
        if (!this.initialized) {
            return { success: false, error: 'DataMerger not initialized' };
        }

        try {
            // Validate tileset
            if (!this._validateTileset(tileset)) {
                return { success: false, error: 'Invalid tileset data' };
            }

            // Don't allow overwriting built-in tilesets
            if (isBuiltInTileset(id)) {
                return { success: false, error: 'Cannot modify built-in tilesets' };
            }

            // Update user tilesets
            this.userTilesets[id] = tileset;

            // Save to storage
            const result = this.storage.saveUserTilesets(this.userTilesets);
            
            if (result.success) {
                // Re-merge and update globals
                this.mergedTilesets = this._mergeTilesets(DEFAULT_TILESETS, this.userTilesets);
                this._updateGlobalTilesets();
                
                console.log('[DataMerger] Saved user tileset:', id);
                return { success: true };
            } else {
                // Rollback changes
                delete this.userTilesets[id];
                return result;
            }
        } catch (error) {
            console.error('[DataMerger] Failed to save user tileset:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete a user tileset
     * @param {string} id - Tileset ID to delete
     * @returns {Promise<object>} Result with success boolean and optional error
     */
    async deleteUserTileset(id) {
        if (!this.initialized) {
            return { success: false, error: 'DataMerger not initialized' };
        }

        // Prevent deletion of built-in tilesets
        if (isBuiltInTileset(id)) {
            return { success: false, error: 'Cannot delete built-in tilesets' };
        }

        try {
            if (!this.userTilesets[id]) {
                return { success: false, error: 'Tileset not found in user data' };
            }

            // Remove tileset
            delete this.userTilesets[id];

            // Save to storage
            const result = this.storage.saveUserTilesets(this.userTilesets);
            
            if (result.success) {
                // Re-merge and update globals
                this.mergedTilesets = this._mergeTilesets(DEFAULT_TILESETS, this.userTilesets);
                this._updateGlobalTilesets();
                
                console.log('[DataMerger] Deleted user tileset:', id);
                return { success: true };
            } else {
                // Rollback changes
                this.userTilesets[id] = this.mergedTilesets[id];
                return result;
            }
        } catch (error) {
            console.error('[DataMerger] Failed to delete user tileset:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get user structure IDs only
     * @returns {string[]} Array of user structure IDs
     */
    getUserStructureIds() {
        return Object.keys(this.userStructures);
    }

    /**
     * Get user tileset IDs only
     * @returns {string[]} Array of user tileset IDs
     */
    getUserTilesetIds() {
        return Object.keys(this.userTilesets);
    }

    /**
     * Check if structure ID is built-in
     * @param {string} id - Structure ID
     * @returns {boolean} True if built-in
     */
    isBuiltInStructure(id) {
        return isBuiltInStructure(id);
    }

    /**
     * Check if tileset ID is built-in
     * @param {string} id - Tileset ID
     * @returns {boolean} True if built-in
     */
    isBuiltInTileset(id) {
        return isBuiltInTileset(id);
    }

    /**
     * Export all user data
     * @returns {object} User data export
     */
    exportUserData() {
        return this.storage.exportUserData();
    }

    /**
     * Import user data
     * @param {object} data - Import data
     * @returns {Promise<object>} Import result
     */
    async importUserData(data) {
        const result = this.storage.importUserData(data);
        
        if (result.success) {
            // Reload and re-merge data
            await this.initialize();
        }
        
        return result;
    }

    /**
     * Clear all user data
     * @returns {Promise<object>} Clear result
     */
    async clearAllUserData() {
        const result = this.storage.clearAllUserData();
        
        if (result.success) {
            // Reset to defaults
            this.userStructures = {};
            this.userTilesets = {};
            this.mergedStructures = { ...DEFAULT_TILE_STRUCTURES };
            this.mergedTilesets = { ...DEFAULT_TILESETS };
            this._updateGlobalStructures();
            this._updateGlobalTilesets();
        }
        
        return result;
    }

    // Private methods

    /**
     * Merge default and user structures
     */
    _mergeStructures(defaultStructures, userStructures) {
        const merged = { ...defaultStructures };
        
        // Add user structures (can override defaults if needed for migration)
        Object.entries(userStructures).forEach(([id, structure]) => {
            if (this._validateStructure(structure)) {
                merged[id] = structure;
            } else {
                console.warn('[DataMerger] Invalid user structure skipped:', id);
            }
        });

        return merged;
    }

    /**
     * Merge default and user tilesets
     */
    _mergeTilesets(defaultTilesets, userTilesets) {
        const merged = { ...defaultTilesets };
        
        Object.entries(userTilesets).forEach(([id, tileset]) => {
            if (this._validateTileset(tileset)) {
                merged[id] = tileset;
            } else {
                console.warn('[DataMerger] Invalid user tileset skipped:', id);
            }
        });

        return merged;
    }

    /**
     * Update global structures object for backward compatibility
     */
    _updateGlobalStructures() {
        if (typeof window !== 'undefined') {
            // Update TileStructures.structures
            if (window.TileStructures) {
                window.TileStructures.structures = { ...this.mergedStructures };
            }
            
            // Make merged structures available globally
            window.MERGED_STRUCTURES = { ...this.mergedStructures };
        }
    }

    /**
     * Update global tilesets object for backward compatibility
     */
    _updateGlobalTilesets() {
        if (typeof window !== 'undefined') {
            // Update SIMPLIFIED_TILESETS
            window.SIMPLIFIED_TILESETS = { ...this.mergedTilesets };
            
            // Make merged tilesets available globally
            window.MERGED_TILESETS = { ...this.mergedTilesets };
        }
    }

    /**
     * Validate structure data
     */
    _validateStructure(structure) {
        return structure && 
               structure.structure && 
               Array.isArray(structure.edges) && 
               structure.edges.length === 4 &&
               typeof structure.type === 'string';
    }

    /**
     * Validate tileset data
     */
    _validateTileset(tileset) {
        return tileset &&
               typeof tileset.name === 'string' &&
               Array.isArray(tileset.tiles) &&
               tileset.tiles.length > 0;
    }
}

// Node.js compatibility guard
if (typeof window !== 'undefined') {
    window.DataMerger = DataMerger;
    console.log('[DataMerger] Loaded data merger');
}