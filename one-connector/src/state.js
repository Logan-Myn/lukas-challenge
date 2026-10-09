export const STARTUP_CAM = { pos: [10.9, 7.9, 10.9], target: [0, 0, 0], fov: 44, ortho: false, orthoHeight: 0 };

export function stateAt(t) {
  return {
    t,
    view: { mode: 'solid', cube: 1, cubeSelected: true, rise: 0, windows: 0, dof: 0, overlays: 1, camera: STARTUP_CAM },
  };
}
