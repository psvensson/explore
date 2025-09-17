// ascii.js
// Utilities to build ASCII representations of voxel grids and tiles.

/** Build ASCII for full voxel grid grid[z][y][x]. */
export function gridToAscii(grid){
  if (!Array.isArray(grid) || grid.length===0) return '';
  const Z=grid.length, Y=grid[0].length, X=grid[0][0].length;
  const lines=[];
  lines.push('Legend: #=solid  .=empty  v=portal-lower  ^=portal-upper  O=hole');
  for (let y=0;y<Y;y++){
    lines.push(`-- Layer y=${y} --`);
    for (let z=0; z<Z; z++){
      let row='';
      for (let x=0; x<X; x++){
        const v = grid[z][y][x];
        if (v===0){ row+='.'; continue; }
        if (v===2){
          const below = (y>0)? grid[z][y-1][x] : 1;
            const above = (y<Y-1)? grid[z][y+1][x] : 1;
            if (below!==0 && above===0) row+='^';
            else if (below===0 && above!==0) row+='v';
            else row+='^';
            continue;
        }
        row+='#';
      }
      lines.push(row);
    }
    lines.push('');
  }
  return lines.join('\n');
}

/** Build a 3x3x3 block ASCII from voxels[z][y][x]. */
export function voxBlockToAscii(vox){
  let block='';
  for (let yy=0; yy<3; yy++){
    block += `y=${yy}\n`;
    for (let zz=0; zz<3; zz++){
      let row='';
      for (let xx=0; xx<3; xx++){
        const v = vox[zz][yy][xx];
        row += (v===0?'.':(v===2?'^':'#'));
      }
      block += row + '\n';
    }
    block += '\n';
  }
  return block.trim();
}
