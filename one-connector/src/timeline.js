export const BPM = 120;
export const BEAT = 60 / BPM;
export const DURATION = 15;
export const FPS = 60;
export const BEATS = 30;
export const beatTime = b => b * BEAT;

export const clamp01 = x => Math.min(1, Math.max(0, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const prog = (t, t0, t1) => clamp01((t - t0) / (t1 - t0));

export const ease = {
  linear: x => x,
  outCubic: x => 1 - (1 - x) ** 3,
  inOutCubic: x => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2),
  outExpo: x => (x >= 1 ? 1 : 1 - 2 ** (-10 * x)),
  inOutExpo: x => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 2 ** (20 * x - 10) / 2 : (2 - 2 ** (-20 * x + 10)) / 2),
  outBack: x => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2,
};

export const PROMPTS = [
  { text: 'Delete the cube. Build me a city.', typeFrom: 0.1, typeTo: 0.9, send: 2, tool: 3,
    code: ['bpy.data.objects.remove(bpy.data.objects["Cube"])', 'for x, y, h in lots:',
           '    add = bpy.ops.mesh.primitive_cube_add', '    add(location=(x, y, h / 2))'] },
  { text: 'Make it night. Light the windows.', typeFrom: 5.0, typeTo: 5.42, send: 11, tool: 11,
    code: ['scene.world.color = (0.01, 0.01, 0.012)', 'glass.inputs["Emission Strength"].default_value = 4.0'] },
  { text: 'Fly the camera through it.', typeFrom: 8.0, typeTo: 8.38, send: 17, tool: 17,
    code: ['cam.constraints.new("FOLLOW_PATH").target = avenue', 'cam.data.dof.use_dof = True'] },
  { text: 'Top view.', typeFrom: 11.0, typeTo: 11.22, send: 23, tool: 23,
    code: ['bpy.ops.view3d.view_axis(type="TOP")'] },
];

export const CUES = [
  { beat: 0, kind: 'open' }, { beat: 2, kind: 'send' }, { beat: 3, kind: 'tool' }, { beat: 4, kind: 'delete' },
  ...[5, 6, 7, 8, 9].map((beat, step) => ({ beat, kind: 'rise', step })),
  { beat: 11, kind: 'send' }, { beat: 12, kind: 'night' },
  ...[13, 14, 15].map((beat, step) => ({ beat, kind: 'windows', step })),
  { beat: 17, kind: 'fly' }, { beat: 23, kind: 'top' }, { beat: 28, kind: 'resolve' },
];
