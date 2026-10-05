# Assets

Craterfall ships **no image or audio files**: every texture is painted at boot
(`src/game/rendering/textures.ts`, `BackgroundRenderer.ts`, `TerrainRenderer.ts`)
and every sound is synthesised with the Web Audio API (`src/game/audio/`).

If you add assets, put them here and only use files you have the rights to
distribute (your own work, CC0, or a compatible licence). Files in `public/`
are copied to the build as-is and are served relative to the Vite `base` path.
