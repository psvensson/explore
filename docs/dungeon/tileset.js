/* moved from renderer/tileset.js */
export const protoTileIds = [];
export const tilePrototypes = [];
function layersToVoxels(layers){ if (layers.length!==3) throw new Error('Expected exactly 3 z-layers'); return layers.map((layer,z)=>{ if (layer.length!==3) throw new Error(`Layer z=${z} must have 3 rows`); return layer.map((row,y)=>{ if (row.length!==3) throw new Error(`Row length must be 3 (z=${z}, y=${y})`); return [...row].map((ch,x)=>{ if(!/[0-2]/.test(ch)) throw new Error(`Invalid voxel char '${ch}' at (${x},${y},${z})`); return Number(ch); }); }); }); }
function commitTilePrototype(proto){ NDWFC3D(proto); }
export function createTileFormLayers(layers,tileId,{transforms=[]}={}){ const voxels=layersToVoxels(layers); const protoIndex=protoTileIds.length; const proto={ id:protoIndex, tileId, voxels, size:[3,3,3], transforms }; protoTileIds.push(protoIndex); tilePrototypes.push(proto); commitTilePrototype(proto); return protoIndex; }
export const addTileFromLayers = createTileFormLayers;
export function initializeTileset(){
	if (tilePrototypes.length>0) return;
	addTileFromLayers([["000","000","000"],["000","000","000"],["000","000","000"]],0,{transforms:[]});
	const emptyWithFloorProtoIdx=protoTileIds.length;
	addTileFromLayers([["111","111","111"],["000","000","000"],["000","000","000"]],1,{transforms:[]});
	const solidProtoIdx=protoTileIds.length;
	addTileFromLayers([["111","111","111"],["111","111","111"],["111","111","111"]],1,{transforms:[]});
	// Corridor / structural variants (unchanged)
	addTileFromLayers([["111","111","111"],["111","000","111"],["111","000","111"]],0,{transforms:["ry","ry+ry","ry+ry+ry"]});
	addTileFromLayers([["111","111","111"],["111","100","100"],["111","100","100"]],0,{transforms:["ry","ry+ry","ry+ry+ry"]});
	addTileFromLayers([["111","111","111"],["111","100","000"],["100","000","000"]],0,{transforms:["ry","ry+ry","ry+ry+ry"]});

	// New portal-style stair pair (lower -> upper). Each has full floor & ceiling except a single aligned hole.
	// Lower stair: central ramp voxel at mid layer, ceiling hole at (x=1,z=1) (y=2 row of middle z layer)
	// Layers format: [z0, z1, z2]; each z layer has rows y0,y1,y2.
	// Lower: ramp rises to hole in ceiling.
	addTileFromLayers([
		["111","000","111"], // z=0
		["111","020","101"], // z=1 (ceiling row y2 has hole '101')
		["111","000","111"]  // z=2
	],31,{transforms:["ry","ry+ry","ry+ry+ry"]});

	// Upper stair: floor hole aligned with lower ceiling hole; landing mid layer fully open.
	addTileFromLayers([
		["111","000","111"], // z=0
		["101","000","111"], // z=1 (floor row y0 has hole '101')
		["111","000","111"]  // z=2
	],32,{transforms:["ry","ry+ry","ry+ry+ry"]});

	// Other structural variants (kept)
	addTileFromLayers([["111","111","111"],["111","000","111"],["111","111","111"]],0,{transforms:["ry","ry+ry","ry+ry+ry"]});
	addTileFromLayers([["111","111","111"],["111","000","111"],["111","100","111"]],0,{transforms:["ry","ry+ry","ry+ry+ry"]});
	addTileFromLayers([["111","111","111"],["101","000","101"],["111","111","111"]],0,{transforms:[]});
	return { emptyWithFloorProtoIdx, solidProtoIdx };
}
if (typeof window!=='undefined' && typeof NDWFC3D==='function'){ initializeTileset(); }
export default { initializeTileset, createTileFormLayers, addTileFromLayers, protoTileIds, tilePrototypes };
export function _resetTilesetForTests(){ tilePrototypes.length=0; protoTileIds.length=0; }
