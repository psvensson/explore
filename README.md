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

## Third-Party Attribution
This project includes code from:
- LingDong Huang's ndwfc (https://github.com/LingDong-/ndwfc) — files: `docs/renderer/ndwfc.js`, `docs/renderer/ndwfc-tools.js` (MIT, see `docs/renderer/ndwfc-LICENSE`).

## License
MIT (project code). See `docs/renderer/ndwfc-LICENSE` for third-party component licensing.