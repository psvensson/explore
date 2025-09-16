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

## Third-Party Attribution
This project includes code from:
- LingDong Huang's ndwfc (https://github.com/LingDong-/ndwfc) — files: `docs/renderer/ndwfc.js`, `docs/renderer/ndwfc-tools.js` (MIT, see `docs/renderer/ndwfc-LICENSE`).

## License
MIT (project code). See `docs/renderer/ndwfc-LICENSE` for third-party component licensing.