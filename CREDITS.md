# Brain Fog v0.6.5 — Credits

Models are free to download; attribution remains required for CC BY assets. No Silent Hill game assets are included.

| ID | Model and source | Author | License |
|---|---|---|---|
| 01 | [Abandoned House](https://sketchfab.com/3d-models/abandoned-house-a0c01ce35a474545b805c0739806aace) | Sengchor | CC BY 4.0 |
| 02 | [Abandoned House](https://sketchfab.com/3d-models/abandoned-house-76678173760042c7aab7a8dd2666b3b0) | Leon.com | CC BY 4.0 |
| 03 | [Suburban shabby house low poly](https://sketchfab.com/3d-models/suburban-shabby-house-low-poly-f4678340de204c829e79a01f216e1be0) | Simlion | CC BY 4.0 |
| 04 | [Abandoned Weapon Shop](https://sketchfab.com/3d-models/abandoned-building-shop-old-house-0ed14367314946b298d9a58db66da040) | YadroGames | CC BY 4.0 |
| 05A | [Old American Brick Building with Shop](https://sketchfab.com/3d-models/low-poly-old-american-brick-building-with-shop-3170993b67ee4e58b27d69d5877f71bd) | Orzechu | CC BY 4.0 |
| 05B | [Low Poly Antique Shop](https://sketchfab.com/3d-models/low-poly-antique-shop-free-download-8b0d4ce8f9d143518154e61ce25d305a) | JonParrish | CC BY 4.0 |
| 06 | [Warehouse FBX Model Free](https://sketchfab.com/3d-models/warehouse-fbx-model-free-daa7fd3ff88945298d00045ca40a4c03) | Nicholas-3D | CC BY 4.0 |
| 07 | [Fire Station No. 1](https://sketchfab.com/3d-models/fire-station-no-1-87edf04deb28434993274d9f05070865) | CommonSpence | CC BY 4.0 |
| 08 | [Guard Booth with interior](https://sketchfab.com/3d-models/guard-booth-with-interior-181cd7b921c14f70ba5b64d3f4fdd8db) | castleonsandYT | CC BY 4.0 |
| 09 | [Old Lighthouse](https://sketchfab.com/3d-models/old-lighthouse-19e1ff049db74dc8b6173976417c1048) | Nirved Kamble | CC BY 4.0 |
| T1 | [Transformer Booth](https://sketchfab.com/3d-models/transformer-booth-lowpoly-9d9a74a55f384b6cb80f7453e951f6c8) | SΛNDRIK | CC BY 4.0 |
| OAK | [Mighty Oak Trees](https://sketchfab.com/3d-models/mighty-oak-trees-4f6ab5594a8a415aba3f958682b9ced5) | Jagobo | CC BY 4.0 |
| LAMP | [Rusty Streetlight](https://sketchfab.com/3d-models/rusty-streetlight-d75f8d8a26054e3584f55eb07644801a) | barbodoji | CC BY 4.0 |
| X2 | [Fir Tree 01](https://polyhaven.com/a/fir_tree_01) | Rico Cilliers (model), Rob Tuytel (photos) | CC0 |

CC BY 4.0: https://creativecommons.org/licenses/by/4.0/
CC0: https://creativecommons.org/publicdomain/zero/1.0/

Changes: source transforms baked, meshes merged by material, uniform scaling, cold material tint, nonessential ground planes removed. Oak trees separated into three variants; bench extracted from 05B. Fir Tree 01 B rebuilt from original geometry with original UVs. Geometry simplified with meshoptimizer. Oak foliage uses a sampled set of complete, enlarged leaf cards. Textures resized to 512–1024 and repacked; unused images removed. All referenced UV channels retained.

Additional Poly Haven CC0 models carried over from v0.5.0:
- covered_car: https://polyhaven.com/a/covered_car
- metal_trash_can: https://polyhaven.com/a/metal_trash_can
- trashbag: https://polyhaven.com/a/trashbag
- modular_chainlink_fence: https://polyhaven.com/a/modular_chainlink_fence
- garden_gloves_01: https://polyhaven.com/a/garden_gloves_01
- cardboard_box_01: https://polyhaven.com/a/cardboard_box_01

PBR surface data carried over from v0.5.0: Poly Haven, CC0 (embedded in materials.js):
- https://polyhaven.com/a/worn_asphalt
- https://polyhaven.com/a/worn_brick_wall
- https://polyhaven.com/a/damaged_plaster
Three.js r160.1: MIT; see Three-LICENSE.txt.
Manrope: SIL Open Font License; see Manrope-LICENSE.txt.
Effects: original procedural Web Audio wind, rain, thunder, metal noises and footsteps.
Music: user-supplied horror-music-pack.zip, tracks «Иллюзия» and «Трава». Music is not represented as CC0 or covered by the model licenses. Original supplied MP3 bytes are preserved; see music-manifest.json. Controller adapted to English controls and embedded sources.

New handheld flashlight: [Flashlight by Glitch5970](https://sketchfab.com/3d-models/flashlight-8c82abdd1f394d2f8ac3c1a843796b4a), CC BY 4.0. Texture repacking and uniform scaling.

Puddles: original simple mesh geometry and water material, no third-party asset required.
Build-time meshoptimizer by Arseny Kapoulkine, MIT, https://github.com/zeux/meshoptimizer. Not required at game runtime.

Version 0.6.2 building repair: rebuilt from original v0.6.0 inputs using LockBorder simplification at normalized error 0.0005, without Permissive or Prune. Original boundaries, UVs and detached architectural pieces are protected. No new commercial models or paid assets were added.


## v0.6.3 additions

User-supplied compositions: «Марш.mp3» and «Фантазия.mp3». Embedded derivatives use constant loudness gain and short edge fades; no tempo or pitch changes. See music-manifest.json for the exact processing and hashes. The new grass geometry, pause map, shader changes and procedural sound effects were authored for this version.

## v0.6.4 electrical recording

[Electricity Sound Effects](https://opengameart.org/content/electricity-sound-effects) by **digitl / Erich Izdepski**, licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Original file: electricFX.mp3. Excerpt 0.08–2.18 seconds, converted to mono 24 kHz PCM, adjusted gain and 15 ms edge fades. Its measured amplitude controls the flashlight flicker. See sound-manifest.json. House 02 is no longer loaded or placed; its bundled source retains its original attribution.

## v0.6.5 changes

Diffuse streetlight halo rendering and rain adjustments authored for this version. The glove is no longer instantiated in the player view; its bundled source attribution is retained. No new third-party assets were added.

## Approved terrain materials — v0.6.12

All CC0, https://polyhaven.com/license. Original 1K diffuse and OpenGL normal maps embedded unchanged. Runtime blending/tinting in terrain.js.

- Leafy Grass — Charlotte Baglioni — https://polyhaven.com/a/leafy_grass
- Sparse Grass — Amal Kumar — https://polyhaven.com/a/sparse_grass
- Grass Path 2 — Rob Tuytel — https://polyhaven.com/a/grass_path_2

User approved this combination on 12 September 2026. Download URLs and SHA-256 are recorded in terrain-sources.json.

## Fairheaven emergency vehicle — v0.6.17

[Fairheaven SW 80 Fire Dept. - Low Poly Model](https://sketchfab.com/3d-models/fairheaven-sw-80-fire-dept-low-poly-model-0cd661aaab6949ba9d77dbb13ab146c5) by **Daniel Zhabotinsky**, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Official Sketchfab GLB download, 12 September 2026. Modified: original closed geometry restored in v0.6.17, including all windshield pillars; all texture dimensions reduced to one third; static parts batched; animated red lamps, headlights and exhaust added. Original author does not endorse this game.

Audio files supplied by the user: `soundreality-short-circuit-154595.mp3` (3–4 s excerpt, 0.5 s fades) and `engine2.mp3` (decoded AAC, loop crossfade). Provenance and processing recorded in sound-manifest.json.

Footsteps supplied by the user, 13 September 2026: ground.mp3, asphalt.mp3, grass.mp3. Six individual steps per surface extracted, normalized with peak headroom, faded at edges and encoded as mono 24 kHz PCM. Processing and source excerpts: footstep-manifest.json.

## Дополнения v0.6.19

- grass2.mp3 — предоставлен пользователем; используется только для шагов по траве. Шесть обработанных фрагментов включены в архив; происхождение и контрольные суммы — footstep-manifest.json.
- Картонные коробки, их процедурная поверхность, маска конденсата и контуры луж созданы в коде проекта; сторонние текстуры для них не скачивались.
- Общая плоская проекция отражений адаптирована по Three.js Reflector, MIT, © three.js authors. Лицензия — Three-LICENSE.txt. https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/Reflector.js

## Fogged v0.6.20 interface font

Liberation Mono Regular/Bold — digitized data © 2010 Google Corporation; © 2012 Red Hat, Inc. SIL Open Font License 1.1. Unmodified fonts from the bundled LibreOffice distribution. Copyright and full license: LiberationMono-LICENSE.txt. Upstream: https://github.com/liberationfonts/liberation-fonts

The approved puddle study material was integrated into the existing terrain with a shared atlas and shared planar reflection (Three.js Reflector approach, MIT; see Three-LICENSE.txt).

## Current interface font — v0.6.22

DotGothic16 Regular, supplied by the user. Copyright 2020 The DotGothic16 Project Authors (https://github.com/fontworks-fonts/DotGothic16). SIL OFL 1.1, full license in DotGothic16-OFL.txt. Original TTF included without modification. Supersedes Liberation Mono in the visible interface.


## Street props added in v0.6.27

- Concrete Road Barrier 02 — Amal Kumar, [Poly Haven](https://polyhaven.com/a/concrete_road_barrier_02), CC0. Author LOD2; textures 1024 → 341 px.
- Large Iron Gate — Josh Dean, [Poly Haven](https://polyhaven.com/a/large_iron_gate), CC0. Coplanar cleanup, both leaves rotated 100° on their hinges; textures 1024 → 341 px.
- Water Manhole Cover — Raunox, [Poly Haven](https://polyhaven.com/a/water_manhole_cover), CC0. Coplanar cleanup; textures 1024 → 341 px.
- Tree Stump 01 — Rob Tuytel, [Poly Haven](https://polyhaven.com/a/tree_stump_01), CC0. Mesh reduction to 30%; textures 1024 → 341 px.
- Dead Tree Trunk 02 — Jenelle van Heerden / Rico Cilliers, [Poly Haven](https://polyhaven.com/a/dead_tree_trunk_02), CC0. Author LOD3; textures 1024 → 341 px.
- Bicycle Collection Free — Nicholas-3D, [Sketchfab source](https://sketchfab.com/3d-models/bicycle-collection-free-980b7f6ddcfb434cbd347d919ddbef06), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Only BicycleBroken and its two wheels retained; world scale normalized; coplanar cleanup; textures 1024 → 341 px. Original detached-wheel arrangement and spokes retained. No endorsement implied.

Forest fence uses the previously credited Poly Haven modular_chainlink_fence. All new meshes use shared geometry and textures across copies, standard frustum culling and existing scene lighting; no additional light sources.


## v0.6.28 adjustments

Fogged UI Regular is a modified version of the user-supplied DotGothic16 (SIL OFL 1.1; see DotGothic16-OFL.txt). Cyrillic glyphs now share the 500-unit advance of Latin glyphs; outlines fit the same horizontal cell while vertical metrics are retained. The modified font is renamed Fogged UI. The original font is retained.

Warehouse: the existing credited model and all four 1024px texture maps are retained; only four shutter triangles removed. Original floor, interior structure, jambs and roof remain.

Station window reflection adapts the existing Three.js Reflector-based puddle pass to a vertical plane; one shared 256×144 target, capped at 12 updates/second, rendered only while the facade is nearby and visible.

## Corn old — кукурузное поле (v0.6.29)
- Автор: **DisoftGD**, загрузивший: **Frice**.
- Источник: https://sketchfab.com/3d-models/corn-old-7e5ea415942a44b1b6de2e6c3bd05955
- Лицензия: CC BY-NC 4.0 — https://creativecommons.org/licenses/by-nc/4.0/ . Только некоммерческое использование с указанием автора. Пометка NoAI сохранена.
- Изменения: объединение частей без потери треугольников, текстуры 256×1024 → 128×512, масштаб, процедурное движение. Исходная лицензия: assets/corn-old-license.txt.
