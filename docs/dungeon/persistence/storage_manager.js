/**
 * StorageManager - Centralized localStorage abstraction with error handling
 * 
 * Handles all persistent storage operations for user-created structures and tilesets.
 * Provides versioning, validation, and error recovery capabilities.
 */

export class StorageManager {
    constructor(storagePrefix = 'dungeon_editor_') {
        this.prefix = storagePrefix;
        this.version = '1.0';
        this.maxRetries = 3;
        this.retryDelay = 100; // ms
    }

    /**
     * Save user structures to localStorage
     * @param {object} structures - User structures object
     * @returns {object} Result with success boolean and optional error
     */
    saveUserStructures(structures) {
        try {
            const data = {
                version: this.version,
                timestamp: Date.now(),
                structures: structures || {}
            };
            
            const serialized = JSON.stringify(data);
            
            // Check localStorage quota
            if (this._willExceedQuota(this.prefix + 'user_structures', serialized)) {
                return { 
                    success: false, 
                    error: 'Storage quota exceeded. Please delete some structures or export data.' 
                };
            }
            
            localStorage.setItem(this.prefix + 'user_structures', serialized);
            
            console.log(`[Storage] Saved ${Object.keys(structures).length} user structures`);
            return { success: true };
            
        } catch (error) {
            console.error('[Storage] Failed to save user structures:', error);
            return { 
                success: false, 
                error: this._getStorageErrorMessage(error)
            };
        }
    }

    /**
     * Load user structures from localStorage
     * @returns {object} Result with success boolean, data object, and optional error
     */
    loadUserStructures() {
        try {
            const stored = localStorage.getItem(this.prefix + 'user_structures');
            if (!stored) {
                return { success: true, data: {} };
            }
            
            const parsed = JSON.parse(stored);
            
            // Version compatibility check
            if (parsed.version !== this.version) {
                console.warn('[Storage] Structure data version mismatch, attempting migration');
                const migrated = this._migrateStructureData(parsed);
                if (migrated.success) {
                    // Save migrated data
                    this.saveUserStructures(migrated.data);
                    return { success: true, data: migrated.data };
                } else {
                    return { 
                        success: false, 
                        error: `Migration failed: ${migrated.error}`, 
                        data: {} 
                    };
                }
            }
            
            // Validate structure data
            const structures = parsed.structures || {};
            const validatedStructures = this._validateAndCleanStructures(structures);
            
            console.log(`[Storage] Loaded ${Object.keys(validatedStructures).length} user structures`);
            return { success: true, data: validatedStructures };
            
        } catch (error) {
            console.error('[Storage] Failed to load user structures:', error);
            return { 
                success: false, 
                error: this._getStorageErrorMessage(error), 
                data: {} 
            };
        }
    }

    /**
     * Save user tilesets to localStorage
     * @param {object} tilesets - User tilesets object
     * @returns {object} Result with success boolean and optional error
     */
    saveUserTilesets(tilesets) {
        try {
            const data = {
                version: this.version,
                timestamp: Date.now(),
                tilesets: tilesets || {}
            };
            
            const serialized = JSON.stringify(data);
            
            if (this._willExceedQuota(this.prefix + 'user_tilesets', serialized)) {
                return { 
                    success: false, 
                    error: 'Storage quota exceeded. Please delete some tilesets or export data.' 
                };
            }
            
            localStorage.setItem(this.prefix + 'user_tilesets', serialized);
            
            console.log(`[Storage] Saved ${Object.keys(tilesets).length} user tilesets`);
            return { success: true };
            
        } catch (error) {
            console.error('[Storage] Failed to save user tilesets:', error);
            return { 
                success: false, 
                error: this._getStorageErrorMessage(error)
            };
        }
    }

    /**
     * Load user tilesets from localStorage
     * @returns {object} Result with success boolean, data object, and optional error
     */
    loadUserTilesets() {
        try {
            const stored = localStorage.getItem(this.prefix + 'user_tilesets');
            if (!stored) {
                return { success: true, data: {} };
            }
            
            const parsed = JSON.parse(stored);
            
            if (parsed.version !== this.version) {
                console.warn('[Storage] Tileset data version mismatch, attempting migration');
                const migrated = this._migrateTilesetData(parsed);
                if (migrated.success) {
                    this.saveUserTilesets(migrated.data);
                    return { success: true, data: migrated.data };
                } else {
                    return { 
                        success: false, 
                        error: `Migration failed: ${migrated.error}`, 
                        data: {} 
                    };
                }
            }
            
            const tilesets = parsed.tilesets || {};
            const validatedTilesets = this._validateAndCleanTilesets(tilesets);
            
            console.log(`[Storage] Loaded ${Object.keys(validatedTilesets).length} user tilesets`);
            return { success: true, data: validatedTilesets };
            
        } catch (error) {
            console.error('[Storage] Failed to load user tilesets:', error);
            return { 
                success: false, 
                error: this._getStorageErrorMessage(error), 
                data: {} 
            };
        }
    }

    /**
     * Save user preferences to localStorage
     * @param {object} preferences - User preferences object
     * @returns {object} Result with success boolean and optional error
     */
    saveUserPreferences(preferences) {
        try {
            const data = {
                version: this.version,
                timestamp: Date.now(),
                preferences: preferences || {}
            };
            
            localStorage.setItem(this.prefix + 'user_preferences', JSON.stringify(data));
            return { success: true };
            
        } catch (error) {
            console.error('[Storage] Failed to save user preferences:', error);
            return { 
                success: false, 
                error: this._getStorageErrorMessage(error)
            };
        }
    }

    /**
     * Load user preferences from localStorage
     * @returns {object} Result with success boolean, data object, and optional error
     */
    loadUserPreferences() {
        try {
            const stored = localStorage.getItem(this.prefix + 'user_preferences');
            if (!stored) {
                return { success: true, data: {} };
            }
            
            const parsed = JSON.parse(stored);
            return { success: true, data: parsed.preferences || {} };
            
        } catch (error) {
            console.error('[Storage] Failed to load user preferences:', error);
            return { 
                success: false, 
                error: this._getStorageErrorMessage(error), 
                data: {} 
            };
        }
    }

    /**
     * Clear all user data (factory reset)
     * @returns {object} Result with success boolean and optional error
     */
    clearAllUserData() {
        try {
            const keys = [
                this.prefix + 'user_structures',
                this.prefix + 'user_tilesets',
                this.prefix + 'user_preferences'
            ];
            
            keys.forEach(key => {
                localStorage.removeItem(key);
            });
            
            console.log('[Storage] Cleared all user data');
            return { success: true };
            
        } catch (error) {
            console.error('[Storage] Failed to clear user data:', error);
            return { 
                success: false, 
                error: this._getStorageErrorMessage(error)
            };
        }
    }

    /**
     * Export all user data for backup
     * @returns {object} Complete user data export
     */
    exportUserData() {
        const structures = this.loadUserStructures();
        const tilesets = this.loadUserTilesets();
        const preferences = this.loadUserPreferences();
        
        return {
            export_version: '1.0',
            exported_at: new Date().toISOString(),
            user_structures: structures.success ? structures.data : {},
            user_tilesets: tilesets.success ? tilesets.data : {},
            user_preferences: preferences.success ? preferences.data : {},
            metadata: {
                structure_count: Object.keys(structures.data || {}).length,
                tileset_count: Object.keys(tilesets.data || {}).length,
                export_size_bytes: JSON.stringify({
                    structures: structures.data,
                    tilesets: tilesets.data,
                    preferences: preferences.data
                }).length
            }
        };
    }

    /**
     * Import user data from backup
     * @param {object} importData - Data to import
     * @returns {object} Result with success boolean and imported metadata
     */
    importUserData(importData) {
        try {
            let imported = {
                structures: 0,
                tilesets: 0,
                preferences: 0
            };
            
            if (importData.user_structures && typeof importData.user_structures === 'object') {
                const result = this.saveUserStructures(importData.user_structures);
                if (result.success) {
                    imported.structures = Object.keys(importData.user_structures).length;
                }
            }
            
            if (importData.user_tilesets && typeof importData.user_tilesets === 'object') {
                const result = this.saveUserTilesets(importData.user_tilesets);
                if (result.success) {
                    imported.tilesets = Object.keys(importData.user_tilesets).length;
                }
            }
            
            if (importData.user_preferences && typeof importData.user_preferences === 'object') {
                const result = this.saveUserPreferences(importData.user_preferences);
                if (result.success) {
                    imported.preferences = 1;
                }
            }
            
            console.log('[Storage] Import completed:', imported);
            return { success: true, imported };
            
        } catch (error) {
            console.error('[Storage] Failed to import user data:', error);
            return { 
                success: false, 
                error: this._getStorageErrorMessage(error)
            };
        }
    }

    /**
     * Get storage usage statistics
     * @returns {object} Storage usage information
     */
    getStorageStats() {
        try {
            const stats = {
                used: 0,
                available: 0,
                quota: 0,
                structures_size: 0,
                tilesets_size: 0,
                preferences_size: 0
            };
            
            // Calculate used space
            for (let key in localStorage) {
                if (key.startsWith(this.prefix)) {
                    const size = localStorage[key].length;
                    stats.used += size;
                    
                    if (key.includes('structures')) {
                        stats.structures_size = size;
                    } else if (key.includes('tilesets')) {
                        stats.tilesets_size = size;
                    } else if (key.includes('preferences')) {
                        stats.preferences_size = size;
                    }
                }
            }
            
            // Estimate quota (varies by browser)
            stats.quota = 5 * 1024 * 1024; // 5MB typical
            stats.available = stats.quota - stats.used;
            
            return stats;
            
        } catch (error) {
            console.error('[Storage] Failed to get storage stats:', error);
            return {
                used: 0,
                available: 0,
                quota: 0,
                structures_size: 0,
                tilesets_size: 0,
                preferences_size: 0,
                error: error.message
            };
        }
    }

    // Private helper methods

    /**
     * Check if storing data would exceed localStorage quota
     */
    _willExceedQuota(key, data) {
        try {
            const existingSize = localStorage.getItem(key)?.length || 0;
            const newSize = data.length;
            const stats = this.getStorageStats();
            
            return (stats.used - existingSize + newSize) > stats.quota * 0.95; // 95% threshold
        } catch {
            return false; // If we can't check, allow it
        }
    }

    /**
     * Get user-friendly error message from storage error
     */
    _getStorageErrorMessage(error) {
        if (error.name === 'QuotaExceededError') {
            return 'Storage quota exceeded. Please delete some data or export for backup.';
        } else if (error.name === 'SecurityError') {
            return 'Storage access denied. Please check browser settings.';
        } else {
            return `Storage error: ${error.message}`;
        }
    }

    /**
     * Validate and clean structure data
     */
    _validateAndCleanStructures(structures) {
        const cleaned = {};
        
        Object.entries(structures).forEach(([id, structure]) => {
            if (this._isValidStructure(structure)) {
                cleaned[id] = structure;
            } else {
                console.warn(`[Storage] Invalid structure skipped: ${id}`);
            }
        });
        
        return cleaned;
    }

    /**
     * Validate and clean tileset data
     */
    _validateAndCleanTilesets(tilesets) {
        const cleaned = {};
        
        Object.entries(tilesets).forEach(([id, tileset]) => {
            if (this._isValidTileset(tileset)) {
                cleaned[id] = tileset;
            } else {
                console.warn(`[Storage] Invalid tileset skipped: ${id}`);
            }
        });
        
        return cleaned;
    }

    /**
     * Basic structure validation
     */
    _isValidStructure(structure) {
        return structure &&
               structure.structure &&
               Array.isArray(structure.edges) &&
               typeof structure.type === 'string';
    }

    /**
     * Basic tileset validation
     */
    _isValidTileset(tileset) {
        return tileset &&
               typeof tileset.name === 'string' &&
               Array.isArray(tileset.tiles);
    }

    /**
     * Migrate structure data from older versions
     */
    _migrateStructureData(data) {
        try {
            // For now, just return the structures as-is
            // In future versions, add migration logic here
            return { 
                success: true, 
                data: data.structures || {} 
            };
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    /**
     * Migrate tileset data from older versions
     */
    _migrateTilesetData(data) {
        try {
            // For now, just return the tilesets as-is
            // In future versions, add migration logic here
            return { 
                success: true, 
                data: data.tilesets || {} 
            };
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }
}

// Node.js compatibility guard
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
    console.log('[StorageManager] Loaded storage manager');
}