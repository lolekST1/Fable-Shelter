import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Creature, type CreatureData } from './creature';
import { blobShadowTexture, buildGround, buildSky, RainPuff } from './world';
import { Sfx } from './sfx';
import chmurnikData from './chmurnik.json';

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd6eef5, 24, 50);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;

const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 120);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.5, -0.9);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 3.5;
controls.maxDistance = 24;
controls.minPolarAngle = 0.55;
controls.maxPolarAngle = 1.35;

function frameCamera() {
  const portrait = window.innerHeight > window.innerWidth;
  const dist = portrait ? 17.5 : 11;
  const elev = THREE.MathUtils.degToRad(40);
  const t = controls.target;
  camera.position.set(t.x, t.y + Math.sin(elev) * dist, t.z + Math.cos(elev) * dist);
  controls.update();
}

// lighting: sky/ground fill plus a warm sun with soft shadows
scene.add(new THREE.HemisphereLight(0xdff3ff, 0x9fc87e, 1.1));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
sun.position.set(3.5, 7, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -4;
sun.shadow.camera.right = 4;
sun.shadow.camera.top = 4;
sun.shadow.camera.bottom = -4;
sun.shadow.radius = 4;
sun.shadow.bias = -0.0008;
scene.add(sun);
const rim = new THREE.DirectionalLight(0xcfe6ff, 0.9);
rim.position.set(-4, 3, -5);
scene.add(rim);

const shadowTex = blobShadowTexture();
const clouds = buildSky(scene);
buildGround(scene, shadowTex);
const rain = new RainPuff(scene);
const sfx = new Sfx();

const hint = document.getElementById('hint')!;
const dataFiles = import.meta.glob('./cast/*.json', { eager: true, import: 'default' }) as Record<string, CreatureData>;
const castData: Record<string, CreatureData> = { chmurnik: chmurnikData as CreatureData };
for (const [path, d] of Object.entries(dataFiles)) castData[path.split('/').pop()!.replace('.json', '')] = d;

// where everyone stands in the pen: name, x, z, height
const CAST: [string, number, number, number][] = [
  ['grzybolak', -1.4, -2.7, 1.15],
  ['bazyliszek', 0, -2.9, 1.0],
  ['feniks', 1.4, -2.7, 1.0],
  ['smok', -1.5, -1.0, 1.25],
  ['jednorozec', 0, -1.15, 1.15],
  ['gryf', 1.55, -1.0, 1.25],
  ['kraken', -1.45, 0.8, 1.05],
  ['chmurnik', 0, 0.9, 1.05],
  ['opiekun', 1.45, 0.9, 1.4],
];

// models generated with their own textures (Hunyuan3D 3.0)
const TEXTURED = new Set(['feniks', 'bazyliszek', 'gryf', 'grzybolak', 'jednorozec', 'smok', 'opiekun']);

const texLoader = new THREE.TextureLoader();
function tex(url: string) {
  const t = texLoader.load(url);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
async function loadModel(name: string) {
  // models ship as base64 text so the page can be served from any static host
  const res = await fetch(`models/${name}.glb.txt`);
  const bin = Uint8Array.from(atob((await res.text()).trim()), (c) => c.charCodeAt(0));
  return new GLTFLoader().parseAsync(bin.buffer, '');
}

const creatures: Creature[] = [];
let sheep: Creature | null = null;
Promise.all(
  CAST.map(async ([name, x, z, h]) => {
    const painted = TEXTURED.has(name);
    const d = painted ? null : castData[name];
    if (!painted && !d) return;
    const gltf = await loadModel(name);
    const front = painted ? null : name === 'chmurnik' ? tex('textures/chmurnik.jpg') : tex(`textures/${name}_front.jpg`);
    const back = painted || name === 'chmurnik' ? null : tex(`textures/${name}_back.jpg`);
    const c = new Creature(gltf, front, back, d, h, shadowTex);
    c.root.position.set(x, 0, z);
    c.lookAt(camera.position.x, camera.position.z);
    scene.add(c.root);
    creatures.push(c);
    if (name === 'chmurnik') {
      sheep = c;
      c.onHopPeak = () => {
        rain.trigger(new THREE.Vector3(x, 1.8, z));
        sfx.drizzle();
      };
    }
  }),
).then(() => {
  // compile every shader up front (including the hidden rain cloud) so the first tap does not stall
  rain.group.visible = true;
  renderer.compile(scene, camera);
  rain.group.visible = false;
});

// input: tap a creature to make it hop, drag to orbit; tapping the meadow turns everyone toward that spot
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let downAt = { x: 0, y: 0, t: 0 };
renderer.domElement.addEventListener('pointerdown', (e) => {
  downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
  sfx.unlock();
});
renderer.domElement.addEventListener('pointerup', (e) => {
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
  if (moved > 10 || performance.now() - downAt.t > 450 || !creatures.length) return;
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(creatures.map((c) => c.root), true);
  const hitRoot = hits.length ? creatures.find((c) => { let o: THREE.Object3D | null = hits[0].object; while (o) { if (o === c.root) return true; o = o.parent; } return false; }) : undefined;
  if (hitRoot) {
    hitRoot.hop();
    sfx.boing();
    hint.classList.add('hidden');
  } else {
    const p = new THREE.Vector3();
    if (ray.ray.intersectPlane(groundPlane, p)) for (const c of creatures) c.lookAt(p.x, p.z);
  }
});

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  frameCamera();
}
window.addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  clouds.rotation.y += dt * 0.006;
  for (const c of creatures) c.update(dt);
  rain.update(dt, 1.1);
  void sheep;
  controls.update();
  renderer.render(scene, camera);
});
