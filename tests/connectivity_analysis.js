// connectivity_analysis.js
// Functions to analyze tile connectivity and traversability in generated maps

/**
 * Extract traversable positions from a 3D voxel grid
 * @param {number[][][]} grid3D - Grid in format [z][y][x] where y is vertical
 * @returns {Set<string>} Set of "x,y,z" position strings for traversable spaces
 */
export function extractTraversableSpaces(grid3D) {
  const traversable = new Set();
  
  for (let z = 0; z < grid3D.length; z++) {
    for (let y = 0; y < grid3D[z].length; y++) {
      for (let x = 0; x < grid3D[z][y].length; x++) {
        // A space is traversable if it's empty (0) in the middle layer (y=1)
        if (y === 1 && grid3D[z][y][x] === 0) {
          traversable.add(`${x},${y},${z}`);
        }
      }
    }
  }
  
  return traversable;
}

/**
 * Get adjacent positions for 4-directional movement (N,S,E,W)
 * @param {string} pos - Position string "x,y,z"
 * @returns {string[]} Array of adjacent position strings
 */
export function getAdjacentPositions(pos) {
  const [x, y, z] = pos.split(',').map(Number);
  return [
    `${x},${y},${z-1}`, // North
    `${x},${y},${z+1}`, // South  
    `${x-1},${y},${z}`, // West
    `${x+1},${y},${z}`, // East
  ];
}

/**
 * Check if all traversable spaces are connected using flood-fill
 * @param {Set<string>} traversableSpaces - Set of traversable position strings
 * @returns {Object} Analysis result with connectivity info
 */
export function analyzeConnectivity(traversableSpaces) {
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
      
      // Check all adjacent positions
      for (const adjPos of getAdjacentPositions(pos)) {
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
 * @returns {Object} Connectivity analysis result
 */
export function checkWFCConnectivity(tiles, tilePrototypes) {
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
  const traversableSpaces = extractTraversableSpaces(grid3D);
  const analysis = analyzeConnectivity(traversableSpaces);
  
  return {
    ...analysis,
    gridDimensions: { x: maxX * 3, y: maxY * 3, z: maxZ * 3 },
    tileCount: tiles.length
  };
}