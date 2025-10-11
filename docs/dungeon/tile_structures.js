/**
 * tile_structures.js (unified wrapper)
 * Provides a stable import surface for built-in tile structures.
 * All canonical definitions now live in defaults/default_tile_structures.js.
 */
// All built-in structure definitions now sourced from DEFAULT_TILE_STRUCTURES.
// This file remains to preserve existing import paths.

import { DEFAULT_TILE_STRUCTURES } from './defaults/default_tile_structures.js';

export class TileStructures {
  static structures = DEFAULT_TILE_STRUCTURES;
  static getAll(){ return { ...this.structures }; }
  static get(name){
    const s = this.structures[name];
    if(!s) throw new Error(`Structure '${name}' not found`);
    return s; // immutable objects already
  }
  // Returns an object guaranteed to have legacy .layers (string rows) for UI expectations
  static getWithLegacyLayers(name){
    const s = this.get(name);
    if(s.layers) return s;
    // Build a lightweight wrapper (do not mutate original frozen structure)
    const layers = s.structure.map(layer => layer.map(row => row.map(v => (typeof v==='number'? v:0)).join('')));
    return { ...s, layers };
  }
  // --- Backwards compatibility helpers (legacy UI still calls these) ---
  static getAllStructures(){ return this.getAll(); }
  static getStructure(name){ return this.get(name); }
  static getNames(){ return Object.keys(this.structures); }
  static rotate(structure, angle){
    const rotations= (angle/90)|0; if(angle%90!==0||rotations<0||rotations>3) throw new Error('Angle must be 0,90,180,270');
    let cur = structure;
    for(let i=0;i<rotations;i++) cur = this._rotateSingle(cur);
    return cur;
  }
  static _rotateSingle(structure){
    const rotatedLayers = structure.structure.map(layer => {
      const size=layer.length; const out=Array(size).fill().map(()=>Array(size).fill(0));
      for(let r=0;r<size;r++) for(let c=0;c<size;c++) out[c][size-1-r]=layer[r][c];
      return out;
    });
    // Rotate edge patterns (n,e,s,w) -> (w,n,e,s) for 90° clockwise
    let rotatedEdges = structure.edges;
    if(Array.isArray(structure.edges) && structure.edges.length === 4){
      const [n,e,s,w] = structure.edges;
      rotatedEdges = [w, n, e, s];
    }
    return { ...structure, structure: rotatedLayers, edges: rotatedEdges };
  }
}