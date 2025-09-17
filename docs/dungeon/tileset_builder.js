// tileset_builder.js
// Pure builder turning TILE_DEFS into runtime prototypes (optionally registering each with NDWFC3D).

function layersToVoxels(layers){
  if(layers.length!==3) throw new Error('Expected 3 z-layers');
  return layers.map((layer,z)=>{
    if(layer.length!==3) throw new Error(`Layer z=${z} must have 3 rows`);
    return layer.map((row,y)=>{
      if(row.length!==3) throw new Error(`Row length must be 3 (z=${z}, y=${y})`);
  return [...row].map((ch,x)=>{ if(!/[0-2]/.test(ch)) throw new Error(`Invalid voxel char '${ch}' at (${x},${y},${z})`); return Number(ch); });
    });
  });
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
