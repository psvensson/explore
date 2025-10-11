// materials_default.js
// Introduces a central default material factory WITHOUT altering existing global usage.
// Future refactors can import from here instead of ad-hoc creation.

import { MATERIAL_KIND } from '../utils/voxel_constants.js';

export function createDefaultMaterials(THREE){
  const make = (kind, color)=>{
    const M = THREE.MeshStandardMaterial || THREE.MeshPhongMaterial;
    const m = new M({ color });
    m.userData.kind = kind;
    return m;
  };
  return {
    floor: make(MATERIAL_KIND.FLOOR, 0x333333),
    wall: make(MATERIAL_KIND.WALL, 0x606060),
    ceiling: make(MATERIAL_KIND.CEILING, 0x888888),
    stair: make(MATERIAL_KIND.STAIR, 0x777777)
  };
}
