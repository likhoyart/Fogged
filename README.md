WASD — move · Shift — run · Space — jump · Mouse — look · Esc — pause · M — mute effects.

## v0.6.9 changes

- Fire-station garage numbers now read **1 → 2 → 3 → 4 from the player’s visible left to right**. The order is corrected in the embedded source texture, accounting for the station model’s 180° placement rotation.
- Four compact LED bars remain at roughly 40–50% of each garage-bay width. Their light and visual wash are constrained below the fixtures; the upper facade is not intentionally illuminated.
- LED flicker remains grouped and follows the same electrical waveform as the player flashlight.
- The named sky pattern is now **only Cygnus / the Northern Cross**, rendered as stars without guide lines. Other named constellations and Polaris markers were removed.
- The moon is a crisp, brighter **waxing moon** with a sharp outer limb, visible curved terminator, restrained halo and subtle surface variation.
- The problematic imported building beside the ruined/shop structure in the north-east sector (`05A`) is no longer loaded or placed.
- Existing grass areas receive a secondary short lawn layer beneath the taller blades.
- Lighthouse physical intensity is doubled from `54500` to `109000`; its volumetric contribution is doubled as well, while the `0.1475` rad cone angle is retained and the penumbra is tightened for a clearer beam.
- Rain streaks and windshield droplets are larger.
- Player flashlight physical intensity is increased from `48` to `72` (1.5×), with matching volumetric brightness.
- Lightning now produces two fast bright pulses instead of one long fading flash.

## Debug inspection

Add `?debug` to the URL for location shortcuts and scene diagnostics, including fire-station gates and several lighthouse viewing distances.
