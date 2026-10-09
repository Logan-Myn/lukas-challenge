# "One Connector" — Claude × Blender, 15s film

## Brief
- Challenge theme: "one connector for Claude". Entry for Luka's newsletter poll (7 entrants, results Monday).
- Deadline: tonight (2026-10-09).
- Connector: Blender (Claude drives Blender's Python API through the connector).
- No restraint on craft or sound. Everything shown must be something the real connector can do,
  and everything happens inside Blender — no abstract metaphors outside it.

## Deliverable
- `out/film.mp4`: 1920×1080, 60 fps, exactly 15.0 s (900 frames), H.264 yuv420p CRF 16,
  AAC audio at -14 LUFS integrated.

## Concept
A faithful, code-built recreation of Blender (dark theme) with Claude's chat docked on the left.
The user asks, Claude calls the Blender connector, Blender reacts on the beat. A "motion camera"
over the whole UI pushes into the chat when a prompt is typed and whips to the viewport when the
result lands, so all text is large in frame. Claude builds a city; the final top view reveals the
city's footprint is Claude's spark.

Presentation style: a product-launch overview, not a screen recording. The Blender window and the
Claude window float side by side on a dark stage with soft depth; during whips they tilt slightly
in 3D. The motion camera isolates regions (chat, viewport, Outliner) like a keynote walkthrough.
The Blender UI is the real Blender 5 layout, referenced from official blender.org screenshots,
cleaned and enlarged for readability. No callout labels (corner labels are banned).

## Beat map (120 BPM, beat b at t = b × 0.5 s, b = 0…29)
| Beats | Time | Frame |
|---|---|---|
| b0–b2 | 0.0–1.5 | Blender startup scene: default cube (orange selection outline), camera, light. Motion camera pushed toward the chat. Prompt 1 types: "Delete the cube. Build me a city." Sent on b2. |
| b3 | 1.5 | Claude's reply: a Blender tool-call card with 3 lines of real bpy code. |
| b4 | 2.0 | Whip to viewport. Cube deleted (pop), "Cube" row leaves the Outliner. |
| b5–b9 | 2.5–5.0 | Towers rise ring by ring from the center, one ring per beat. Outliner floods `Tower.001 … Tower.NNN`; viewport overlay text "(1) Collection \| Tower.NNN" counts up (NNN = final generated tower count). Slow orbit. |
| b10–b11 | 5.0–6.0 | Push to chat. Prompt 2: "Make it night. Light the windows." |
| b12 | 6.0 | Whip to viewport. Viewport shading switches Solid → Rendered (header button state changes), world goes dark. |
| b13–b15 | 6.5–8.0 | Windows light in an orange wave, one wave front per beat. |
| b16 | 8.0 | Push to chat. Prompt 3: "Fly the camera through it." |
| b17–b21 | 8.5–11.0 | Viewport enters camera view (Blender's dark passepartout), UI slides away, full-frame fly-through between towers. |
| b22 | 11.0 | UI slides back. Prompt 4: "Top view." |
| b23–b27 | 11.5–14.0 | Snap to Top Orthographic (overlay label "Top Orthographic"). Footprint reads as Claude's spark. Slow push. |
| b28–b29 | 14.0–15.0 | End card over the dimmed top view: "One connector." + Claude spark (orange) × Blender logo (monochrome cream). Left-aligned, not centered. |

Timings inside a beat window may be tuned during the contact-sheet loop; hits stay on beats.

## Look
- Palette tokens: background `#141414`, Blender panels `#1D1D1D`/`#2B2B2B`/`#303030`,
  viewport `#3D3D3D`, text `#F0EEE6`, single accent Claude orange `#D97757`.
- Blender-native exception: grid floor X/Y axis lines (red/green) and the navigation gizmo keep
  their colors, desaturated. They are authenticity cues, not accents. No Blender blue anywhere else
  (selection uses orange, as Blender does).
- Faces: display = Instrument Serif (end card only). UI = Geist, with Geist Mono for code —
  one superfamily counts as the one UI face. All fonts bundled locally.
- Viewport: Solid mode = matte grey, studio-style key + fill. Rendered mode = dark world, emissive
  orange windows, moonlit night. Bloom only on windows/streetlights in Rendered mode, never on UI.
- Banned (CLAUDE.md): centered title on gradient, everything fading in, corner labels/frame borders,
  glow on UI chrome, generic particle bursts. Motion is pushes, whips, pops and rises — not fades.

## City quality bar
The city is the hero; "columns in three.js" is a failure. Target: reads like an EEVEE render.
- Architecture (procedural, seeded): towers with setbacks/tiers, podium bases, recessed window
  grids (shader with inset normals + per-window variation), rooftop units, water tanks, antennas,
  a few landmark towers taller than the rest.
- Ground: street grid with roads, sidewalks, lane markings, streetlights, trees in plazas,
  moving cars (headlight/taillight streaks at night).
- Rendering: soft sun shadows, GTAO ambient occlusion, distance haze, bloom on windows and
  streetlights only, depth of field during the fly-through, AgX tone mapping (Blender's default).
- Spark footprint: city blocks inside the spark mask get towers; blocks outside are low ground
  (dark plazas/parks, streets only) so the silhouette reads from above, and at night only the
  spark blocks are lit.
- All emissive light (windows, streetlights, car lights) is cream or the orange accent — no red/blue.
- Solid mode stays authentically Blender (matte grey studio shading) but the geometry detail
  carries it.
- Look-dev gate: before building anything else, render one full-quality still of the night city
  (and one Solid-mode still). The user approves the look before the rest is built.

## Authenticity details
- Blender: top bar (File Edit Render Window Help + workspace tabs), viewport header with shading
  buttons, top-left overlay text, 3D cursor at origin, navigation gizmo, Outliner, Properties.
- Claude: dark chat panel, user bubbles, assistant spark avatar, tool-call card labelled with the
  connector name "Blender" and the Python it sends. No invented tool names.
- Code shown is valid bpy (e.g. `bpy.data.objects.remove(...)`, `bpy.ops.mesh.primitive_cube_add(...)`,
  `scene.shading`/world/emission settings, camera keyframes, `view3d.view_axis(type='TOP')`).
- Spark footprint comes from the official Claude spark artwork (SVG rasterised to a cell grid).
  Blender logo from blender.org, monochrome.

## Architecture
Single page, pure function of time: `window.seek(t)` paints frame t. No CSS transitions,
no setTimeout, no requestAnimationFrame in render mode, no state carried between frames,
seeded noise only (mulberry32).

| File | Responsibility |
|---|---|
| `index.html` | 1920×1080 stage: three.js canvas under the DOM UI. `?preview` adds a scrubber + rAF playback (preview only). |
| `src/main.js` | Boot (fonts, assets), `window.seek(t)` dispatcher, preview controls. |
| `src/timeline.js` | BPM, beat helpers, cue list (shared with the audio script), easing. Pure ESM, no DOM. |
| `src/rng.js` | mulberry32. |
| `src/spark.js` | Rasterise the spark SVG into a grid mask → tower cells with seeded heights. |
| `src/scene/viewport.js` | three.js scene: grid/axes, default cube/camera/light, Solid/Rendered states, lighting. |
| `src/scene/city.js` | Seeded building generator (tiers, podiums, rooftop props), streets, streetlights, trees, cars; window shader with reveal/lighting uniforms driven by t. |
| `src/scene/post.js` | GTAO, bloom (windows/streetlights only), DOF, AgX tone mapping. |
| `src/scene/cameraPath.js` | Viewport camera as a function of t: orbit, fly-through spline, top ortho blend. |
| `src/ui/blender.js` | Blender DOM chrome; Outliner/overlay/header state derived from t. |
| `src/ui/claude.js` | Claude chat DOM; typed prompts, bubbles, tool-call cards derived from t. |
| `src/ui/framing.js` | Motion camera over the whole UI (CSS transforms from t), UI slide-away, end card. |
| `audio/score.mjs` | Synthesises score + SFX in Node from the shared cue list → `out/score.wav`; writes `beats.json`. |
| `render.mjs` | Local static server + puppeteer-core (system Chrome) → seek every frame → PNG → ffmpeg (H.264 yuv420p CRF 16) → two-pass loudnorm to -14 LUFS → mux `out/film.mp4`. |
| `contact.mjs` | One frame per beat → 6×5 contact sheet `out/contact.png`. |

## Sound (all synthesised, seeded noise)
- Bed: 120 BPM soft kick + muted hats, sub bass on the root.
- Typing: short filtered-noise clicks per typed character; send = soft pop.
- Cube delete (b4): low thump. Tower rings (b5–b9): plucks ascending the scale, stacking a chord.
- Night (b12): low drop + filter sweep. Windows (b13–b15): shimmering arpeggio per wave.
- Fly-through (b17–b21): driving beat + air whoosh. Top view (b23): heavy hit with long tail.
- End card (b28): chord resolves.
- Every hit sits on a beat in `beats.json`.

## Quality loop (CLAUDE.md)
1. Render the contact sheet, look at it.
2. Score 1–10: hook in first 2 s, readability at phone size, motion quality, variety,
   brand accuracy, sound sync.
3. Fix the 3 worst problems; repeat until every score is 8+.
4. Then the full render.

## Tests (important behaviour only)
- Determinism: seek(t₁) → hash, seek(t₂), seek(t₁) → same hash, for several t including out-of-order.
- Beat sync: every audio cue time is on the `beats.json` grid (±1 ms).
