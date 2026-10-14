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

/** a painted eye on a textured model, with the face surface sampled around it (see lids.json) */
export interface LidData {
  r: number;
  skin: number[];
  /** lid radius, frame normal / right / up, and a (grid+1)^2 lattice of face points around the eye */
  R: number;
  n: number[];
  right: number[];
  up: number[];
  grid: number;
  pts: number[];
}

interface PaintedLid {
  mesh: THREE.Mesh;
  shut: { value: number };
}

/**
 * Eyelid for a painted eye: a thin skin-coloured shell moulded on the face around the eye,
 * with a slight bulge like a real lid. Closing sweeps it down from the top; when shut it shows
 * a small lash curve so the closed eye reads as a happy "‿".
 */
function makeLid(d: LidData): PaintedLid {
  const G = d.grid, R = d.R;
  const n = new THREE.Vector3(...(d.n as [number, number, number]));
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) {
    const k = (j * (G + 1) + i) * 3, x = (i / G) * 2 - 1, y = (j / G) * 2 - 1;
    // lift off the face a touch, more in the middle so the lid has some volume
    const lift = R * (0.05 + 0.2 * Math.max(0, 1 - x * x - y * y));
    pos.push(d.pts[k] + n.x * lift, d.pts[k + 1] + n.y * lift, d.pts[k + 2] + n.z * lift);
    uv.push(x, y);
  }
  const inDisc = (i: number, j: number) => { const x = (i / G) * 2 - 1, y = (j / G) * 2 - 1; return x * x + y * y < 1.6; };
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
    if (!(inDisc(i, j) || inDisc(i + 1, j + 1))) continue;
    const a = j * (G + 1) + i, b = a + 1, c = a + G + 1, e = c + 1;
    idx.push(a, b, e, a, e, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('lidUV', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const [sr, sg, sb] = d.skin;
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setRGB(sr / 255, sg / 255, sb / 255, THREE.SRGBColorSpace),
    roughness: 0.9,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const shut = { value: 0 };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uShut = shut;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 lidUV;\nvarying vec2 vL;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvL = lidUV;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uShut;\nvarying vec2 vL;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  if (dot(vL, vL) > 1.0) discard;
  // lid edge sweeps down from the top, curved like a real eyelid
  float edge = 1.0 - 2.15 * uShut - 0.25 * uShut * (1.0 - vL.x * vL.x);
  if (vL.y < edge) discard;
  float rim = (1.0 - smoothstep(0.0, 0.12, vL.y - edge)) * step(uShut, 0.97);
  // closed: a small smiling lash curve
  float yl = 0.02 - 0.32 * (1.0 - vL.x * vL.x);
  float lash = (1.0 - smoothstep(0.05, 0.1, abs(vL.y - yl))) * (1.0 - smoothstep(0.7, 0.85, abs(vL.x))) * smoothstep(0.85, 1.0, uShut);
  diffuseColor.rgb *= 1.0 - 0.72 * max(lash, rim * 0.6);
}`,
      );
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.visible = false;
  return { mesh, shut };
}

export class Creature {
  /** debug: hold every painted eyelid at a fixed closure (?eyes=closed / ?eyes=half) */
  static forceShut: number | undefined;
  /** hold this creature's painted eyelids at a closure (sleeping); undefined = normal blinking */
  eyesShut: number | undefined;
  root = new THREE.Group();
  private body = new THREE.Group();
  private lids: THREE.Object3D[] = [];
  private paintedLids: PaintedLid[] = [];
  private shadow: THREE.Mesh;
  private t = Math.random() * 10;
  private nextBlink = 2;
  private blinkT = -1;
  private hopT = -1;
  private yaw = 0;
  private targetYaw = 0;
  onHopPeak?: () => void;
  /** standing height in world units (top of the head) */
  height = 1;
  private skin!: THREE.MeshPhysicalMaterial;
  /** walking speed as a fraction of full speed (0 = standing); drives the waddle */
  walk = 0;
  private stepPhase = 0;
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
    this.skin = mesh.material as THREE.MeshPhysicalMaterial;
    this.height = height;
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
      const lid = makeLid(l);
      model.add(lid.mesh);
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

  /** carry something on the body (it turns, bobs and squashes with the creature) */
  attach(o: THREE.Object3D) {
    this.body.add(o);
  }

  /** tint the whole creature, e.g. a pale blue chill while it is sick; null restores it */
  setTint(c: THREE.ColorRepresentation | null) {
    this.skin.color.set(c ?? 0xffffff);
  }

  /** a small involuntary jolt (sneeze, hiccup, shiver) */
  twitch(strength = 1) {
    this.twitchT = 0;
    this.twitchK = strength;
  }
  private twitchT = -1;
  private twitchK = 1;

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
    // waddle: little bounces with a side-to-side rock while walking
    if (this.walk > 0.01) {
      this.stepPhase += dt * (6 + 6 * this.walk);
      lift += Math.abs(Math.sin(this.stepPhase)) * 0.07 * this.walk;
      this.body.rotation.z += Math.sin(this.stepPhase) * 0.1 * this.walk;
      sy *= 1 - Math.abs(Math.cos(this.stepPhase)) * 0.03 * this.walk;
    } else this.stepPhase = 0;
    if (this.twitchT >= 0) {
      this.twitchT += dt;
      const k = this.twitchT / 0.28;
      if (k >= 1) this.twitchT = -1;
      else {
        const s = Math.sin(k * Math.PI);
        sy *= 1 - 0.1 * s * this.twitchK;
        sxz *= 1 + 0.07 * s * this.twitchK;
        lift += Math.max(0, Math.sin(k * Math.PI * 2)) * 0.08 * this.twitchK;
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
    this.yaw += diff * Math.min(1, dt * (this.walk > 0.05 ? 12 : 4));
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
    const shut = Creature.forceShut ?? this.eyesShut ?? Math.min(1, (1 - lid) / 0.92);
    for (const l of this.paintedLids) {
      l.mesh.visible = shut > 0.02;
      l.shut.value = shut;
    }
  }
}
