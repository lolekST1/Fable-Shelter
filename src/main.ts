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
controls.target.set(0, 0.55, 0);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 3.5;
controls.maxDistance = 14;
controls.minPolarAngle = 0.55;
controls.maxPolarAngle = 1.35;

function frameCamera() {
  const portrait = window.innerHeight > window.innerWidth;
  const dist = portrait ? 10 : 7.5;
  const elev = THREE.MathUtils.degToRad(34);
  camera.position.set(0, Math.sin(elev) * dist + 0.55, Math.cos(elev) * dist);
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

let creature: Creature | null = null;
const hint = document.getElementById('hint')!;

const texLoader = new THREE.TextureLoader();
const concept = texLoader.load('textures/chmurnik.jpg');
concept.colorSpace = THREE.SRGBColorSpace;
async function loadModel(name: string) {
  // models ship as base64 text so the page can be served from any static host
  const res = await fetch(`models/${name}.glb.txt`);
  const bin = Uint8Array.from(atob((await res.text()).trim()), (c) => c.charCodeAt(0));
  return new GLTFLoader().parseAsync(bin.buffer, '');
}

loadModel('chmurnik').then((gltf) => {
  creature = new Creature(gltf, concept, chmurnikData as CreatureData, 1.1, shadowTex);
  scene.add(creature.root);
  creature.onHopPeak = () => {
    rain.trigger(new THREE.Vector3(0, 1.85, 0));
    sfx.drizzle();
  };
});

// input: tap the creature to make it hop, drag to orbit; the creature follows taps elsewhere with its gaze
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
  if (moved > 10 || performance.now() - downAt.t > 450 || !creature) return;
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObject(creature.root, true).length > 0;
  if (hit) {
    creature.hop();
    sfx.boing();
    hint.classList.add('hidden');
  } else {
    const p = new THREE.Vector3();
    if (ray.ray.intersectPlane(groundPlane, p)) creature.lookAt(p.x, p.z);
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
  creature?.update(dt);
  rain.update(dt, 1.1);
  controls.update();
  renderer.render(scene, camera);
});
