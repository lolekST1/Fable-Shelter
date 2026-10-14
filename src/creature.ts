import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface CreatureData {
  bounds: number[][];
  /** front projection frame: centre x, centre y, scale (texture units per model unit) */
  proj: number[];
  eyes: { pos: number[]; normal: number[] }[];
  eyeRadius: number;
  /** optional ear ellipsoid, mirrored on x: centre xyz + radii xyz */
  ear?: number[];
  legY: number;
}

/**
 * Plush material: physical material with sheen (fabric fuzz), colour projected
 * from the concept image onto front-facing surfaces, white wool elsewhere,
 * skin colour on the legs. Lighting stays fully dynamic.
 */
function plushMaterial(tex: THREE.Texture, back: THREE.Texture | null, d: CreatureData): THREE.MeshPhysicalMaterial {
  const [cx, cy, k] = d.proj;
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.95,
    sheen: 1.0,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color(0xffffff),
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uConcept = { value: tex };
    shader.uniforms.uBack = { value: back ?? tex };
    shader.uniforms.uHasBack = { value: back ? 1 : 0 };
    shader.uniforms.uProj = { value: new THREE.Vector3(cx, cy, k) };
    const ear = d.ear ?? [0, -99, 0, 0.01, 0.01, 0.01];
    shader.uniforms.uEar = { value: new THREE.Vector3(ear[0], ear[1], ear[2]) };
    shader.uniforms.uEarR = { value: new THREE.Vector3(ear[3], ear[4], ear[5]) };
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
uniform sampler2D uConcept; uniform sampler2D uBack; uniform float uHasBack; uniform vec3 uProj; uniform float uLegY; uniform vec3 uEar; uniform vec3 uEarR;
uniform vec3 uWool; uniform vec3 uSkin;
varying vec3 vObjPos; varying vec3 vObjNrm;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  // the paint map is drawn in the model's own front view, so it lines up with the sculpted face
  vec2 uv = vec2((vObjPos.x - uProj.x) * uProj.z + 0.5, (vObjPos.y - uProj.y) * uProj.z + 0.5);
  vec3 proj = texture2D(uConcept, uv).rgb;
  float front = smoothstep(-0.05, 0.3, normalize(vObjNrm).z);
  // sides and back take the body colours with the face detail washed out
  vec3 rear = uHasBack > 0.5 ? texture2D(uBack, uv).rgb : uWool;
  vec3 col = mix(rear, proj, front);
  col = mix(col, uSkin, smoothstep(uLegY + 0.03, uLegY - 0.03, vObjPos.y));
  // ear flaps: a soft ellipsoid on each side of the head
  vec3 e = (vec3(abs(vObjPos.x), vObjPos.y, vObjPos.z) - uEar) / uEarR;
  col = mix(col, uSkin, 1.0 - smoothstep(0.8, 1.0, length(e)));
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

/** a painted eye on a textured model: surface point, normal, radius and the skin colour around it */
export interface LidData {
  pos: number[];
  normal: number[];
  r: number;
  skin: number[];
  /** lid size relative to the detected dark iris (bigger for eyes with a white rim) */
  scale?: number;
}

/**
 * Eyelid for a painted eye: a flattened skin-coloured dome that slides down from the top
 * of the eye and carries a small dark lash curve, so a closed eye reads as a happy "‿".
 */
function makeLid(d: LidData): { group: THREE.Group; lid: THREE.Object3D } {
  const R = d.r * (d.scale ?? 1.22);
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 128;
  const g = cv.getContext('2d')!;
  const [sr, sg, sb] = d.skin;
  g.fillStyle = `rgb(${sr},${sg},${sb})`;
  g.fillRect(0, 0, 256, 128);
  // lash line where the lid meets the lower edge of the eye (front of the sphere sits at u = 0.25)
  g.strokeStyle = `rgb(${Math.round(sr * 0.32)},${Math.round(sg * 0.28)},${Math.round(sb * 0.3)})`;
  g.lineWidth = 11;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(256 * 0.15, 128 * 0.5);
  g.quadraticCurveTo(256 * 0.25, 128 * 0.62, 256 * 0.35, 128 * 0.5);
  g.stroke();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 16),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }),
  );
  dome.scale.set(R, R, R * 0.5);
  // hinge at the top of the eye: scaling the lid in y pulls the dome down over the eye
  dome.position.y = -R;
  const lid = new THREE.Group();
  lid.position.y = R;
  lid.add(dome);
  const group = new THREE.Group();
  group.add(lid);
  const n = new THREE.Vector3(...(d.normal as [number, number, number])).lerp(new THREE.Vector3(0, 0, 1), 0.5).normalize();
  const p = new THREE.Vector3(...(d.pos as [number, number, number])).addScaledVector(n, -d.r * 0.05);
  group.position.copy(p);
  group.lookAt(p.clone().add(n));
  lid.scale.y = 0.001;
  lid.visible = false;
  return { group, lid };
}

export class Creature {
  /** debug: hold every painted eyelid at a fixed closure (?eyes=closed / ?eyes=half) */
  static forceShut: number | undefined;
  root = new THREE.Group();
  private body = new THREE.Group();
  private lids: THREE.Object3D[] = [];
  private paintedLids: THREE.Object3D[] = [];
  private shadow: THREE.Mesh;
  private t = Math.random() * 10;
  private nextBlink = 2;
  private blinkT = -1;
  private hopT = -1;
  private yaw = 0;
  private targetYaw = 0;
  onHopPeak?: () => void;
  private peaked = false;

  constructor(gltf: GLTF, tex: THREE.Texture | null, back: THREE.Texture | null, d: CreatureData | null, height: number, shadowTex: THREE.Texture, lidData: LidData[] = []) {
    const mesh = gltf.scene.getObjectByProperty('type', 'Mesh') as THREE.Mesh;
    if (tex && d) {
      mesh.geometry.computeVertexNormals();
      mesh.material = plushMaterial(tex, back, d);
    } else {
      // model arrived with its own painted texture: keep it, add a soft fabric sheen
      const m = mesh.material as THREE.MeshStandardMaterial;
      const plush = new THREE.MeshPhysicalMaterial({
        map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap,
        roughness: 0.85, metalness: 0, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffffff),
        // Pixal3D meshes can have thin open spots (tentacle tips); keep the file's double-sided flag so they don't show holes
        side: m.side,
      });
      mesh.material = plush;
      // bake the node transforms from the file into the geometry so size and floor line are right
      gltf.scene.updateMatrixWorld(true);
      mesh.geometry.applyMatrix4(mesh.matrixWorld);
      mesh.position.set(0, 0, 0);
      mesh.rotation.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);
    }
    mesh.castShadow = true;
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox!;
    const y0 = d ? d.bounds[0][1] : bb.min.y;
    const y1 = d ? d.bounds[1][1] : bb.max.y;
    const scale = height / (y1 - y0);
    const model = new THREE.Group();
    model.add(mesh);
    for (const e of d?.eyes ?? []) {
      const { group, lid } = makeEye(d!.eyeRadius * 0.82);
      const p = new THREE.Vector3(...(e.pos as [number, number, number]));
      const n = new THREE.Vector3(...(e.normal as [number, number, number]))
        .lerp(new THREE.Vector3(0, 0, 1), 1)
        .normalize();
      group.position.copy(p).addScaledVector(n, 0.02);
      group.lookAt(p.clone().add(n));
      model.add(group);
      this.lids.push(lid);
    }
    for (const l of lidData) {
      const { group, lid } = makeLid(l);
      model.add(group);
      this.paintedLids.push(lid);
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
    this.targetYaw = Math.atan2(dx, dz);
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
    let diff = this.targetYaw - this.yaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.yaw += diff * Math.min(1, dt * 4);
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
    // painted eyes: the lid covers the eye as much as the 3D eyes would squash
    const shut = Creature.forceShut ?? Math.min(1, (1 - lid) / 0.92);
    for (const l of this.paintedLids) {
      l.visible = shut > 0.02;
      l.scale.y = Math.max(0.001, shut);
    }
  }
}
