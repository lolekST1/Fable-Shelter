import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface CreatureData {
  bounds: number[][];
  img: number[];
  eyes: { pos: number[]; normal: number[] }[];
  legY: number;
}

const IMG = 1024;

/**
 * Plush material: physical material with sheen (fabric fuzz), colour projected
 * from the concept image onto front-facing surfaces, white wool elsewhere,
 * skin colour on the legs. Lighting stays fully dynamic.
 */
function plushMaterial(tex: THREE.Texture, d: CreatureData): THREE.MeshPhysicalMaterial {
  const [[x0, y0], [x1, y1]] = d.bounds;
  const [ix0, ix1, iy0, iy1] = d.img;
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.95,
    sheen: 1.0,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color(0xffffff),
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uConcept = { value: tex };
    shader.uniforms.uBox = { value: new THREE.Vector4(x0, x1, y0, y1) };
    shader.uniforms.uImg = { value: new THREE.Vector4(ix0 / IMG, ix1 / IMG, iy0 / IMG, iy1 / IMG) };
    shader.uniforms.uLegY = { value: d.legY };
    shader.uniforms.uWool = { value: new THREE.Color(0xf6f4f2) };
    shader.uniforms.uSkin = { value: new THREE.Color(0xf6c9b4) };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObjPos;\nvarying vec3 vObjNrm;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = position;\nvObjNrm = normal;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform sampler2D uConcept; uniform vec4 uBox; uniform vec4 uImg; uniform float uLegY;
uniform vec3 uWool; uniform vec3 uSkin;
varying vec3 vObjPos; varying vec3 vObjNrm;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  float u = mix(uImg.x, uImg.y, (vObjPos.x - uBox.x) / (uBox.y - uBox.x));
  float v = mix(uImg.z, uImg.w, (uBox.w - vObjPos.y) / (uBox.w - uBox.z));
  vec3 proj = texture2D(uConcept, vec2(u, 1.0 - v)).rgb;
  float front = smoothstep(0.12, 0.6, normalize(vObjNrm).z);
  vec3 col = mix(uWool, proj, front);
  col = mix(col, uSkin, smoothstep(uLegY + 0.03, uLegY - 0.03, vObjPos.y));
  diffuseColor.rgb *= col;
}`,
      );
  };
  return mat;
}

function makeEye(radius: number): { group: THREE.Group; lid: THREE.Object3D } {
  const group = new THREE.Group();
  const lid = new THREE.Group();
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 16),
    new THREE.MeshPhysicalMaterial({ color: 0x1d1416, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 }),
  );
  ball.scale.set(1, 1.08, 0.55);
  const shine = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.32, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  shine.position.set(radius * 0.32, radius * 0.38, radius * 0.42);
  const shine2 = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.14, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  shine2.position.set(-radius * 0.3, -radius * 0.3, radius * 0.45);
  lid.add(ball, shine, shine2);
  group.add(lid);
  return { group, lid };
}

export class Creature {
  root = new THREE.Group();
  private body = new THREE.Group();
  private lids: THREE.Object3D[] = [];
  private shadow: THREE.Mesh;
  private t = Math.random() * 10;
  private nextBlink = 2;
  private blinkT = -1;
  private hopT = -1;
  private yaw = 0;
  private targetYaw = 0;
  onHopPeak?: () => void;
  private peaked = false;

  constructor(gltf: GLTF, tex: THREE.Texture, d: CreatureData, height: number, shadowTex: THREE.Texture) {
    const mesh = gltf.scene.getObjectByProperty('type', 'Mesh') as THREE.Mesh;
    mesh.geometry.computeVertexNormals();
    mesh.material = plushMaterial(tex, d);
    mesh.castShadow = true;

    const [[, y0], [, y1]] = d.bounds;
    const scale = height / (y1 - y0);
    const model = new THREE.Group();
    model.add(mesh);
    for (const e of d.eyes) {
      const { group, lid } = makeEye(0.075);
      const p = new THREE.Vector3(...(e.pos as [number, number, number]));
      const n = new THREE.Vector3(...(e.normal as [number, number, number]))
        .lerp(new THREE.Vector3(0, 0, 1), 0.85)
        .normalize();
      group.position.copy(p).addScaledVector(n, 0.03);
      group.lookAt(p.clone().add(n));
      model.add(group);
      this.lids.push(lid);
    }
    model.scale.setScalar(scale);
    model.position.y = -y0 * scale;
    this.body.add(model);
    this.root.add(this.body);

    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(height * 1.5, height * 1.5),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.55 }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.01;
    this.shadow.renderOrder = -1;
    this.root.add(this.shadow);
  }

  hop() {
    if (this.hopT >= 0) return;
    this.hopT = 0;
    this.peaked = false;
    this.blinkT = 0;
  }

  lookAt(worldX: number, worldZ: number) {
    const dx = worldX - this.root.position.x;
    const dz = worldZ - this.root.position.z;
    this.targetYaw = THREE.MathUtils.clamp(Math.atan2(dx, dz), -0.9, 0.9);
  }

  update(dt: number) {
    this.t += dt;
    // breathing and gentle sway
    let sy = 1 + Math.sin(this.t * 2.2) * 0.018;
    let sxz = 1 - Math.sin(this.t * 2.2) * 0.009;
    let lift = 0;
    this.body.rotation.z = Math.sin(this.t * 1.1) * 0.035;

    // hop with squash and stretch
    if (this.hopT >= 0) {
      this.hopT += dt;
      const T = this.hopT;
      if (T < 0.12) {
        const k = T / 0.12;
        sy *= 1 - 0.18 * Math.sin(k * Math.PI * 0.5);
        sxz *= 1 + 0.1 * Math.sin(k * Math.PI * 0.5);
      } else if (T < 0.62) {
        const k = (T - 0.12) / 0.5;
        lift = Math.sin(k * Math.PI) * 0.55;
        const stretch = Math.sin(k * Math.PI);
        sy *= 1 + 0.1 * (1 - stretch) * (k < 0.5 ? 1 : 0.4);
        sxz *= 1 - 0.05 * (1 - stretch);
        if (k > 0.5 && !this.peaked) {
          this.peaked = true;
          this.onHopPeak?.();
        }
      } else if (T < 0.82) {
        const k = (T - 0.62) / 0.2;
        const s = Math.sin(k * Math.PI);
        sy *= 1 - 0.14 * s;
        sxz *= 1 + 0.08 * s;
      } else {
        this.hopT = -1;
      }
    }
    this.body.scale.set(sxz, sy, sxz);
    this.body.position.y = lift;
    const sh = 1 - lift * 0.6;
    this.shadow.scale.set(sh, sh, sh);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.55 * sh;

    // turn toward the point of interest
    this.yaw += (this.targetYaw - this.yaw) * Math.min(1, dt * 4);
    this.body.rotation.y = this.yaw;

    // blinking
    this.nextBlink -= dt;
    if (this.nextBlink <= 0 && this.blinkT < 0) {
      this.blinkT = 0;
      this.nextBlink = 2 + Math.random() * 3.5;
    }
    let lid = 1;
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      const k = this.blinkT / 0.16;
      lid = k < 1 ? Math.max(0.08, Math.abs(1 - 2 * k)) : 1;
      if (k >= 1) this.blinkT = -1;
    }
    for (const l of this.lids) l.scale.y = lid;
  }
}
