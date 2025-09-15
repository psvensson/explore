/* moved from renderer/tileset.js */
export const protoTileIds = [];
export const tilePrototypes = [];
function layersToVoxels(layers){ if (layers.length!==3) throw new Error('Expected exactly 3 z-layers'); return layers.map((layer,z)=>{ if (layer.length!==3) throw new Error(`Layer z=${z} must have 3 rows`); return layer.map((row,y)=>{ if (row.length!==3) throw new Error(`Row length must be 3 (z=${z}, y=${y})`); return [...row].map((ch,x)=>{ if(!/[0-2]/.test(ch)) throw new Error(`Invalid voxel char '${ch}' at (${x},${y},${z})`); return Number(ch); }); }); }); }
function commitTilePrototype(proto){ NDWFC3D(proto); }
export function createTileFormLayers(layers,tileId,{transforms=[]}={}){ const voxels=layersToVoxels(layers); const protoIndex=protoTileIds.length; const proto={ id:protoIndex, tileId, voxels, size:[3,3,3], transforms }; protoTileIds.push(protoIndex); tilePrototypes.push(proto); commitTilePrototype(proto); return protoIndex; }
export const addTileFromLayers = createTileFormLayers;
export function initializeTileset(){
	if (tilePrototypes.length>0) return;
	// Removed legacy all-zero tile; every tile now provides a full floor & ceiling (except portal holes)
	const emptyWithFloorProtoIdx=protoTileIds.length; // open space tile: solid floor & ceiling, empty middle
	addTileFromLayers([
		["111","000","111"],
		["111","000","111"],
		["111","000","111"]
	],1,{transforms:[]});
	const solidProtoIdx=protoTileIds.length;
	addTileFromLayers([["111","111","111"],["111","111","111"],["111","111","111"]],1,{transforms:[]});
	// Corridor / structural variants (unchanged)
	addTileFromLayers([["111","111","111"],["111","000","111"],["111","000","111"]],0,{transforms:["ry","ry+ry","ry+ry+ry"]});
	// Variant with side wall thinning; ensure top row solid
	addTileFromLayers([["111","111","111"],["111","100","111"],["111","100","111"]],0,{transforms:["ry","ry+ry","ry+ry+ry"]});
	// Tapered corner style corridor; maintain solid floor & ceiling
	addTileFromLayers([["111","111","111"],["111","100","111"],["111","000","111"]],0,{transforms:["ry","ry+ry","ry+ry+ry"]});

	// Refactored portal-style stair pair (lower -> upper) with full headroom.
	// Lower stair: solid floor (y=0) across tile, fully open ceiling (y=2 = 000) for unobstructed ascent.
	addTileFromLayers([
		["101","000","000"], // narrow central support instead of full floor
		["101","020","000"], // stair voxel centered, same support
		["101","000","000"]
	],31,{transforms:["ry","ry+ry","ry+ry+ry"]});

	// Upper stair: fully open floor (y=0 = 000) to receive ascent, solid ceiling (y=2) to preserve level separation.
	addTileFromLayers([
		["000","000","101"], // ceiling only narrow support strip
		["000","020","101"], // stair voxel under strip
		["000","000","101"]
	],32,{transforms:["ry","ry+ry","ry+ry+ry"]});

	// Other structural variants (kept)
	addTileFromLayers([["111","111","111"],["111","000","111"],["111","111","111"]],0,{transforms:["ry","ry+ry","ry+ry+ry"]});
	addTileFromLayers([["111","111","111"],["111","000","111"],["111","111","111"]],0,{transforms:["ry","ry+ry","ry+ry+ry"]});
	// Compact open-with-pillars variant (still solid floor/ceiling)
	addTileFromLayers([["111","111","111"],["111","000","111"],["111","111","111"]],0,{transforms:[]});
	return { emptyWithFloorProtoIdx, solidProtoIdx };
}
if (typeof window!=='undefined' && typeof NDWFC3D==='function'){ initializeTileset(); }
export default { initializeTileset, createTileFormLayers, addTileFromLayers, protoTileIds, tilePrototypes };
export function _resetTilesetForTests(){ tilePrototypes.length=0; protoTileIds.length=0; }
