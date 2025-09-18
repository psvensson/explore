// tileset_builder.js
// Pure builder turning TILE_DEFS into runtime prototypes (optionally registering each with NDWFC3D).

function layersToVoxels(layers){
  if(layers.length!==3) throw new Error('Expected 3 layers');
  // Convert layers[floor, middle, ceiling] to voxels[z][y][x] where y is vertical
  // layer 0 (floor) -> y=0, layer 1 (middle) -> y=1, layer 2 (ceiling) -> y=2
  const voxels = [];
  for(let z = 0; z < 3; z++) {
    const zSlice = [];
    for(let y = 0; y < 3; y++) {
      const row = [];
      for(let x = 0; x < 3; x++) {
        // Map layer index to y coordinate: layer y corresponds to voxel y
        const layerIndex = y;
        if(layerIndex >= layers.length) throw new Error(`Layer ${layerIndex} missing`);
        const layer = layers[layerIndex];
        if(z >= layer.length) throw new Error(`Layer ${layerIndex} missing row ${z}`);
        const rowStr = layer[z];
        if(x >= rowStr.length) throw new Error(`Layer ${layerIndex} row ${z} missing col ${x}`);
        const ch = rowStr[x];
        if(!/[0-2]/.test(ch)) throw new Error(`Invalid voxel char '${ch}' at (${x},${y},${z})`);
        row.push(Number(ch));
      }
      zSlice.push(row);
    }
    voxels.push(zSlice);
  }
  return voxels;
}

export function buildTileset(defs,{register}={}){
  const tilePrototypes=[]; const protoTileIds=[];
  defs.forEach((def, idx)=>{
    const voxels=layersToVoxels(def.layers);
    // meta (including weight) is passed through verbatim
    const proto={ id:idx, tileId:def.tileId, voxels, size:[3,3,3], transforms:def.transforms||[], meta:def.meta||{} };
    protoTileIds.push(idx); tilePrototypes.push(proto); if(register) register(proto);
  });
  return { tilePrototypes, protoTileIds };
}

export default { buildTileset };
