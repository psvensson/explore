// connectivity_analysis.js
// Functions to analyze tile connectivity and traversability in generated maps

/**
 * Extract traversable positions from a 3D voxel grid, with boundary awareness
 * @param {number[][][]} grid3D - Grid in format [z][y][x] where y is vertical
 * @param {Object} options - Options including boundary handling
 * @returns {Set<string>} Set of "x,y,z" position strings for traversable spaces
 */
export function extractTraversableSpaces(grid3D, options = {}) {
  const { excludeBoundaryEdges = false } = options;
  const traversable = new Set();
  
  const maxZ = grid3D.length;
  const maxY = grid3D[0]?.length || 0;
  const maxX = grid3D[0]?.[0]?.length || 0;
  
  for (let z = 0; z < maxZ; z++) {
    for (let y = 0; y < maxY; y++) {
      for (let x = 0; x < maxX; x++) {
        // Skip boundary edges if requested (to avoid "openings to nowhere")
        if (excludeBoundaryEdges) {
          const isAtEdge = (x === 0 || x === maxX - 1 || z === 0 || z === maxZ - 1);
          if (isAtEdge) continue;
        }
        
        const voxel = grid3D[z][y][x];
        // A space is traversable if it's empty (0) or a stair (2)
        if (voxel === 0 || voxel === 2) {
          traversable.add(`${x},${y},${z}`);
        }
      }
    }
  }
  
  return traversable;
}

/**
 * Get adjacent positions for movement (N,S,E,W,Up,Down)
 * @param {string} pos - Position string "x,y,z"
 * @param {number[][][]} grid3D - Grid to check for valid stair connections
 * @returns {string[]} Array of adjacent position strings
 */
export function getAdjacentPositions(pos, grid3D) {
  const [x, y, z] = pos.split(',').map(Number);
  const adjacent = [];
  
  // Horizontal movement (always allowed between traversable spaces)
  adjacent.push(
    `${x},${y},${z-1}`, // North
    `${x},${y},${z+1}`, // South  
    `${x-1},${y},${z}`, // West
    `${x+1},${y},${z}`  // East
  );
  
  // Vertical movement (only allowed through stairs)
  if (grid3D && grid3D[z] && grid3D[z][y] && grid3D[z][y][x] === 2) {
    // This position has a stair, so vertical movement is possible
    if (y > 0) adjacent.push(`${x},${y-1},${z}`); // Down
    if (y < 2) adjacent.push(`${x},${y+1},${z}`); // Up
  }
  
  return adjacent;
}

/**
 * Check if all traversable spaces are connected using flood-fill
 * @param {Set<string>} traversableSpaces - Set of traversable position strings
 * @param {number[][][]} grid3D - Grid for checking stair connections
 * @returns {Object} Analysis result with connectivity info
 */
export function analyzeConnectivity(traversableSpaces, grid3D) {
  if (traversableSpaces.size === 0) {
    return {
      isFullyConnected: true,
      totalSpaces: 0,
      connectedComponents: [],
      componentCount: 0,
      componentSizes: [],
      largestComponent: 0,
      isolatedSpaces: 0
    };
  }
  
  const visited = new Set();
  const components = [];
  
  // Find all connected components using flood-fill
  for (const startPos of traversableSpaces) {
    if (visited.has(startPos)) continue;
    
    // Start new component with flood-fill
    const component = new Set();
    const queue = [startPos];
    
    while (queue.length > 0) {
      const pos = queue.shift();
      if (visited.has(pos)) continue;
      
      visited.add(pos);
      component.add(pos);
      
      // Check all adjacent positions (including vertical through stairs)
      for (const adjPos of getAdjacentPositions(pos, grid3D)) {
        if (traversableSpaces.has(adjPos) && !visited.has(adjPos)) {
          queue.push(adjPos);
        }
      }
    }
    
    components.push(component);
  }
  
  const componentSizes = components.map(c => c.size);
  const largestComponent = Math.max(...componentSizes, 0);
  const isFullyConnected = components.length <= 1;
  
  return {
    isFullyConnected,
    totalSpaces: traversableSpaces.size,
    connectedComponents: components,
    componentCount: components.length,
    componentSizes,
    largestComponent,
    isolatedSpaces: traversableSpaces.size - largestComponent
  };
}

/**
 * Detailed connectivity report for debugging
 * @param {Object} analysis - Result from analyzeConnectivity
 * @returns {string} Human-readable connectivity report
 */
export function generateConnectivityReport(analysis) {
  const { isFullyConnected, totalSpaces, componentCount, componentSizes, largestComponent, isolatedSpaces } = analysis;
  
  let report = `Connectivity Analysis:\n`;
  report += `- Total traversable spaces: ${totalSpaces}\n`;
  report += `- Connected components: ${componentCount}\n`;
  report += `- Fully connected: ${isFullyConnected ? 'YES' : 'NO'}\n`;
  
  if (!isFullyConnected) {
    report += `- Largest component: ${largestComponent} spaces\n`;
    report += `- Isolated spaces: ${isolatedSpaces}\n`;
    report += `- Component sizes: [${componentSizes.join(', ')}]\n`;
  }
  
  return report;
}

/**
 * Check connectivity for a generated WFC result
 * @param {Array} tiles - WFC tile results with position and prototypeIndex
 * @param {Array} tilePrototypes - Tile prototype definitions with voxels
 * @param {Object} options - Options for connectivity analysis
 * @returns {Object} Connectivity analysis result
 */
export function checkWFCConnectivity(tiles, tilePrototypes, options = {}) {
  const { excludeBoundaryEdges = true } = options;
  if (!tiles || tiles.length === 0) {
    throw new Error('No tiles provided for connectivity analysis');
  }
  
  // Find grid dimensions
  const maxX = Math.max(...tiles.map(t => t.position[2])) + 1;
  const maxY = Math.max(...tiles.map(t => t.position[1])) + 1; 
  const maxZ = Math.max(...tiles.map(t => t.position[0])) + 1;
  
  // Build 3D voxel grid from tiles
  const grid3D = Array.from({length: maxZ * 3}, () => 
    Array.from({length: maxY * 3}, () => 
      Array(maxX * 3).fill(1) // Default to solid
    )
  );
  
  // Place each tile's voxels into the grid
  for (const tile of tiles) {
    const proto = tilePrototypes[tile.prototypeIndex];
    if (!proto || !proto.voxels) continue;
    
    const [tileZ, tileY, tileX] = tile.position;
    const voxels = proto.voxels; // Already in [z][y][x] format
    
    for (let z = 0; z < 3; z++) {
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          const gridZ = tileZ * 3 + z;
          const gridY = tileY * 3 + y;
          const gridX = tileX * 3 + x;
          
          if (gridZ < grid3D.length && gridY < grid3D[0].length && gridX < grid3D[0][0].length) {
            grid3D[gridZ][gridY][gridX] = voxels[z][y][x];
          }
        }
      }
    }
  }
  
  // Extract traversable spaces and analyze connectivity
  // Use boundary-aware analysis to ignore edge "openings to nowhere"
  const traversableSpaces = extractTraversableSpaces(grid3D, { excludeBoundaryEdges });
  const analysis = analyzeConnectivity(traversableSpaces, grid3D);
  
  return {
    ...analysis,
    gridDimensions: { x: maxX * 3, y: maxY * 3, z: maxZ * 3 },
    tileCount: tiles.length
  };
}