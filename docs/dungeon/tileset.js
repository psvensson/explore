/* moved from renderer/tileset.js */
export const protoTileIds = [];
export const tilePrototypes = [];
function layersToVoxels(layers){ if (layers.length!==3) throw new Error('Expected exactly 3 z-layers'); return layers.map((layer,z)=>{ if (layer.length!==3) throw new Error(`Layer z=${z} must have 3 rows`); return layer.map((row,y)=>{ if (row.length!==3) throw new Error(`Row length must be 3 (z=${z}, y=${y})`); return [...row].map((ch,x)=>{ if(!/[0-2]/.test(ch)) throw new Error(`Invalid voxel char '${ch}' at (${x},${y},${z})`); return Number(ch); }); }); }); }
function commitTilePrototype(proto){ NDWFC3D(proto); }
export function createTileFormLayers(layers,tileId,{transforms=[], meta={}}={}){ const voxels=layersToVoxels(layers); const protoIndex=protoTileIds.length; const proto={ id:protoIndex, tileId, voxels, size:[3,3,3], transforms, meta }; protoTileIds.push(protoIndex); tilePrototypes.push(proto); commitTilePrototype(proto); return protoIndex; }
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

	// Directional stair tiles (no rotations so we can express directional adjacency rules explicitly)
	// Convention: axis indicates travel axis, dir indicates forward direction (where landing should be open)
	// Forward openness requirement will be enforced in rule generation (renderer) using boundary mid-cell emptiness.
	// +Z stair (ascending toward +Z) – forward face posZ must have empty mid cell (keep y=1 row empty on z2 slice); only add solid floor rows (y=0) across all slices
	addTileFromLayers([
		["111","111","111"],          // z0 (back slice) unchanged
		["111","020","010"],          // z1 center: solid floor row now all 1s; mid row retains stair
		["111","000","000"]           // z2 forward slice: solid floor row only, openness above
	],31,{transforms:[], meta:{ role:'stair', axis:'z', dir: 1 }});
	// -Z stair (ascending toward -Z) – forward face negZ emptiness (z0 slice mid row empty)
	addTileFromLayers([
		["111","000","000"],          // z0 forward (toward -Z) slice: floor only
		["111","020","010"],          // z1 floor solidified
		["111","111","111"]           // z2 back slice
	],32,{transforms:[], meta:{ role:'stair', axis:'z', dir: -1 }});
	// +X stair (ascending toward +X) – forward face posX emptiness (x=2 mid cell) preserved by making only floor solid in z2 slice
	addTileFromLayers([
		["111","101","111"],          // z0 slice
		["111","020","000"],          // z1 floor row solid
		["111","000","000"]           // z2 slice: floor only
	],33,{transforms:[], meta:{ role:'stair', axis:'x', dir: 1 }});
	// -X stair (ascending toward -X) – forward face negX emptiness (x=0 mid cell) with floor only
	addTileFromLayers([
		["111","000","000"],          // z0 slice: floor only
		["111","020","000"],          // z1 floor row solid
		["111","101","111"]           // z2 slice
	],34,{transforms:[], meta:{ role:'stair', axis:'x', dir: -1 }});

	// Other structural variants (kept)
	addTileFromLayers([["111","111","111"],["111","000","111"],["111","111","111"]],0,{transforms:["ry","ry+ry","ry+ry+ry"]});
	addTileFromLayers([["111","111","111"],["111","000","111"],["111","111","111"]],0,{transforms:["ry","ry+ry","ry+ry+ry"]});
	// Compact open-with-pillars variant (still solid floor/ceiling)
	addTileFromLayers([["111","111","111"],["111","000","111"],["111","111","111"]],0,{transforms:[]});
	// Open landing tile (tileId 50): solid floor everywhere, empty mid layer everywhere, open top for vertical clearance
	addTileFromLayers([
		["111","000","000"],
		["111","000","000"],
		["111","000","000"]
	],50,{transforms:["ry","ry+ry","ry+ry+ry"]});
	return { emptyWithFloorProtoIdx, solidProtoIdx };
}
if (typeof window!=='undefined' && typeof NDWFC3D==='function'){ initializeTileset(); }
export default { initializeTileset, createTileFormLayers, addTileFromLayers, protoTileIds, tilePrototypes };
export function _resetTilesetForTests(){ tilePrototypes.length=0; protoTileIds.length=0; }
