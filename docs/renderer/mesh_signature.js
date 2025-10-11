// mesh_signature.js
// Helper to derive a deterministic signature for a mesh/group for testing & diffing.

export function meshSignature(group){
  if(!group || !group.children) return 'EMPTY';
  const parts = [];
  for (const child of group.children){
    if (!child) continue;
    const kind = child.material && child.material.userData && (child.material.userData.kind || child.material.userData.type) || 'unk';
    // Some test mocks update mesh.x instead of mesh.position.x inside position.set
  const px = (typeof child.x === 'number') ? child.x : (child.position && typeof child.position.x === 'number' ? child.position.x : 0);
  const py = (typeof child.y === 'number') ? child.y : (child.position && typeof child.position.y === 'number' ? child.position.y : 0);
  const pz = (typeof child.z === 'number') ? child.z : (child.position && typeof child.position.z === 'number' ? child.position.z : 0);
    const rx = Math.round(px*1000)/1000;
    const ry = Math.round(py*1000)/1000;
    const rz = Math.round(pz*1000)/1000;
    parts.push(`${kind}@${rx},${ry},${rz}`);
  }
  return parts.sort().join('|');
}

export function meshHash(group){
  // Simple DJB2 over signature
  const sig = meshSignature(group);
  let h = 5381;
  for (let i=0;i<sig.length;i++) h = ((h<<5)+h) ^ sig.charCodeAt(i);
  return (h>>>0).toString(16);
}
