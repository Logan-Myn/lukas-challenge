import * as THREE from 'three';
import { createDefaultScene } from './defaultScene.js';
import { createCity } from './city.js';
import { buildCityData, LOTS } from './cityData.js';
import { createPost } from './post.js';
import { loadSparkMask } from '../spark.js';

export const VIEW_W = 1920, VIEW_H = 1080;
const SOLID_BG = new THREE.Color(0x3d3d3d), NIGHT_BG = new THREE.Color(0x07080a);

export async function createViewport(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('WebGL context unavailable');
  renderer.setPixelRatio(1);
  renderer.setSize(VIEW_W, VIEW_H, false);
  renderer.toneMapping = THREE.NeutralToneMapping; // keeps the brand orange on-hue (AgX desaturated it to salmon)
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, VIEW_W / VIEW_H, 0.05, 2000);
  const def = createDefaultScene();
  scene.add(def.group);

  const mask = await loadSparkMask('/assets/claude-spark.svg', LOTS);
  const city = createCity(buildCityData(mask));
  scene.add(city.group);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 2.0);
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  Object.assign(key.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 80 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(hemi, key, key.target);

  const post = createPost(renderer, scene, camera, VIEW_W, VIEW_H, [def.grid]);
  post.outline.selectedObjects = [def.cube];
  const nightFog = new THREE.FogExp2(0x07080a, 0.02);
  const target = new THREE.Vector3();
  const look = (night, ortho) => {
    scene.background = night ? NIGHT_BG : SOLID_BG;
    scene.fog = night && !ortho ? nightFog : null;
    hemi.color.set(night ? 0xa9adb6 : 0xffffff);
    hemi.groundColor.set(night ? 0x080808 : 0x3a3a3a);
    hemi.intensity = night ? 0.8 : 2.0;
    key.color.set(night ? 0xd4d8e0 : 0xffffff);
    key.intensity = night ? 1.1 : 1.8;
    key.position.set(night ? 14 : -9, night ? 22 : 18, night ? -10 : 12);
    // Solid mode is a flat display view in Blender; Neutral keeps the brand orange on-hue in Rendered mode.
    renderer.toneMapping = night ? THREE.NeutralToneMapping : THREE.NoToneMapping;
    renderer.toneMappingExposure = night ? 1.3 : 1.0;
  };

  return {
    towerCount: mask.reduce((a, b) => a + b, 0),
    update(s) {
      const v = s.view;
      look(v.mode === 'rendered', v.camera.ortho);
      def.update(v);
      city.update(v, s.t);
      post.outline.enabled = v.cubeSelected && v.cube > 0.001;
      applyCamera(camera, v.camera);
      post.update(v, camera.position.distanceTo(target.set(...v.camera.target)));
      post.composer.render();
    },
  };
}

// 'ortho' is a very long lens from far away: visually orthographic, same camera for every pass.
export function applyCamera(camera, c) {
  if (c.ortho) {
    camera.fov = 2;
    const dist = c.orthoHeight / 2 / Math.tan((camera.fov / 2) * Math.PI / 180);
    camera.position.set(c.target[0], c.target[1] + dist, c.target[2]);
    camera.up.set(0, 0, -1);
  } else {
    camera.fov = c.fov;
    camera.position.set(...c.pos);
    camera.up.set(0, 1, 0);
  }
  camera.near = c.ortho ? camera.position.y - c.target[1] - 20 : 0.05;
  camera.far = c.ortho ? camera.position.y + 20 : 2000;
  camera.lookAt(...c.target);
  camera.updateProjectionMatrix();
}
