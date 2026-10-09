import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { mulberry32 } from '../rng.js';

// GTAOPass builds its denoise texture from an unseeded SimplexNoise (Math.random); same recipe, seeded.
function seededDenoiseTexture(size = 64) {
  const simplex = new SimplexNoise({ random: mulberry32(1307) });
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) {
    const o = (i * size + j) * 4;
    data[o] = (simplex.noise(i, j) * 0.5 + 0.5) * 255;
    data[o + 1] = (simplex.noise(i + size, j) * 0.5 + 0.5) * 255;
    data[o + 2] = (simplex.noise(i, j + size) * 0.5 + 0.5) * 255;
    data[o + 3] = (simplex.noise(i + size, j + size) * 0.5 + 0.5) * 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function createPost(renderer, scene, camera, w, h) {
  const target = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(1);
  composer.setSize(w, h);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, w, h);
  gtao.pdNoiseTexture.dispose();
  gtao.pdNoiseTexture = seededDenoiseTexture();
  gtao.pdMaterial.uniforms.tNoise.value = gtao.pdNoiseTexture;
  gtao.blendIntensity = 0.9;
  gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 16 });
  composer.addPass(gtao);
  const outline = new OutlinePass(new THREE.Vector2(w, h), scene, camera);
  outline.visibleEdgeColor.set('#D97757');
  outline.hiddenEdgeColor.set('#D97757');
  outline.edgeStrength = 6; outline.edgeThickness = 1; outline.edgeGlow = 0; outline.pulsePeriod = 0;
  composer.addPass(outline);
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.35, 0.3, 1.1);
  composer.addPass(bloom);
  const bokeh = new BokehPass(scene, camera, { focus: 6, aperture: 0.0, maxblur: 0.008 });
  composer.addPass(bokeh);
  composer.addPass(new OutputPass());
  return {
    composer, outline,
    update(v, focusDist) {
      bloom.enabled = v.mode === 'rendered';
      bloom.strength = 0.35;
      bokeh.enabled = v.dof > 0.001;
      bokeh.uniforms.aperture.value = 0.0012 * v.dof;
      bokeh.uniforms.focus.value = focusDist;
    },
  };
}
