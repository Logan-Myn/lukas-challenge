import * as THREE from 'three';
import { createDefaultScene } from './defaultScene.js';

export const VIEW_W = 1920, VIEW_H = 1080;

export async function createViewport(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('WebGL context unavailable');
  renderer.setPixelRatio(1);
  renderer.setSize(VIEW_W, VIEW_H, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x3d3d3d);
  const camera = new THREE.PerspectiveCamera(44, VIEW_W / VIEW_H, 0.05, 2000);
  const def = createDefaultScene();
  scene.add(def.group);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 2.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(-5, 12, 8);
  scene.add(key);

  return {
    update(s) {
      def.update(s.view);
      applyCamera(camera, s.view.camera);
      renderer.render(scene, camera);
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
  camera.near = 0.05;
  camera.far = c.ortho ? camera.position.y + 50 : 2000;
  camera.lookAt(...c.target);
  camera.updateProjectionMatrix();
}
