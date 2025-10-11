// Shared utility for rendering / deriving structure previews in UI components
// Ensures a single canonical translation from numeric DEFAULT_TILE_STRUCTURES form
// to the older string-based layer preview expectations used by legacy editors.

export class StructurePreviewUtil {
  /**
   * Derive the middle layer rows (array of 3 strings) from either:
   *  - Canonical structure object: { structure: [ [ [num] ] ] }
   *  - Legacy UI object: { layers: [ ["111", ...] ] }
   * Falls back to an all-empty pattern when unavailable.
   */
  static getMiddleLayerRows(structureObj){
    if(!structureObj) return ['000','000','000'];
    // Legacy string form
    if(structureObj.layers && Array.isArray(structureObj.layers[1])){
      return structureObj.layers[1];
    }
    // Canonical numeric form
    if(structureObj.structure && Array.isArray(structureObj.structure[1])){
      return structureObj.structure[1].map(row => row.map(v => typeof v === 'number' ? v : 0).join(''));
    }
    return ['000','000','000'];
  }

  /** Render a mini 3x3 HTML snippet for the middle layer */
  static renderMini(structureObj){
    const rows = this.getMiddleLayerRows(structureObj);
    const source = structureObj?.layers ? 'layers' : (structureObj?.structure ? 'structure' : 'unknown');
    return `<div class="mini-preview" data-source="${source}">` +
      rows.map(r => `<div class="mini-row" data-row="${r}">` +
        r.split('').map(c => `<span class="mini-cell mini-cell-${c}" data-v="${c}"></span>`).join('') +
      '</div>').join('') + '</div>';
  }

  /** Simple ASCII style preview of middle layer (used in package editor). */
  static renderAsciiMiddle(structureObj){
    const rows = this.getMiddleLayerRows(structureObj);
    return `<div class="ascii-preview">` + rows.map(row =>
      `<div class="preview-row">` + row.split('').map(cell =>
        `<span class="preview-cell ${cell === '0' ? 'open' : 'wall'}">${cell === '0' ? '·' : '█'}</span>`
      ).join('') + `</div>`
    ).join('') + `</div>`;
  }

  /** Convert full canonical numeric structure (3 layers of 3x3 numbers) to legacy string layer format. */
  static numericToStringLayers(structureObj){
    if(!structureObj?.structure) return null;
    return structureObj.structure.map(layer => layer.map(row => row.map(v => (typeof v==='number'? v:0)).join('')));
  }
}

if (typeof window !== 'undefined') {
  window.StructurePreviewUtil = StructurePreviewUtil;
}
