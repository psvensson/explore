# My Dungeon Web
Web-based experimental dungeon + wave function collapse (WFC) playground built with vanilla HTML, CSS, ES modules, and Three.js. Designed to deploy directly from the `docs/` folder (GitHub Pages compatible) without a build step.

## Current Structure

```
docs/
    index.html          # Entry point (includes import map + ordered script tags)
    styles/             # CSS (main.css)
    ui/                 # UI layer (ui.js)
        renderer/           # Three.js renderer only
        renderer.js
        dungeon/            # Dungeon logic + NDWFC integration + tileset
            dungeon.js
            tileset.js        # 3D voxel tileset registering with NDWFC3D
            ndwfc.js          # Third-party (LingDong-/ndwfc)
            ndwfc-tools.js    # Third-party (LingDong-/ndwfc)
            ndwfc-LICENSE     # License for the above
tests/                # Jest tests (renderer, ui, dungeon)
package.json          # Jest + ESM config
jest.config.js
README.md
```

## Key Components
- Renderer (`docs/renderer/renderer.js`): Sets up Three.js scene with mandatory OrbitControls.
    - Supporting modules now factor concerns:
        - `openness.js` (stair clearance heuristics)
        - `ascii.js` (debug ASCII generation)
        - `wfc_rules.js` (adjacency rule builder + diagnostics)
        - `constants.js` (shared numeric + token constants)
- Tileset (`docs/dungeon/tileset.js`): Defines 3×3×3 voxel tiles and registers them with the NDWFC engine.
- NDWFC (third-party): Loaded locally (`docs/dungeon/ndwfc.js`, `docs/dungeon/ndwfc-tools.js`) before tileset initialization.
- UI (`docs/ui/ui.js`): Minimal controls (generate button) + DOM wiring.
- Dungeon (`docs/dungeon/dungeon.js`): Placeholder grid-based generator.

## Running
Open `docs/index.html` directly in a modern browser (module + import map support required). No bundler or dev server is needed.

## Testing
Run the Jest suite (ESM mode):
```
npm test
```

## Development Notes
- Fail-fast philosophy: Scripts assume required globals / DOM elements exist; missing prerequisites should throw early.
- Import map pins Three.js + OrbitControls for clean module specifiers.
- `tileset.js` will throw if `NDWFC3D` (from `ndwfc.js`) isn't loaded first—`index.html` orders scripts accordingly.
 - Adjacency rule logic is centralized in `wfc_rules.js` and covered by `rules_snapshot.test.js` to detect unintended constraint drift.

## Directional Stairs, Clear Volume & Openness Constraints
The legacy two‑piece lower/upper stair pairing has been replaced by four *directional* stair prototypes (no rotations) to allow more precise Wave Function Collapse (WFC) adjacency control and guarantee usable landings. A dedicated "open landing" prototype supplements them to satisfy a stricter forward clearance requirement ("clear volume"):

| Prototype | Axis | Dir | Meaning |
|-----------|------|-----|---------|
| `tileId 31` | `z` | `+1` | Ascends toward +Z (landing in +Z direction) |
| `tileId 32` | `z` | `-1` | Ascends toward -Z |
| `tileId 33` | `x` | `+1` | Ascends toward +X |
| `tileId 34` | `x` | `-1` | Ascends toward -X |
| `tileId 50` | n/a | n/a | Open landing (solid floor; empty mid layer boundary row + open top center) |

Each stair prototype carries `meta: { role:'stair', axis:'x'|'z', dir: +1|-1 }`.

### Dual Openness & Clear Volume Rule
During rule generation (see `docs/renderer/renderer.js`), for every stair tile we enforce traversability on *both* sides along its travel axis using two escalating heuristics:
1. **Forward (landing) side – Clear Volume**: The neighbor in the `dir` direction must satisfy the "clear volume" test: (a) the entire middle boundary row (y=1 along the touching face) is empty and (b) the top-center voxel (y=2, center of that face) is also empty. This prevents a ceiling or narrow overhang from forming directly at the top of the stairs.
2. **Backward (entry/bottom) side – Middle Face Open**: The neighbor opposite `dir` must have an empty middle boundary row (y=1) at the touching face. A head clearance check is not required for the entry.

If a neighbor fails its respective openness test, the corresponding adjacency rule is simply omitted (WFC never places an obstructing tile there). This pruning eliminates walls immediately in front of stair landings while remaining permissive behind the stair.

The stair prototype geometry doesn't have to be hollow on both faces; only the forward landing area is structurally open. The openness requirement applies to *neighbor* tiles. The dedicated landing (`tileId 50`) guarantees at least one valid forward candidate for every stair orientation under the stricter clear volume heuristic.

### Vertical Compatibility
Current vertical stacking is permissive (stairs do not require paired upper/lower pieces). Mesh logic suppresses redundant floors/ceilings directly above/below stair portals to avoid clipping.

### Horizontal Isolation
Stair tiles are deliberately prevented from being horizontally adjacent to one another (no stair–stair contact along X or Z). This avoids cramped or merged stair wells and guarantees a clear landing buffer around every stair entrance and exit. The WFC rule builder omits lateral rules when both prototypes are stairs, and `stair_no_horizontal_adjacency.test.js` enforces this invariant.

### Solid Floor Requirement (Current Design)
All stair tiles now include a fully solid floor layer (every voxel with y=0 is `1`). This ensures consistent navigation, lighting, and shadow behavior, and simplifies physics / collision assumptions. The stair geometry and step meshes sit above that slab visually. Future variants (e.g. floating or grate stairs) can relax this by introducing new prototypes; tests (`stair_solid_floor.test.js`) lock the present invariant.

### Tests Covering Behavior
- `stair_rule_openness.test.js` – Validates that directional stair prototypes have forward openness and that suitable neighbor candidates exist for both forward and backward sides.
- `stair_clear_volume.test.js` – Ensures at least one non-stair neighbor satisfies the stricter clear volume forward requirement for each stair orientation (landing tile coverage).
- `stair_no_horizontal_adjacency.test.js` – Prevents lateral stair clustering.
- `stair_solid_floor.test.js` – Locks in solid floor invariant.
- `stair_clearance.test.js` / `stair_vertical_constraint.test.js` – Additional openness & legacy vertical behavior.

### Future Extensions
Potential improvements:
- Multi-height stair segments (extend to 2+ tile vertical runs).
- Landing tiles with larger clear areas validated by additional emptiness checks.
- Probabilistic weighting to bias straight vs. turning stair runs.
- Support for diagonal or spiral variants via additional directional prototypes.

## Recent Architectural Enhancements
To improve readability, maintainability, and reusability, several refactors were performed (all non‑breaking and test‑covered):

### Modular Renderer & Mesh Pipeline
- `docs/renderer/wfc_tile_mesh.js` was decomposed; bulky shared geometry/material logic moved out.
- `docs/renderer/mesh_factories.js` centralizes:
    - `makeGeometryFactory(THREE)` – lazy cube geometry caching per dimension key.
    - `makeMaterialFactory(THREE)` – caching of `MeshStandardMaterial` instances by color.
    - `getMaterialCache()` – direct access (used for diagnostics/tests).
    - `isAllSolid(voxels)` – fast solid-floor / solid-tile predicate.
    - `buildStairs(group, THREE)` – reusable stair step + landing slab construction (3 visible risers + base).

### Mini Viewer Refactor
`docs/renderer/mini_viewer.js` was rewritten from a long monolithic routine into small focused helpers (each ≤15 lines) such as:
- `initMini`, `addMiniLights`, `rebuildMiniScene`, `autoFrameMini`, `wireMiniInput`.
This makes selection logic, camera sync, and scene pruning easier to evolve.

### Test Additions
- `tests/mesh_factories.test.js` ensures geometry/material caching, stair construction consistency, and `isAllSolid` correctness.
- Total test count increased (now 16 suites / 35 tests) keeping refactors safe.

### Tileset Deduplication
Previous duplicate tile prototype definitions (renderer vs dungeon) were consolidated:
- Added `docs/dungeon/tileset_data.js` (pure ordered `TILE_DEFS`).
- Added `docs/dungeon/tileset_builder.js` (pure `buildTileset(defs,{register})`).
- Refactored `docs/dungeon/tileset.js` to build from data (exposes `initializeTileset`, `createTileFormLayers`, indices).
- Replaced `docs/renderer/tileset.js` with a lightweight re-export shim (no definitions).
All tests updated implicitly; snapshot & invariants unaffected (still 13 prototypes, indices preserved). 

### Rationale
Centralizing factories eliminated duplicate code formerly embedded in multiple rendering modules, reduced risk of drift when tweaking materials or geometry, and keeps each function small (target: ≤15 lines) to align with the project’s readability goal.

## Probabilistic Tile Weights
Each prototype in `TILE_DEFS` may specify `meta.weight` (default `1`). These weights feed directly into the NDWFC entropy calculation, biasing selection toward more common structural fillers while keeping rarer features (stairs, landings) sparse. Current defaults:
- Core open space: heavier (4) to dominate interior volume.
- Solid cubes: moderate (2) to provide structural mass without overfilling.
- Corridor / structural variants: mixed (1–3) to diversify shapes.
- Stairs: lighter (0.8) to avoid oversaturation.
- Landing: light (0.6) – appears when needed for openness but stays rare otherwise.

Weights are surfaced through `buildRules` which now derives its `weights` array from `prototype.meta.weight`.

## Tileset Manifest & Ordering Guard
Initialization produces a manifest (`tilesetManifest()`) enumerating ordered prototype metadata plus a compact voxel `signature`. A Jest test (`tileset_ordering.test.js`) hashes this manifest to detect accidental reordering or voxel drift that would silently shift prototype indices (breaking downstream assumptions). If you intentionally change `TILE_DEFS`, update the snapshot hash in that test.

For convenient runtime inspection the manifest is exposed (when running in a browser) as `window.__TILESET_MANIFEST__` after tileset initialization.

## WFC Generation Loop Update
The previous code path expected a `model.run(maxIters)` convenience method (not present in the embedded `ndwfc.js`). Generation now explicitly:
1. Builds rules + weights.
2. Constructs the WFC core with `{ nd:3, weights, rules }`.
3. Calls `expand([0,0,0],[dims.x,dims.y,dims.z])`.
4. Iteratively invokes `step()` until collapse or an iteration cap (50k) is reached.
5. Calls `readout()` for final tile assignments.

This makes progression explicit and easier to instrument (e.g., future progress bars or cancellation hooks).

## Debugging Tips
- Inspect `window.__TILESET_MANIFEST__` to verify weights and role metadata.
- If collapse stalls, log per-step entropy or inject a soft iteration budget then resume (future enhancement).
- To experiment with distribution, tweak `meta.weight` values and re-run tests to confirm no ordering regressions.

## Third-Party Attribution
This project includes code from:
- LingDong Huang's ndwfc (https://github.com/LingDong-/ndwfc) — files: `docs/dungeon/ndwfc.js`, `docs/dungeon/ndwfc-tools.js` (MIT, see `docs/dungeon/ndwfc-LICENSE`).

## License
MIT (project code). See `docs/renderer/ndwfc-LICENSE` for third-party component licensing.