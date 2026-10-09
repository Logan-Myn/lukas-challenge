import * as THREE from 'three';
import { BLOCK, STREET } from './cityData.js';
import { clamp01, ease } from '../timeline.js';

const CREAM = new THREE.Color('#F0EEE6'); // hex strings are already converted to linear by ColorManagement
const ORANGE = new THREE.Color('#D97757');

export function createCity(data) {
  const group = new THREE.Group();
  const uniforms = { uMode: { value: 0 }, uWindows: { value: 0 } };

  // --- buildings: one instanced unit box, matrices rewritten from view.rise every frame
  const box = new THREE.BoxGeometry(1, 1, 1);
  const n = data.parts.length;
  const seedA = new Float32Array(n), kindA = new Float32Array(n), ringA = new Float32Array(n);
  data.parts.forEach((p, i) => { seedA[i] = p.seed; kindA[i] = p.kind; ringA[i] = p.ring; });
  box.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seedA, 1));
  box.setAttribute('aKind', new THREE.InstancedBufferAttribute(kindA, 1));
  box.setAttribute('aRing', new THREE.InstancedBufferAttribute(ringA, 1));
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0 });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uniforms, { uCream: { value: CREAM }, uOrange: { value: ORANGE } });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aSeed; attribute float aKind; attribute float aRing;
        varying vec3 vWPos; varying vec3 vONormal; varying float vSeed; varying float vKind; varying float vRing;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vWPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        vONormal = normal; vSeed = aSeed; vKind = aKind; vRing = aRing;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uMode; uniform float uWindows; uniform vec3 uCream; uniform vec3 uOrange;
        varying vec3 vWPos; varying vec3 vONormal; varying float vSeed; varying float vKind; varying float vRing;
        float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
        float winMask(vec2 f){ return step(.18, f.x) * step(f.x, .82) * step(.24, f.y) * step(f.y, .86); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float side = 1. - step(.5, abs(vONormal.y));
        vec2 fc = abs(vONormal.x) > .5 ? vec2(vWPos.z, vWPos.y) : vec2(vWPos.x, vWPos.y);
        vec2 cell = vKind > .5 ? vec2(.07, .1) : vec2(.028, .055);
        vec2 g = fc / cell; vec2 id = floor(g); vec2 f = fract(g);
        float aa = clamp(1.6 - max(fwidth(g.x), fwidth(g.y)) * 2.2, 0., 1.);
        float win = mix(.42, winMask(f), aa) * side * step(vKind, 1.5);
        float inset = side * aa * winMask(f) * (1. - smoothstep(.24, .34, f.y));
        float slab = side * (1. - step(.1, f.y)) * aa;
        float wall = uMode < .5 ? .78 + .08 * vSeed - .1 * slab : (.24 + .16 * vSeed) * (.55 + .45 * smoothstep(0., 1.5, vWPos.y)) * (1. - .45 * slab);
        float glass = uMode < .5 ? .62 : .035;
        diffuseColor.rgb = vec3(mix(wall, glass, win) * (1. - .35 * inset));
        float hw = h21(id + vSeed * 91.7);
        float front = uWindows * 1.3 - vRing - hw * .25;
        float floorLit = step(.82, h21(vec2(id.y, vSeed * 37.)));
        float lit = max(step(hw, .26), floorLit * step(hw, .8)) * smoothstep(0., .04, front) * uMode;
        vec3 warm = uCream * vec3(1., .84, .62);
        vec3 wcol = mix(warm, uOrange, step(.8, h21(id.yx + vSeed * 13.1))) * (.5 + .5 * h21(id * 1.7)) * (.65 + .35 * f.y);
        vec3 winEmit = wcol * lit * mix(.3 * 1.15, 1.15, aa) * win;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, .18, win * uMode);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += winEmit;`);
  };
  const buildings = new THREE.InstancedMesh(box, mat, n);
  buildings.castShadow = buildings.receiveShadow = true;
  buildings.frustumCulled = false;
  group.add(buildings);

  // --- water tanks
  const tankGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.05, 14);
  const tanks = new THREE.InstancedMesh(tankGeo, new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.7 }), data.tanks.length);
  tanks.castShadow = true; tanks.frustumCulled = false;
  group.add(tanks);

  // --- ground with streets
  const B = data.blocks;
  const blockTex = new THREE.DataTexture(Uint8Array.from(data.blockHas, v => v * 255), B, B, THREE.RedFormat, THREE.UnsignedByteType);
  blockTex.needsUpdate = true;
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
  groundMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uniforms, { uCream: { value: CREAM }, uOrange: { value: ORANGE }, uBlocks: { value: blockTex }, uMaxRing: { value: data.maxRing } });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vXZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvXZ = (modelMatrix * vec4(transformed, 1.)).xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uMode; uniform float uWindows; uniform float uMaxRing; uniform vec3 uCream; uniform vec3 uOrange;
        uniform sampler2D uBlocks; varying vec2 vXZ;
        float hasBlock(vec2 b){ return (b.x < 0. || b.y < 0. || b.x >= ${B}. || b.y >= ${B}.) ? 0. : texture2D(uBlocks, (b + .5) / ${B}.).r; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 q = fract(vXZ / ${BLOCK.toFixed(3)});
        vec2 e = min(q, 1. - q) * ${BLOCK.toFixed(3)};
        float road = 1. - step(${(STREET / 2).toFixed(3)}, min(e.x, e.y));
        float walk = (1. - step(${(STREET / 2 + 0.03).toFixed(3)}, min(e.x, e.y))) * (1. - road);
        float dash = step(.5, fract((e.x < e.y ? vXZ.y : vXZ.x) * 6.)) * (1. - step(.006, min(e.x, e.y)));
        float base = uMode < .5 ? .56 : .03;
        float c = mix(base, uMode < .5 ? .48 : .014, road) + walk * (uMode < .5 ? .05 : .02);
        diffuseColor.rgb = vec3(c);
        float mark = dash * road;
        vec2 bk = floor(vXZ / ${BLOCK.toFixed(3)} + ${B / 2}.);
        vec2 nb = bk + (e.x < e.y ? vec2(q.x < .5 ? -1. : 1., 0.) : vec2(0., q.y < .5 ? -1. : 1.));
        float adj = max(hasBlock(bk), hasBlock(nb));
        float streetD = min(e.x, e.y);
        float along = (e.x < e.y ? vXZ.y : vXZ.x) * 4.;
        float pool = .55 + .45 * smoothstep(.35, 0., abs(fract(along) - .5));
        float front = smoothstep(0., .05, uWindows * 1.3 - length(vXZ) / uMaxRing);
        float glow = adj * pool * front * uMode * (1. - smoothstep(.0, ${(STREET / 2 + 0.05).toFixed(3)}, streetD));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += uCream * mark * .2 * uMode + uOrange * glow * 1.3;`);
  };
  const SLAB = 37;
  const ground = new THREE.Mesh(new THREE.BoxGeometry(SLAB, 0.12, SLAB), groundMat);
  ground.position.y = -0.061;
  ground.receiveShadow = true;
  group.add(ground);

  // --- trees (parks outside the spark)
  const treeGeo = new THREE.IcosahedronGeometry(0.07, 1);
  const treeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 1, flatShading: true });
  const trees = new THREE.InstancedMesh(treeGeo, treeMat, data.trees.length);
  trees.castShadow = true; trees.frustumCulled = false;
  group.add(trees);

  // --- streetlights: emissive head
  const lampGeo = new THREE.SphereGeometry(0.012, 8, 6);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: CREAM, emissiveIntensity: 0 });
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, data.lights.length);
  lamps.frustumCulled = false;
  group.add(lamps);

  // --- cars: body + light streaks (head = cream front, tail = orange back)
  const carBody = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.022, 0.028), new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4 }), data.cars.length);
  const headMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: CREAM, emissiveIntensity: 0 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: ORANGE, emissiveIntensity: 0 });
  const streak = new THREE.BoxGeometry(0.05, 0.006, 0.02);
  const heads = new THREE.InstancedMesh(streak, headMat, data.cars.length);
  const tails = new THREE.InstancedMesh(streak, tailMat, data.cars.length);
  for (const m of [carBody, heads, tails]) { m.frustumCulled = false; group.add(m); }

  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  const riseScale = (front, ring) => {
    const k = clamp01((front * 1.25 - ring) / 0.22);
    return k <= 0 ? 0 : ease.outBack(k);
  };

  return {
    group,
    update(v, t) {
      uniforms.uMode.value = v.mode === 'rendered' ? 1 : 0;
      uniforms.uWindows.value = v.windows;
      const a = buildings.instanceMatrix.array;
      data.parts.forEach((p, i) => {
        const s = riseScale(v.rise, p.ring);
        const o = i * 16;
        a.fill(0, o, o + 16);
        a[o] = p.w; a[o + 5] = Math.max(p.h * s, 1e-5); a[o + 10] = p.d; a[o + 15] = 1;
        a[o + 12] = p.x; a[o + 13] = (p.y0 + p.h / 2) * s; a[o + 14] = p.z;
      });
      buildings.instanceMatrix.needsUpdate = true;
      data.tanks.forEach((p, i) => {
        const s = riseScale(v.rise, p.ring);
        tanks.setMatrixAt(i, M.compose(P.set(p.x, (p.y0 + 0.025) * s, p.z), Q.identity(), S.set(1, Math.max(s, 1e-5), 1)));
      });
      tanks.instanceMatrix.needsUpdate = true;
      const treeGrow = clamp01((v.rise - 0.9) / 0.3);
      data.trees.forEach((p, i) => {
        const s = p.s * Math.max(treeGrow > 0 ? ease.outBack(treeGrow) : 0, 1e-5);
        trees.setMatrixAt(i, M.compose(P.set(p.x, 0.07 * s, p.z), Q.identity(), S.set(s, s * 1.3, s)));
      });
      trees.instanceMatrix.needsUpdate = true;
      const night = v.mode === 'rendered' ? 1 : 0;
      treeMat.color.set(night ? 0x2c302a : 0xcccccc);
      data.lights.forEach((p, i) => {
        const on = clamp01((v.windows * 1.3 - p.ring) / 0.05) * night;
        lamps.setMatrixAt(i, M.compose(P.set(p.x, 0.07, p.z), Q.identity(), S.setScalar(on > 0 ? 1 : 1e-5)));
      });
      lamps.instanceMatrix.needsUpdate = true;
      lampMat.emissiveIntensity = 3 * night;
      const carsOn = clamp01((v.rise - 1.0) / 0.2);
      data.cars.forEach((c, i) => {
        const span = BLOCK - STREET;
        const u = ((c.phase + c.speed * t * c.dir) % 1 + 1) % 1;
        const along = (u - 0.5) * span;
        const fade = Math.min(1, u / 0.08, (1 - u) / 0.08) * carsOn;
        const lane = 0.03 * c.dir;
        const x = c.alongX ? c.x + along : c.x + lane, z = c.alongX ? c.z + lane : c.z + along;
        Q.setFromAxisAngle(UP, c.alongX ? (c.dir > 0 ? 0 : Math.PI) : (c.dir > 0 ? -Math.PI / 2 : Math.PI / 2));
        const sc = Math.max(fade, 1e-5);
        carBody.setMatrixAt(i, M.compose(P.set(x, 0.011, z), Q, S.setScalar(sc)));
        const fx = c.alongX ? c.dir : 0, fz = c.alongX ? 0 : -c.dir;
        heads.setMatrixAt(i, M.compose(P.set(x + fx * 0.045, 0.012, z - fz * 0.045), Q, S.setScalar(sc)));
        tails.setMatrixAt(i, M.compose(P.set(x - fx * 0.045, 0.012, z + fz * 0.045), Q, S.setScalar(sc)));
      });
      for (const m of [carBody, heads, tails]) m.instanceMatrix.needsUpdate = true;
      headMat.emissiveIntensity = 3 * night;
      tailMat.emissiveIntensity = 2.5 * night;
      group.visible = v.rise > 0;
    },
  };
}
