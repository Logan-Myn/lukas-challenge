import * as THREE from 'three';

// Blender startup scene in three.js axes (Blender x,y,z → three x,z,-y).
export function createDefaultScene() {
  const group = new THREE.Group();

  const grid = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uOpacity: { value: 1 } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `
      varying vec3 vW; uniform float uOpacity;
      float line(vec2 p, float s){ vec2 g = abs(fract(p/s - .5) - .5) / fwidth(p/s); return 1. - min(min(g.x, g.y), 1.); }
      void main(){
        vec2 p = vW.xz;
        float fade = 1. - smoothstep(12., 60., length(cameraPosition.xz - p) * .6 + length(p) * .4);
        float g1 = line(p, 1.) * .35, g10 = line(p, 10.) * .55;
        vec3 col = vec3(.33);
        float a = max(g1, g10);
        float ax = 1. - min(abs(p.y) / fwidth(p.y), 1.);
        float ay = 1. - min(abs(p.x) / fwidth(p.x), 1.);
        col = mix(col, vec3(.76, .27, .31), ax); a = max(a, ax * .9);
        col = mix(col, vec3(.50, .64, .23), ay); a = max(a, ay * .9);
        gl_FragColor = vec4(col, a * fade * uOpacity);
      }`,
  }));
  grid.rotation.x = -Math.PI / 2;
  grid.renderOrder = -1;
  group.add(grid);

  const cube = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.6 }));
  cube.name = 'Cube';
  group.add(cube);

  const wire = new THREE.LineBasicMaterial({ color: 0x000000 });
  const camGizmo = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cameraPyramid()), wire);
  camGizmo.position.set(7.36, 4.96, 6.93);
  camGizmo.lookAt(0, 0, 0);
  group.add(camGizmo);

  const lamp = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lampGizmo()), wire);
  lamp.position.set(4.08, 5.9, -1.0);
  group.add(lamp);

  return {
    group, cube,
    update(v) {
      cube.visible = v.cube > 0.001;
      cube.scale.setScalar(Math.max(v.cube, 0.001));
      grid.material.uniforms.uOpacity.value = v.overlays;
      camGizmo.visible = lamp.visible = v.overlays > 0.5;
    },
  };
}

function cameraPyramid() {
  const s = 0.5, d = -1.0, P = THREE.Vector3; // +z faces the lookAt target
  const o = new P(0, 0, 0), c = [new P(-s, -s * .56, -d), new P(s, -s * .56, -d), new P(s, s * .56, -d), new P(-s, s * .56, -d)];
  const tri = [new P(-s * .5, s * .66, -d), new P(s * .5, s * .66, -d), new P(0, s * 1.05, -d)];
  return [o, c[0], o, c[1], o, c[2], o, c[3], c[0], c[1], c[1], c[2], c[2], c[3], c[3], c[0], tri[0], tri[1], tri[1], tri[2], tri[2], tri[0]];
}

function lampGizmo() {
  const pts = [], r = 0.18, P = THREE.Vector3;
  for (let i = 0; i < 24; i++) {
    const a0 = (i / 24) * Math.PI * 2, a1 = ((i + 1) / 24) * Math.PI * 2;
    pts.push(new P(Math.cos(a0) * r, Math.sin(a0) * r, 0), new P(Math.cos(a1) * r, Math.sin(a1) * r, 0));
  }
  pts.push(new P(0, 0, 0), new P(0, -5.9, 0));
  return pts;
}
