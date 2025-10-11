// Test the diagnostic tool
import { printDiagnosticReport } from '../docs/utils/diagnostic_voxel_check.js';

console.log('Testing corridor_ns structure:');
printDiagnosticReport('corridor_ns');

console.log('\nTesting corridor_nsew structure:');
printDiagnosticReport('corridor_nsew');
