# Validation — Brain Fog v0.6.9

- All top-level JavaScript files pass `node --check`.
- `index.html` local `src` / `href` references resolve inside the project.
- Rebuilt Fire Station asset is a valid GLB 2.0 document; all embedded textures decode.
- Garage-number texture mapping was checked against the model UVs and 180° world rotation: visible player-facing order is 1 → 2 → 3 → 4 from left to right.
- Fire-station LED wash and SpotLight targets are positioned below the fixtures.
- Named constellation content contains only Cygnus / Northern Cross and no guide lines.
- Building `05A` is neither loaded nor placed.
- Lighthouse intensity is 109000 (2× v0.6.8), volumetric contribution is doubled, cone angle remains 0.1475 rad, and edge feathering is tighter.
- Flashlight base intensity is 72 (1.5× v0.6.8); volumetric scattering scales with that increase.
- Rain drop dimensions are increased.
- Lightning waveform contains two rapid bright pulses.

Visual WebGL browser inspection was not performed in this execution environment; checks above are structural and code-level.
