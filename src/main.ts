import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Creature, type CreatureData, type LidData } from './creature';
import lidJson from './lids.json';
const lidData = lidJson as Record<string, LidData[]>;
const eyesParam = new URLSearchParams(location.search).get('eyes');
if (eyesParam) Creature.forceShut = eyesParam === 'half' ? 0.5 : 1;
import { blobShadowTexture, buildGround, buildSky, RainPuff } from './world';
import { Sfx } from './sfx';
import { Joystick } from './joystick';
import { Game } from './game';
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
// follow camera: fixed angle, glides after the keeper
const camTarget = new THREE.Vector3(0, 0.5, -0.4);
let camDist = 15;
const camElev = THREE.MathUtils.degToRad(40);
function placeCamera() {
  camera.position.set(camTarget.x, camTarget.y + Math.sin(camElev) * camDist, camTarget.z + Math.cos(camElev) * camDist);
  camera.lookAt(camTarget);
}
function frameCamera() {
  camDist = window.innerHeight > window.innerWidth ? 15 : 10;
  placeCamera();
}

// lighting: sky/ground fill plus a warm sun with soft shadows
scene.add(new THREE.HemisphereLight(0xdff3ff, 0x9fc87e, 1.1));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
sun.position.set(3.5, 7, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -6;
sun.shadow.camera.right = 6;
sun.shadow.camera.top = 6;
sun.shadow.camera.bottom = -6;
sun.shadow.radius = 4;
sun.shadow.bias = -0.0008;
scene.add(sun, sun.target);
const rim = new THREE.DirectionalLight(0xcfe6ff, 0.9);
rim.position.set(-4, 3, -5);
scene.add(rim);

const shadowTex = blobShadowTexture();
const clouds = buildSky(scene);
const obstacles = buildGround(scene, shadowTex);
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
  ['opiekun', 0, 2.4, 1.4],
];

// models generated with their own textures (Hunyuan3D 3.0)
const TEXTURED = new Set(['feniks', 'bazyliszek', 'gryf', 'grzybolak', 'jednorozec', 'smok', 'opiekun', 'kraken', 'chmurnik']);

const texLoader = new THREE.TextureLoader();
function tex(url: string) {
  const t = texLoader.load(url);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const binCache = new Map<string, Promise<Uint8Array>>();
async function loadModel(name: string) {
  // models ship as base64 text so the page can be served from any static host; decoded once, parsed per copy
  if (!binCache.has(name))
    binCache.set(name, fetch(`models/${name}.glb.txt`).then(async (r) => Uint8Array.from(atob((await r.text()).trim()), (c) => c.charCodeAt(0))));
  const bin = await binCache.get(name)!;
  return new GLTFLoader().parseAsync(bin.slice().buffer, '');
}
async function spawnCreature(name: string, height: number) {
  return new Creature(await loadModel(name), null, null, null, height, shadowTex, lidData[name] ?? []);
}
let game: Game | null = null;

const creatures: Creature[] = [];
let sheep: Creature | null = null;
let keeper: Creature | null = null;
Promise.all(
  CAST.map(async ([name, x, z, h]) => {
    const painted = TEXTURED.has(name);
    const d = painted ? null : castData[name];
    if (!painted && !d) return;
    const gltf = await loadModel(name);
    const front = painted ? null : name === 'chmurnik' ? tex('textures/chmurnik.jpg') : tex(`textures/${name}_front.jpg`);
    const back = painted || name === 'chmurnik' ? null : tex(`textures/${name}_back.jpg`);
    const c = new Creature(gltf, front, back, d, h, shadowTex, painted ? lidData[name] ?? [] : []);
    c.root.position.set(x, 0, z);
    c.lookAt(camera.position.x, camera.position.z);
    scene.add(c.root);
    creatures.push(c);
    if (name === 'opiekun') keeper = c;
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
  if (keeper)
    game = new Game({
      scene, camera, keeper, sfx, shadowTex, spawnCreature,
      patientKinds: CAST.filter(([n]) => n !== 'opiekun').map(([n, , , h]) => [n, h] as [string, number]),
    });
  if (game) game.onFirstPickup = () => hint.classList.add('hidden');
});

// input: drag anywhere to walk the keeper (floating joystick); tap a creature to make it hop,
// tap the meadow to send the keeper there
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const joy = new Joystick(renderer.domElement);
let walkTo: THREE.Vector3 | null = null;
renderer.domElement.addEventListener('pointerdown', () => sfx.unlock());
joy.onStart = () => {
  walkTo = null;
  hint.classList.add('hidden');
};
joy.onTap = (cx, cy) => {
  if (!creatures.length) return;
  ndc.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(creatures.map((c) => c.root), true);
  const hitRoot = hits.length ? creatures.find((c) => { let o: THREE.Object3D | null = hits[0].object; while (o) { if (o === c.root) return true; o = o.parent; } return false; }) : undefined;
  if (hitRoot) {
    hitRoot.hop();
    sfx.boing();
    hint.classList.add('hidden');
  } else {
    const p = new THREE.Vector3();
    if (ray.ray.intersectPlane(groundPlane, p)) walkTo = p;
  }
};

// debug hook for automated checks
(window as unknown as { __keeper: () => number[] | null }).__keeper = () => (keeper ? [keeper.root.position.x, keeper.root.position.z] : null);
(window as unknown as { __game: () => unknown }).__game = () =>
  game && { coins: game.coins, carry: game.carry.length, patients: game.patients.map((p) => [p.state, +p.c.root.position.x.toFixed(2), +p.c.root.position.z.toFixed(2)]), tray: game.cauldrons.map((c) => c.tray.length) };
(window as unknown as { __walk: (x: number, z: number) => void }).__walk = (x, z) => { walkTo = new THREE.Vector3(x, 0, z); };

const SPEED = 2.6;
const KEEPER_R = 0.32;
const WORLD_R = 11;
const move = new THREE.Vector3();
function moveKeeper(dt: number) {
  if (!keeper) return;
  const k = keeper.root.position;
  move.set(0, 0, 0);
  if (joy.active) move.set(joy.x, 0, joy.y); // camera looks straight down -z, so screen axes map to x / z
  else if (walkTo) {
    move.set(walkTo.x - k.x, 0, walkTo.z - k.z);
    const d = move.length();
    if (d < 0.08) walkTo = null;
    else move.multiplyScalar(Math.min(1, d / 0.4) / d);
  }
  const amount = Math.min(1, move.length());
  keeper.walk += (amount - keeper.walk) * Math.min(1, dt * 10);
  if (amount < 0.02) return;
  k.x += move.x * SPEED * dt;
  k.z += move.z * SPEED * dt;
  keeper.lookAt(k.x + move.x, k.z + move.z);
  // collisions: creatures and bushes are circles, the fence is an arc, the meadow has an edge
  const push = (cx: number, cz: number, r: number) => {
    const dx = k.x - cx, dz = k.z - cz, d = Math.hypot(dx, dz), min = r + KEEPER_R;
    if (d < min && d > 1e-4) { k.x = cx + (dx / d) * min; k.z = cz + (dz / d) * min; }
  };
  for (const c of creatures) if (c !== keeper) push(c.root.position.x, c.root.position.z, 0.42);
  for (const [x, z, r] of obstacles.circles) push(x, z, r);
  if (game) for (const [x, z, r] of game.circles()) push(x, z, r);
  const fr = Math.hypot(k.x, k.z), fa = Math.atan2(k.x, -k.z);
  if (Math.abs(fa) < obstacles.fence.halfAngle + 0.03 && Math.abs(fr - obstacles.fence.radius) < KEEPER_R + 0.08) {
    const side = fr < obstacles.fence.radius ? -1 : 1;
    const nr = obstacles.fence.radius + side * (KEEPER_R + 0.08);
    k.x *= nr / fr; k.z *= nr / fr;
  }
  const wr = Math.hypot(k.x, k.z);
  if (wr > WORLD_R) { k.x *= WORLD_R / wr; k.z *= WORLD_R / wr; }
  // nearby creatures turn to watch the keeper go by
  for (const c of creatures) {
    if (c === keeper) continue;
    if (c.root.position.distanceTo(k) < 2.2) c.lookAt(k.x, k.z);
  }
}

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  frameCamera();
}
window.addEventListener('resize', resize);
resize();

// ?dtmax= lets slow test browsers run game time at a normal pace
const DT_MAX = +(new URLSearchParams(location.search).get('dtmax') ?? 0.05);
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), DT_MAX);
  clouds.rotation.y += dt * 0.006;
  for (const c of creatures) c.update(dt);
  rain.update(dt, 1.1);
  void sheep;
  moveKeeper(dt);
  game?.update(dt);
  if (keeper) {
    const k = keeper.root.position;
    const f = Math.min(1, dt * 4);
    camTarget.x += (k.x - camTarget.x) * f;
    camTarget.z += (k.z - 1.2 - camTarget.z) * f;
    placeCamera();
    sun.position.set(camTarget.x + 3.5, 7, camTarget.z + 4);
    sun.target.position.set(camTarget.x, 0, camTarget.z);
  }
  renderer.render(scene, camera);
});
