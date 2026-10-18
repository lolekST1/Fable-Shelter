import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Creature, type CreatureData, type LidData } from './creature';
import lidJson from './lids.json';
const lidData = lidJson as Record<string, LidData[]>;
const eyesParam = new URLSearchParams(location.search).get('eyes');
if (eyesParam) Creature.forceShut = eyesParam === 'half' ? 0.5 : 1;
import { blobShadowTexture, buildGround, buildSky, Rain, RainPuff, tintSky } from './world';
import { Sfx } from './sfx';
import { Joystick } from './joystick';
import { Game, SEA_C, SEA_R, SNOW_C, SNOW_R } from './game';
import chmurnikData from './chmurnik.json';

// ?gltest=nofacing / mediump / noaa (see ?glinfo below): on the Adreno 308 tablet every lit material came out black,
// even with only an ambient light; unlit ones were fine. Known Adreno 3xx suspects: gl_FrontFacing and highp.
const GLT = (new URLSearchParams(location.search).get('gltest') ?? '').split(',');
if (GLT.includes('nofacing')) THREE.ShaderChunk.normal_fragment_begin = THREE.ShaderChunk.normal_fragment_begin.replace('gl_FrontFacing ? 1.0 : - 1.0', '1.0');
// Found by ?gltest on the Huawei MediaPad T3 10 (Adreno 308, WebGL 1 only): it reports highp, but with highp every lit
// material comes out black; with mediump the scene is right. So devices without WebGL 2 get mediump (?gltest=highp to try).
const NO_WEBGL2 = !document.createElement('canvas').getContext('webgl2');
const MEDIUMP = GLT.includes('mediump') || (NO_WEBGL2 && !GLT.includes('highp'));
const renderer = new THREE.WebGLRenderer({ antialias: !GLT.includes('noaa') && !NO_WEBGL2, powerPreference: 'high-performance', ...(MEDIUMP ? { precision: 'mediump' as const } : {}) });
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
// WebGL 1 (old tablets, e.g. Adreno 308): the scene came out black there. Start safe: no environment reflections
// (their half-float maps are often missing on such GPUs) and no shadows (see the quality levels). ?env and ?quality=N
// turn them back on to test, ?glinfo shows what the GPU can do and any shader errors.
const URLQ = new URLSearchParams(location.search);
const WEBGL1 = !renderer.capabilities.isWebGL2;
const ENV = !(WEBGL1 || URLQ.has('noenv')) || URLQ.has('env');
if (ENV) scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
// three.js r162 (the last one that runs on WebGL 1, e.g. Adreno 308 tablets) has no scene.environmentIntensity:
// the same dimming goes on each lit material's envMapIntensity, refreshed when it changes or new things appear
let envLevel = -1, envT = 0;
function setEnvironment(level: number, dt: number) {
  envT -= dt;
  if (Math.abs(level - envLevel) < 0.01 && envT > 0) return;
  envLevel = level;
  envT = 1; // things loaded since (creatures, props) pick it up within a second
  scene.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[] | undefined;
    for (const x of Array.isArray(m) ? m : m ? [m] : []) {
      if ('envMapIntensity' in x) x.envMapIntensity = level;
      // the plush sheen is the costliest part of the creatures' shading; old GPUs go without it
      const ph = x as THREE.MeshPhysicalMaterial;
      if (NO_WEBGL2 && ph.isMeshPhysicalMaterial && ph.sheen > 0) { ph.sheen = 0; ph.needsUpdate = true; }
    }
  });
}

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
const hemi = new THREE.HemisphereLight(0xdff3ff, 0x9fc87e, 1.1);
scene.add(hemi);
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
const obstacles = buildGround(scene, shadowTex, [[SNOW_C.x, SNOW_C.z, SNOW_R + 0.7], [SEA_C.x, SEA_C.z, SEA_R + 0.7]]);
const rain = new RainPuff(scene);
const weather = new Rain(scene);
const DAY_HEMI = new THREE.Color(0xdff3ff), NIGHT_HEMI = new THREE.Color(0x8ea4e0), DAY_SUN = new THREE.Color(0xfff1dc), NIGHT_SUN = new THREE.Color(0xa8bcff);
const sfx = new Sfx();

const hint = document.getElementById('hint')!;
const dataFiles = import.meta.glob('./cast/*.json', { eager: true, import: 'default' }) as Record<string, CreatureData>;
const castData: Record<string, CreatureData> = { chmurnik: chmurnikData as CreatureData };
for (const [path, d] of Object.entries(dataFiles)) castData[path.split('/').pop()!.replace('.json', '')] = d;

// the shelter starts empty: only the keeper; creatures arrive as patients over time
const CAST: [string, number, number, number][] = [['opiekun', 0, 2.4, 1.4]];

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
/** album portraits: the model drawn once in a small offscreen renderer of its own, three-quarter view */
let snap: { r: THREE.WebGLRenderer; scene: THREE.Scene; cam: THREE.PerspectiveCamera } | null = null;
async function portrait(model: string, tint: number | null) {
  const c = await spawnCreature(model, 1);
  if (tint !== null) c.setTint(tint);
  if (!snap) {
    const r = new THREE.WebGLRenderer({ antialias: !NO_WEBGL2, alpha: true, preserveDrawingBuffer: true, ...(MEDIUMP ? { precision: 'mediump' as const } : {}) });
    r.setSize(192, 192, false);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    const s = new THREE.Scene();
    s.add(new THREE.HemisphereLight(0xffffff, 0xd8c8a8, 1.6));
    const key = new THREE.DirectionalLight(0xfff1dc, 2.0);
    key.position.set(2, 3, 4);
    s.add(key);
    const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 20);
    cam.position.set(0.9, 1.05, 2.6);
    cam.lookAt(0, 0.5, 0);
    snap = { r, scene: s, cam };
  }
  c.root.rotation.y = 0.35;
  c.update(0);
  snap.scene.add(c.root);
  snap.r.render(snap.scene, snap.cam);
  snap.scene.remove(c.root);
  return snap.r.domElement.toDataURL('image/png');
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
  }),
).then(() => {
  // compile every shader up front (including the hidden rain cloud) so the first tap does not stall
  rain.group.visible = true;
  renderer.compile(scene, camera);
  rain.group.visible = false;
  if (keeper)
    game = new Game({
      scene, camera, keeper, sfx, shadowTex, spawnCreature, portrait, loadProp: async (name) => (await loadModel(name)).scene,
    });
  if (game) game.onFirstPickup = () => hint.classList.add('hidden');
  if (game?.restored) hint.classList.add('hidden');
});

// input: drag anywhere to walk the keeper (floating joystick); tap a creature to make it hop,
// tap the meadow to send the keeper there
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const joy = new Joystick(renderer.domElement);
/** where a tap sent the keeper: the way there through the pen gates, the bridge and the ways into the areas */
let walkTo: THREE.Vector3[] = [];
const sendKeeper = (to: THREE.Vector3) => {
  // asked again for the same place (a test bot does it every step): keep the way already worked out, or a keeper
  // standing in a pen gate would be sent out and back in by turns
  const last = walkTo[walkTo.length - 1];
  if (last && Math.hypot(last.x - to.x, last.z - to.z) < 0.05) return;
  walkTo = keeper && game ? game.route(keeper.root.position.clone(), to) : [to];
};
const MUSIC_DAY = ['music/oboz1.mp3', 'music/oboz2.mp3'], MUSIC_NIGHT = ['music/noc1.mp3', 'music/noc2.mp3'];
renderer.domElement.addEventListener('pointerdown', () => { sfx.unlock(); sfx.music(MUSIC_DAY, MUSIC_NIGHT); });

// sound on/off, remembered between visits
const muteBtn = document.createElement('button');
muteBtn.id = 'mute';
const speakerSvg = (on: boolean) =>
  `<svg viewBox="0 0 48 48" width="30" height="30"><path d="M8 18h8l10-8v28l-10-8H8z" fill="#5b7f73"/>` +
  (on
    ? `<path d="M32 17c3 2 3 12 0 14M36 13c6 4 6 18 0 22" stroke="#5b7f73" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
    : `<path d="M32 18l10 12M42 18L32 30" stroke="#e86a5a" stroke-width="4" stroke-linecap="round"/>`) +
  `</svg>`;
const muteCss = document.createElement('style');
muteCss.textContent = `#mute { position: fixed; right: calc(14px + env(safe-area-inset-right)); top: calc(14px + env(safe-area-inset-top)); width: 48px; height: 48px;
  border: 0; border-radius: 50%; background: rgba(255,255,255,.85); box-shadow: 0 3px 10px rgba(40,70,60,.2); display: grid; place-items: center; padding: 0; }`;
document.head.appendChild(muteCss);
muteBtn.innerHTML = speakerSvg(!sfx.muted);
muteBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
muteBtn.addEventListener('click', () => {
  sfx.unlock();
  sfx.setMuted(!sfx.muted);
  muteBtn.innerHTML = speakerSvg(!sfx.muted);
});
document.body.appendChild(muteBtn);
joy.onStart = () => {
  walkTo = [];
  hint.classList.add('hidden');
};
joy.onTap = (cx, cy) => {
  if (!creatures.length) return;
  ndc.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const all = [...creatures, ...(game?.tappables() ?? [])];
  const hits = ray.intersectObjects(all.map((c) => c.root), true);
  const hitRoot = hits.length ? all.find((c) => { let o: THREE.Object3D | null = hits[0].object; while (o) { if (o === c.root) return true; o = o.parent; } return false; }) : undefined;
  if (hitRoot) {
    hitRoot.hop();
    sfx.boing();
    hint.classList.add('hidden');
  } else {
    const p = new THREE.Vector3();
    if (ray.ray.intersectPlane(groundPlane, p)) sendKeeper(game ? game.tapTarget(ray, p) : p);
  }
};

// debug hook for automated checks
(window as unknown as { __keeper: () => number[] | null }).__keeper = () => (keeper ? [keeper.root.position.x, keeper.root.position.z] : null);
(window as unknown as { __game: () => unknown }).__game = () =>
  game && { coins: game.coins, carry: game.carry.length, patients: game.patients.map((p) => [p.state, +p.c.root.position.x.toFixed(2), +p.c.root.position.z.toFixed(2)]), tray: game.stations.map((c) => c.kind + c.tray.length), residents: game.residents.map((r) => [r.name, r.state, r.need, r.hearts, +r.c.root.position.x.toFixed(2), +r.c.root.position.z.toFixed(2), +r.bed.pos.x.toFixed(2), +r.bed.pos.z.toFixed(2)]), carryKinds: game.carry.map((v) => v.userData.kind), adopters: game.adopters.map((a) => [a.state, a.r.name, +a.c.root.position.x.toFixed(2), +a.c.root.position.z.toFixed(2)]), hearts: game.hearts, workers: game.workers.map((w) => [w.zone, w.state, +w.c.root.position.x.toFixed(2), +w.c.root.position.z.toFixed(2)]) };
// __walk goes straight to a point (test bots work out their own ways); __go walks there the way a tap does
(window as unknown as { __walk: (x: number, z: number) => void }).__walk = (x, z) => { walkTo = [new THREE.Vector3(x, 0, z)]; };
(window as unknown as { __go: (x: number, z: number) => void }).__go = (x, z) => sendKeeper(new THREE.Vector3(x, 0, z));
(window as unknown as { __strays: () => string[] }).__strays = () => game?.strays() ?? [];
(window as unknown as { __items: () => unknown[] }).__items = () => game?.items() ?? [];
(window as unknown as { __spots: () => unknown }).__spots = () => game?.spotsInfo();
(window as unknown as { __calls: () => number }).__calls = () => renderer.info.render.calls;
(window as unknown as { __hearts: (n: number) => void }).__hearts = (n) => game?.addHearts(n);
(window as unknown as { __coins: (n: number) => void }).__coins = (n) => game?.addCoins(n);

const SPEED = 2.6;
const KEEPER_R = 0.32;
const WORLD_R = 11;
const move = new THREE.Vector3();
function moveKeeper(dt: number) {
  if (!keeper) return;
  const k = keeper.root.position;
  move.set(0, 0, 0);
  if (joy.active) move.set(joy.x, 0, joy.y); // camera looks straight down -z, so screen axes map to x / z
  else if (walkTo.length) {
    // waypoints are passed through (also when slipping past one round an obstacle), the last one is walked up to;
    // a gate or bridge point is skipped that way only if the straight way on stays on its side of the fence or the
    // brook (from inside the pen the keeper is nearer the cauldron than the front gate is, and went west into the fence)
    const sameSide = (a: THREE.Vector3, b: THREE.Vector3) => {
      if (!game) return true;
      const za = game.zone(a), n = Math.ceil(Math.hypot(b.x - k.x, b.z - k.z) / 0.25), p = new THREE.Vector3();
      for (let i = 0; i <= n; i++) if (game.zone(p.lerpVectors(k, b, i / n)) !== za) return false;
      return true;
    };
    while (walkTo.length > 1) {
      const [a, b] = walkTo;
      const past = Math.hypot(k.x - b.x, k.z - b.z) < Math.hypot(a.x - b.x, a.z - b.z) && sameSide(a, b);
      if (Math.hypot(k.x - a.x, k.z - a.z) < 0.5 || past) walkTo.shift();
      else break;
    }
    move.set(walkTo[0].x - k.x, 0, walkTo[0].z - k.z);
    const d = move.length();
    if (d < 0.08) walkTo = [];
    else move.multiplyScalar((walkTo.length > 1 ? 1 : Math.min(1, d / 0.4)) / d);
  }
  const amount = Math.min(1, move.length());
  keeper.walk += (amount - keeper.walk) * Math.min(1, dt * 10);
  if (amount < 0.02) return;
  const sp = SPEED * (game?.speed ?? 1);
  k.x += move.x * sp * dt;
  k.z += move.z * sp * dt;
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
  const af = Math.abs(fa);
  if (af > obstacles.fence.inner - 0.03 && af < obstacles.fence.halfAngle + 0.03 && Math.abs(fr - obstacles.fence.radius) < KEEPER_R + 0.08) {
    const side = fr < obstacles.fence.radius ? -1 : 1;
    const nr = obstacles.fence.radius + side * (KEEPER_R + 0.08);
    k.x *= nr / fr; k.z *= nr / fr;
  }
  // the meadow edge, the brook and (once the bridge is up) the pond area
  if (game) game.bound(k);
  else {
    const wr = Math.hypot(k.x, k.z);
    if (wr > WORLD_R) { k.x *= WORLD_R / wr; k.z *= WORLD_R / wr; }
  }
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

// Saving mode for slow phones: every 2 s under 40 fps drops one quality level (sharpness first, then simpler shadows,
// then none) and remembers it for the next visit. Phones with few cores start a step lower. Never goes back up, so it can't flicker. ?fps shows a counter, ?quality=N forces a level.
const params0 = new URLSearchParams(location.search);
const QUALITY_KEY = 'fable-shelter-quality';
const LEVELS = [Math.min(window.devicePixelRatio, 2), 1.5, 1.25, 1];
const MAX_Q = LEVELS.length + 1;
// ?quality=N fixes the level for this visit (measurements, screenshots): no automatic drops
const QUALITY_LOCKED = new URLSearchParams(location.search).has('quality');
let quality = 0;
function setQuality(q: number) {
  quality = Math.min(MAX_Q, Math.max(0, q));
  // devices without WebGL 2 (old tablets) draw at 0.7 of the screen's pixels: the Adreno 308 stuttered badly at 1
  renderer.setPixelRatio(Math.min(LEVELS[0], LEVELS[Math.min(quality, LEVELS.length - 1)], NO_WEBGL2 ? +(params0.get('ratio') ?? 0.7) : 9));
  renderer.shadowMap.type = quality >= LEVELS.length ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  renderer.shadowMap.enabled = quality < MAX_Q;
  resize();
  try { localStorage.setItem(QUALITY_KEY, String(quality)); } catch { /* ignore */ }
}
{
  let saved = 0;
  try { saved = +(localStorage.getItem(QUALITY_KEY) ?? 0) || 0; } catch { /* ignore */ }
  const forced = new URLSearchParams(location.search).get('quality');
  const few = (navigator.hardwareConcurrency || 8) <= 4;
  if (forced !== null) setQuality(+forced);
  else if (WEBGL1) setQuality(MAX_Q); // no shadows: old GPUs are slow, and shadows are a suspect for the black scene
  else if (saved || few) setQuality(saved || 1);
}
const fpsBox = new URLSearchParams(location.search).has('fps') ? document.body.appendChild(document.createElement('div')) : null;
if (fpsBox) fpsBox.style.cssText = 'position:fixed;left:8px;bottom:calc(8px + env(safe-area-inset-bottom));font:12px system-ui;color:#234;background:rgba(255,255,255,.7);padding:2px 6px;border-radius:6px;pointer-events:none';
let fpsFrames = 0, fpsFrom = performance.now(), fpsWarm = performance.now() + 4000; // models are still loading at first
function watchFps() {
  fpsFrames++;
  const now = performance.now(), span = now - fpsFrom;
  if (span < 2000) return;
  const fps = (fpsFrames * 1000) / span;
  fpsFrames = 0;
  fpsFrom = now;
  if (fpsBox) fpsBox.textContent = `${fps.toFixed(0)} fps · jakość ${quality}`;
  // a longer window means the tab was hidden or the phone paused: not a real measurement
  if (!QUALITY_LOCKED && now > fpsWarm && span < 3000 && fps < 40 && quality < MAX_Q) setQuality(quality + 1);
}
(window as unknown as { __quality: () => number }).__quality = () => quality;

// ?dtmax= lets slow test browsers run game time at a normal pace
const params = new URLSearchParams(location.search);

// ?glinfo: what the GPU offers and what went wrong, for devices we cannot debug from here (photo of the screen)
if (params.has('glinfo') || params.has('gltest')) { // gltest alone shows the overlay too
  const errs: string[] = [];
  for (const k of ['error', 'warn'] as const) {
    const orig = console[k].bind(console);
    console[k] = (...a: unknown[]) => { errs.push(a.map(String).join(' ').slice(0, 160)); orig(...a); };
  }
  const box = document.body.appendChild(document.createElement('div'));
  box.style.cssText = 'position:fixed;left:8px;right:8px;top:120px;max-height:60%;overflow:auto;font:11px monospace;color:#123;background:rgba(255,255,255,.85);padding:6px;border-radius:8px;z-index:50;pointer-events:none;white-space:pre-wrap';
  const gl = renderer.getContext();
  const ext = ['OES_texture_float', 'OES_texture_half_float', 'OES_texture_half_float_linear', 'EXT_color_buffer_half_float', 'WEBGL_color_buffer_float', 'WEBGL_depth_texture', 'OES_standard_derivatives', 'EXT_shader_texture_lod', 'ANGLE_instanced_arrays', 'OES_element_index_uint'];
  const fixed = [
    `WebGL2 ${renderer.capabilities.isWebGL2} precision ${renderer.capabilities.precision} env ${ENV}`,
    `GPU ${(() => { const d = gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : '?'; })()}`,
    `fragUniforms ${gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS)} vertUniforms ${gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS)} varyings ${gl.getParameter(gl.MAX_VARYING_VECTORS)} textures ${gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)}`,
    'ext: ' + ext.map((e) => (gl.getExtension(e) ? '+' : '-') + e.replace(/^(OES|EXT|WEBGL|ANGLE)_/, '')).join(' '),
  ].join('\n');
  // ?gltest=clear,nosky,nofog,notone,basic: switch one suspect off at a time on a device with a black scene.
  // clear: pink background (pink = nothing drawn there, black = drawn but black); nosky: hide the sky dome;
  // nofog: no fog; notone: no tone mapping; basic: every lit material replaced by an unlit one of the same colour/texture
  const T = (params.get('gltest') ?? '').split(',');
  if (T.includes('clear')) renderer.setClearColor(0xff40c0, 1);
  if (T.includes('nofog')) { const f = scene.fog as THREE.Fog; f.near = 1e4; f.far = 1e5; } // kept (the sky tint uses it), just never reached
  if (T.includes('notone')) renderer.toneMapping = THREE.NoToneMapping;
  // the lights one by one (basic,notone,nofog showed the scene on the Adreno 308 tablet: lit materials come out black)
  if (T.includes('nosun')) sun.visible = false;
  if (T.includes('norim')) rim.visible = false;
  if (T.includes('nohemi')) hemi.visible = false;
  if (T.includes('amb')) scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const swap = () => scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.material || Array.isArray(m.material)) return;
    const mat = m.material as THREE.MeshStandardMaterial;
    if (T.includes('nosky') && (mat as unknown as THREE.ShaderMaterial).isShaderMaterial && mat.side === THREE.BackSide) m.visible = false;
    if (T.includes('basic') && (mat.isMeshStandardMaterial || (mat as unknown as THREE.MeshLambertMaterial).isMeshLambertMaterial)) {
      m.material = new THREE.MeshBasicMaterial({ color: mat.color, map: mat.map, transparent: mat.transparent, opacity: mat.opacity, side: mat.side, vertexColors: mat.vertexColors });
    }
  });
  swap();
  setInterval(swap, 1000);
  setInterval(() => {
    box.textContent = `${fixed}\ngltest ${T.join(',') || '-'}\nquality ${(window as unknown as { __quality: () => number }).__quality?.()} shadows ${renderer.shadowMap.enabled} calls ${renderer.info.render.calls} programs ${renderer.info.programs?.length}\nerrors (${errs.length}):\n${errs.slice(0, 6).join('\n')}`;
  }, 1000);
}
const DT_MAX = +(params.get('dtmax') ?? 0.05);
// balance tests: ?speed=N runs N fixed game steps per frame, ?norender draws only every 30th frame,
// and window.__tick (if a test sets it) is called before each step, e.g. to steer the keeper
const STEPS = Math.max(1, Math.floor(+(params.get('speed') ?? 1)));
const NORENDER = params.has('norender');
(window as unknown as { __G: () => Game | null }).__G = () => game;
(window as unknown as { __renderer: THREE.WebGLRenderer }).__renderer = renderer; // for profiling (tools/tests/perf.mjs)
let frame = 0;
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const real = Math.min(clock.getDelta(), DT_MAX);
  const dt = STEPS > 1 ? 1 / 30 : real;
  for (let s = 0; s < STEPS; s++) {
    (window as unknown as { __tick?: (dt: number) => void }).__tick?.(dt);
    clouds.rotation.y += dt * 0.006;
    for (const c of creatures) c.update(dt);
    rain.update(dt, 1.1);
    moveKeeper(dt);
    game?.update(dt);
  }
  void sheep;
  if (keeper) {
    const k = game?.focus ?? keeper.root.position; // the first adoption takes the camera for a moment
    const f = Math.min(1, dt * (game?.focus ? 2 : 4));
    camTarget.x += (k.x - camTarget.x) * f;
    camTarget.z += (k.z - 1.2 - camTarget.z) * f;
    placeCamera();
    sun.position.set(camTarget.x + 3.5, 7, camTarget.z + 4);
    sun.target.position.set(camTarget.x, 0, camTarget.z);
  }
  // time of day and weather (see Game.daylight / Game.rain): dimmer, bluer light at night, greyer in the rain
  const L = game?.daylight ?? 1, W = game?.rain ?? 0;
  hemi.intensity = (0.55 + 0.55 * L) * (1 - 0.2 * W);
  hemi.color.copy(NIGHT_HEMI).lerp(DAY_HEMI, L);
  sun.intensity = (0.45 + 1.75 * L) * (1 - 0.5 * W);
  sun.color.copy(NIGHT_SUN).lerp(DAY_SUN, L);
  rim.intensity = 0.5 + 0.4 * L;
  setEnvironment(0.45 * (0.3 + 0.7 * L) * (1 - 0.3 * W), dt); // shiny things (the pond) reflect a darker sky too
  tintSky(clouds, scene.fog as THREE.Fog, L, W);
  weather.update(dt, W, camTarget.x, camTarget.z);
  sfx.setMusicMix(1 - L); // the lullaby comes in at dusk
  if (!NORENDER || frame++ % 30 === 0) renderer.render(scene, camera);
  watchFps();
});
