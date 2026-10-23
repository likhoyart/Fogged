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
