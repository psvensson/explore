/**
 * tile_adapter.js
 * Adapters to normalize tile data from different sources (WFC, Map Editor)
 * into a common DTO for renderer-side tools and overlays.
 *
 * Canonical RendererTile DTO:
 * {
 *   id: string,                      // stable unique id
 *   structureId: string,             // logical structure/tile id
 *   rotation: number,                // degrees (0,90,180,270)
 *   rotationQ: number,               // quarter-turns (0..3)
 *   position: { x:number, y:number, z:number } // tile indices in world grid
 * }
 */

export class TileAdapter {
  /**
   * Create a stable id using structureId + position + rotation quadrant
   * @param {string} structureId
   * @param {{x:number,y:number,z:number}} position
   * @param {number} rotationQ
   * @returns {string}
   */
  static makeId(structureId, position, rotationQ) {
    return `${structureId}@${position.x},${position.y},${position.z},r${rotationQ|0}`;
  }

  /**
   * Convert an editor tile (MapEditorState tile) to RendererTile
   * Editor tiles already use position:{x,y,z} and rotation in degrees.
   * @param {{id:string, structureId:string, rotation:number, position:{x:number,y:number,z:number}}} tile
   */
  static fromEditorTile(tile) {
    const rotationQ = Math.round((tile.rotation || 0) / 90) & 3;
    return {
      id: tile.id || TileAdapter.makeId(tile.structureId, tile.position, rotationQ),
      structureId: tile.structureId,
      rotation: (rotationQ * 90) % 360,
      rotationQ,
      position: { x: tile.position.x, y: tile.position.y, z: tile.position.z }
    };
  }

  /**
   * Convert a WFC tile to RendererTile
   * WFC tile format: { prototypeIndex, rotationY (0..3), position:[z,y,x] }
   * @param {Object} t - WFC tile
   * @param {Array} prototypes - array of prototypes
   */
  static fromWFCTile(t, prototypes) {
    const structureId = prototypes[t.prototypeIndex]?.tileId ?? `proto_${t.prototypeIndex}`;
    // Map WFC axes: world x = position[2], y = position[1], z = position[0]
    const position = { x: t.position[2], y: t.position[1], z: t.position[0] };
    const rotationQ = t.rotationY | 0;
    return {
      id: TileAdapter.makeId(structureId, position, rotationQ),
      structureId,
      rotation: (rotationQ * 90) % 360,
      rotationQ,
      position
    };
  }

  /**
   * Batch convert editor tiles array to RendererTile[]
   * @param {Array} tiles
   */
  static editorTilesToRendererTiles(tiles) {
    return (tiles || []).map(TileAdapter.fromEditorTile);
  }

  /**
   * Batch convert WFC tiles array to RendererTile[]
   * @param {Array} tiles
   * @param {Array} prototypes
   */
  static wfcTilesToRendererTiles(tiles, prototypes) {
    return (tiles || []).map(t => TileAdapter.fromWFCTile(t, prototypes));
  }
}
