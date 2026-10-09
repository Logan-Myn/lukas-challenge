export const STARTUP_CAM = { pos: [10.9, 7.9, 10.9], target: [0, 0, 0], fov: 44, ortho: false, orthoHeight: 0 };

const HERO_CAM = { pos: [17, 11, 19], target: [0, 0.8, 0], fov: 38, ortho: false, orthoHeight: 0 };
export const LOOKS = {
  solid: { mode: 'solid', cube: 0, cubeSelected: false, rise: 1.25, windows: 0, dof: 0, overlays: 1, camera: HERO_CAM },
  night: { mode: 'rendered', cube: 0, cubeSelected: false, rise: 1.25, windows: 1.3, dof: 0, overlays: 0, camera: HERO_CAM },
  street: { mode: 'rendered', cube: 0, cubeSelected: false, rise: 1.25, windows: 1.3, dof: 1, overlays: 0,
            camera: { pos: [6.2, 0.55, 9.0], target: [0.5, 1.1, 0], fov: 50, ortho: false, orthoHeight: 0 } },
  top: { mode: 'rendered', cube: 0, cubeSelected: false, rise: 1.25, windows: 1.3, dof: 0, overlays: 0,
         camera: { pos: [0, 0, 0], target: [0, 0, 0], fov: 0, ortho: true, orthoHeight: 38 } },
};
const lookParam = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('look') : null;

export function stateAt(t) {
  if (lookParam && LOOKS[lookParam]) return { t, view: LOOKS[lookParam] };
  return {
    t,
    view: { mode: 'solid', cube: 1, cubeSelected: true, rise: 0, windows: 0, dof: 0, overlays: 1, camera: STARTUP_CAM },
  };
}
