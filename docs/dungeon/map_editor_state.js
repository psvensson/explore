/**
 * map_editor_state.js
 * State management for manual map editor
 * 
 * Manages grid-based tile placement with undo/redo support
 */

import { TileStructures } from './tile_structures.js';
import { trace } from '../utils/trace.js';

export class PlacedTile {
  constructor(structureId, rotation, position) {
    this.id = `tile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.structureId = structureId;
    this.rotation = rotation; // degrees: 0, 90, 180, 270
    this.position = { x: position.x, y: position.y, z: position.z };
  }

  clone() {
    const tile = new PlacedTile(this.structureId, this.rotation, this.position);
    tile.id = this.id;
    return tile;
  }

  toJSON() {
    return {
      id: this.id,
      structureId: this.structureId,
      rotation: this.rotation,
      position: { ...this.position }
    };
  }

  static fromJSON(data) {
    const tile = new PlacedTile(data.structureId, data.rotation, data.position);
    tile.id = data.id;
    return tile;
  }
}

class Command {
  execute() { throw new Error('Not implemented'); }
  undo() { throw new Error('Not implemented'); }
}

class PlaceTileCommand extends Command {
  constructor(state, tile) {
    super();
    this.state = state;
    this.tile = tile;
  }

  execute() {
    this.state._placeTileInternal(this.tile);
  }

  undo() {
    this.state._removeTileInternal(this.tile.position.x, this.tile.position.y, this.tile.position.z);
  }
}

class RemoveTileCommand extends Command {
  constructor(state, tile) {
    super();
    this.state = state;
    this.tile = tile;
  }

  execute() {
    this.state._removeTileInternal(this.tile.position.x, this.tile.position.y, this.tile.position.z);
  }

  undo() {
    this.state._placeTileInternal(this.tile);
  }
}

export class MapEditorState {
  constructor() {
    this.layers = new Map(); // y-level → Map<"x,z", PlacedTile>
    this.currentLayer = 0;
    this.selectedStructureId = 'corridor_ns';
    this.selectedRotation = 0; // 0, 90, 180, 270
    this.history = { past: [], future: [] };
    this.maxHistorySize = 100;

    // Event listeners
    this._listeners = {};
  }

  /**
   * Subscribe to state events
   */
  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  }

  /**
   * Emit event
   */
  _emit(event, data) {
    if (this._listeners[event]) {
      for (const cb of this._listeners[event]) {
        try {
          cb(data);
        } catch (err) {
          console.error('[MapEditorState] Event handler error:', err);
        }
      }
    }
  }

  /**
   * Get map key for position
   */
  _getKey(x, z) {
    return `${x},${z}`;
  }

  /**
   * Get or create layer map
   */
  _getLayer(y) {
    if (!this.layers.has(y)) {
      this.layers.set(y, new Map());
    }
    return this.layers.get(y);
  }

  /**
   * Internal placement without history tracking
   */
  _placeTileInternal(tile) {
    const layer = this._getLayer(tile.position.y);
    const key = this._getKey(tile.position.x, tile.position.z);
    layer.set(key, tile);
    this._emit('tilePlaced', tile);
  }

  /**
   * Internal removal without history tracking
   */
  _removeTileInternal(x, y, z) {
    const layer = this.layers.get(y);
    if (!layer) return;
    const key = this._getKey(x, z);
    const removed = layer.get(key);
    layer.delete(key);
    if (removed) this._emit('tileRemoved', removed);
    if (layer.size === 0) {
      this.layers.delete(y);
    }
  }

  /**
   * Check if a cell is occupied
   */
  isOccupied(x, y, z) {
    const layer = this.layers.get(y);
    if (!layer) return false;
    const key = this._getKey(x, z);
    return layer.has(key);
  }

  /**
   * Compute solid world-voxel coordinates for a given tile placement.
   * Returns { voxels: string[], outOfBounds: boolean, known: boolean }
   */
  _computeSolidWorldVoxels(structureId, rotation, x, y, z) {
    try {
      const all = TileStructures?.structures || {};
      const base = all[structureId];
      if (!base) {
        return { voxels: [], outOfBounds: false, known: false };
      }
      const obj = rotation ? TileStructures.rotate(base, rotation) : base;
      const layers = obj.structure; // [layerY][rowZ][colX]
      const size = (layers && layers[0] && layers[0].length) || 3;

      // Map per-tile 3x3x3 voxels into a global voxel grid consistent across tiles:
      // - x,z: world = tileIndex * size + (local - centerOffset), where centerOffset=1 for 3x3
      // - y: align "mid" layer (index 1) to the tile's currentLayer for intuitive editing
      //      worldY = y + (ly - 1)
      const centerOffset = 1;
      const voxels = [];
      for (let ly = 0; ly < layers.length; ly++) {
        const worldY = y + (ly - centerOffset);
        const layer = layers[ly];
        for (let rz = 0; rz < size; rz++) {
          const row = layer[rz];
          for (let cx = 0; cx < size; cx++) {
            const v = row[cx];
            // Treat any non-zero voxel (SOLID or STAIR) as occupying volume
            if (v && v !== 0) {
              const worldX = x * size + (cx - centerOffset);
              const worldZ = z * size + (rz - centerOffset);
              voxels.push(`${worldX},${worldY},${worldZ}`);
            }
          }
        }
      }
      return { voxels, outOfBounds: false, known: true };
    } catch (_) {
      return { voxels: [], outOfBounds: false, known: false };
    }
  }

  /**
   * Determine if placing the given tile would overlap any existing solids.
   * Returns { overlap: boolean, reason?: string }
   */
  _wouldOverlapExisting(x, y, z, structureId, rotation) {
    const { voxels: target, known } = this._computeSolidWorldVoxels(structureId, rotation, x, y, z);
    if (!known) {
      // Unknown structure: skip volumetric checks (fallback to simple cell occupancy)
      return { overlap: false };
    }
    // Build a voxel -> tileId map for quick conflict attribution (cap later for logs)
    const voxelToTile = new Map();
    const allTiles = this.getAllTiles();
    for (const t of allTiles) {
      const { voxels, known: k2 } = this._computeSolidWorldVoxels(
        t.structureId,
        t.rotation,
        t.position.x,
        t.position.y,
        t.position.z
      );
      if (!k2) continue;
      for (const v of voxels) {
        if (!voxelToTile.has(v)) voxelToTile.set(v, t.id);
      }
    }
    const colliders = new Set();
    for (const v of target) {
      if (voxelToTile.has(v)) {
        colliders.add(voxelToTile.get(v));
        // Early exit if we have enough info
        if (colliders.size >= 3) break;
      }
    }
    if (colliders.size > 0) {
      return { overlap: true, reason: 'overlap', colliders: Array.from(colliders) };
    }
    return { overlap: false };
  }

  /**
   * High-level placement check that considers cell occupancy and volumetric overlap.
   * Returns { ok: boolean, reason?: string }
   */
  canPlaceTileAt(x, y, z, structureId, rotation) {
    if (!this.canPlaceAt(x, y, z)) {
      const res = { ok: false, reason: 'occupied' };
      if (trace && trace.enabled && trace.enabled()) {
        trace.log('state:placement', {
          id: this._currentTraceId,
          action: 'deny',
          reason: res.reason,
          pos: [x, y, z],
          structureId,
          rot: rotation
        });
      }
      return res;
    }
    const vol = this._wouldOverlapExisting(x, y, z, structureId, rotation);
    if (vol.overlap) {
      const res = { ok: false, reason: vol.reason || 'overlap' };
      if (trace && trace.enabled && trace.enabled()) {
        trace.log('state:collision', {
          id: this._currentTraceId,
          pos: [x, y, z],
          structureId,
          rot: rotation,
          colliders: vol.colliders || []
        });
        trace.log('state:placement', {
          id: this._currentTraceId,
          action: 'deny',
          reason: res.reason,
          pos: [x, y, z],
          structureId,
          rot: rotation
        });
      }
      return res;
    }
    const res = { ok: true };
    if (trace && trace.enabled && trace.enabled()) {
      trace.log('state:placement', {
        id: this._currentTraceId,
        action: 'ok',
        pos: [x, y, z],
        structureId,
        rot: rotation
      });
    }
    return res;
  }

  /**
   * Determine if a tile can be placed at a cell
   * Future rules can extend this (e.g., multi-cell footprints, adjacency)
   */
  canPlaceAt(x, y, z) {
    return !this.isOccupied(x, y, z);
  }

  /**
   * Try to place a tile; enforces placement policy.
   * Returns { ok: boolean, tile?: PlacedTile, reason?: string }
   */
  tryPlaceTile(x, y, z, structureId, rotation) {
    if (trace && trace.enabled && trace.enabled()) {
      trace.log('state:placement', {
        id: this._currentTraceId,
        action: 'try',
        pos: [x, y, z],
        structureId,
        rot: rotation
      });
    }
    const check = this.canPlaceTileAt(x, y, z, structureId, rotation);
    if (!check.ok) {
      this._emit('invalidPlacement', { x, y, z, reason: check.reason });
      if (trace && trace.enabled && trace.enabled()) {
        trace.log('state:placement', {
          id: this._currentTraceId,
          action: 'deny',
          reason: check.reason,
          pos: [x, y, z],
          structureId,
          rot: rotation
        });
      }
      return { ok: false, reason: check.reason };
    }
    const tile = new PlacedTile(structureId, rotation, { x, y, z });
    const command = new PlaceTileCommand(this, tile);
    this._executeCommand(command);
    if (trace && trace.enabled && trace.enabled()) {
      trace.log('state:placement', {
        id: this._currentTraceId,
        action: 'commit',
        pos: [x, y, z],
        structureId,
        rot: rotation,
        tileId: tile.id
      });
    }
    return { ok: true, tile };
  }

  /**
   * Place a tile on the grid
   */
  placeTile(x, y, z, structureId, rotation) {
    const tile = new PlacedTile(structureId, rotation, { x, y, z });
    const command = new PlaceTileCommand(this, tile);
    this._executeCommand(command);
    return tile;
  }

  /**
   * Remove a tile from the grid
   */
  removeTile(x, y, z) {
    const existingTile = this.getTile(x, y, z);
    if (!existingTile) return false;
    
    const command = new RemoveTileCommand(this, existingTile.clone());
    this._executeCommand(command);
    return true;
  }

  /**
   * Get tile at position
   */
  getTile(x, y, z) {
    const layer = this.layers.get(y);
    if (!layer) return null;
    const key = this._getKey(x, z);
    return layer.get(key) || null;
  }

  /**
   * Get all tiles on a specific layer
   */
  getLayer(y) {
    const layer = this.layers.get(y);
    return layer ? Array.from(layer.values()) : [];
  }

  /**
   * Get all tiles
   */
  getAllTiles() {
    const tiles = [];
    for (const layer of this.layers.values()) {
      tiles.push(...Array.from(layer.values()));
    }
    return tiles;
  }

  /**
   * Clear all tiles
   */
  clear() {
    const allTiles = this.getAllTiles();
    const commands = allTiles.map(tile => new RemoveTileCommand(this, tile.clone()));
    commands.forEach(cmd => cmd.execute());
    this.history.past.push(commands);
    this.history.future = [];
    if (this.history.past.length > this.maxHistorySize) {
      this.history.past.shift();
    }
    this._emit('cleared', null);
  }

  /**
   * Clear all tiles (alias for backward compatibility)
   */
  clearAll() {
    return this.clear();
  }

  /**
   * Execute command with history tracking
   */
  _executeCommand(command) {
    command.execute();
    this.history.past.push(command);
    this.history.future = []; // Clear redo stack
    
    // Trim history
    if (this.history.past.length > this.maxHistorySize) {
      this.history.past.shift();
    }
  }

  /**
   * Undo last operation
   */
  undo() {
    if (this.history.past.length === 0) return false;
    
    const command = this.history.past.pop();
    
    if (Array.isArray(command)) {
      // Batch undo
      command.reverse().forEach(cmd => cmd.undo());
    } else {
      command.undo();
    }
    
    this.history.future.push(command);
    return true;
  }

  /**
   * Redo last undone operation
   */
  redo() {
    if (this.history.future.length === 0) return false;
    
    const command = this.history.future.pop();
    
    if (Array.isArray(command)) {
      // Batch redo
      command.forEach(cmd => cmd.execute());
    } else {
      command.execute();
    }
    
    this.history.past.push(command);
    return true;
  }

  /**
   * Get map dimensions
   */
  getDimensions() {
    const tiles = this.getAllTiles();
    if (tiles.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
    }
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    tiles.forEach(tile => {
      minX = Math.min(minX, tile.position.x);
      maxX = Math.max(maxX, tile.position.x);
      minY = Math.min(minY, tile.position.y);
      maxY = Math.max(maxY, tile.position.y);
      minZ = Math.min(minZ, tile.position.z);
      maxZ = Math.max(maxZ, tile.position.z);
    });
    
    return { minX, maxX, minY, maxY, minZ, maxZ };
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    const tiles = this.getAllTiles();
    const dimensions = this.getDimensions();
    
    return {
      version: '1.0',
      metadata: {
        name: 'Dungeon Map',
        created: new Date().toISOString(),
        dimensions,
        tileCount: tiles.length
      },
      tiles: tiles.map(tile => tile.toJSON()),
      currentLayer: this.currentLayer,
      selectedStructureId: this.selectedStructureId,
      selectedRotation: this.selectedRotation
    };
  }

  /**
   * Serialize to string (for file save)
   */
  serialize() {
    return JSON.stringify(this.toJSON());
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON(data) {
    const state = new MapEditorState();
    
    if (data.tiles && Array.isArray(data.tiles)) {
      data.tiles.forEach(tileData => {
        const tile = PlacedTile.fromJSON(tileData);
        state._placeTileInternal(tile);
      });
    }
    
    if (data.currentLayer !== undefined) {
      state.currentLayer = data.currentLayer;
    }
    
    if (data.selectedStructureId) {
      state.selectedStructureId = data.selectedStructureId;
    }
    
    if (data.selectedRotation !== undefined) {
      state.selectedRotation = data.selectedRotation;
    }
    
    // Don't restore history - start fresh
    state.history = { past: [], future: [] };
    
    return state;
  }

  /**
   * Deserialize from string and replace current state (for file load)
   */
  deserialize(text) {
    const data = JSON.parse(text);
    // Reset current state
    this.layers = new Map();
    if (data.tiles && Array.isArray(data.tiles)) {
      data.tiles.forEach(tileData => {
        const tile = PlacedTile.fromJSON(tileData);
        this._placeTileInternal(tile);
      });
    }
    if (data.currentLayer !== undefined) {
      this.currentLayer = data.currentLayer;
    }
    if (data.selectedStructureId) {
      this.selectedStructureId = data.selectedStructureId;
    }
    if (data.selectedRotation !== undefined) {
      this.selectedRotation = data.selectedRotation;
    }
    // Reset history after load
    this.history = { past: [], future: [] };
    this._emit('loaded', null);
  }

  /**
   * Get statistics
   */
  getStats() {
    const tiles = this.getAllTiles();
    const structureCounts = {};
    
    tiles.forEach(tile => {
      structureCounts[tile.structureId] = (structureCounts[tile.structureId] || 0) + 1;
    });
    
    return {
      totalTiles: tiles.length,
      layerCount: this.layers.size,
      structureCounts,
      canUndo: this.history.past.length > 0,
      canRedo: this.history.future.length > 0
    };
  }
}
