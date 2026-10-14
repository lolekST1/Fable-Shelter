import * as THREE from 'three';

export function blobShadowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(40,60,50,0.55)');
  grad.addColorStop(0.5, 'rgba(40,60,50,0.25)');
  grad.addColorStop(1, 'rgba(40,60,50,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function buildSky(scene: THREE.Scene) {
  const geo = new THREE.SphereGeometry(80, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x8fcde8) },
      mid: { value: new THREE.Color(0xd6eef5) },
      bottom: { value: new THREE.Color(0xfbf1dc) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP;
      void main(){ float h = normalize(vP).y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.6, h)) : mix(mid, bottom, smoothstep(0.0, -0.3, h)); gl_FragColor = vec4(c, 1.0);
#include <colorspace_fragment>
      }`,
  });
  scene.add(new THREE.Mesh(geo, mat));

  // soft puffy clouds
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xdde9ef, emissiveIntensity: 0.5 });
  const r = rand(7);
  const clouds = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Group();
    const n = 4 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), cloudMat);
      const sz = 1.2 + r() * 1.3;
      s.scale.set(sz, sz * 0.8, sz);
      s.position.set((k - n / 2) * 1.4, r() * 0.6, r() * 0.8);
      c.add(s);
    }
    const ang = (i / 7) * Math.PI * 2 + r();
    c.position.set(Math.sin(ang) * 38, 9 + r() * 7, Math.cos(ang) * 38 - 8);
    c.lookAt(0, c.position.y, 0);
    clouds.add(c);
  }
  scene.add(clouds);
  return clouds;
}

/** things the keeper bumps into: round bushes and the fence arc behind the pen */
export interface Obstacles {
  circles: [number, number, number][];
  fence: { radius: number; halfAngle: number };
}

export function buildGround(scene: THREE.Scene, shadowTex: THREE.Texture): Obstacles {
  // meadow disc with vertex-coloured patches
  const geo = new THREE.CircleGeometry(30, 96, 0, Math.PI * 2);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors: number[] = [];
  const a = new THREE.Color(0x9ccf6e);
  const b = new THREE.Color(0x6aaf4f);
  const edge = new THREE.Color(0xc9e2a0);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const n = (Math.sin(x * 0.7) * Math.cos(z * 0.6) + Math.sin(x * 0.23 + z * 0.31)) * 0.5 + 0.5;
    tmp.copy(a).lerp(b, n * 0.6);
    const d = Math.sqrt(x * x + z * z) / 30;
    tmp.lerp(edge, THREE.MathUtils.smoothstep(d, 0.55, 1));
    colors.push(tmp.r, tmp.g, tmp.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  ground.receiveShadow = true;
  scene.add(ground);

  // a softly worn path toward the camera
  const path = new THREE.Mesh(
    new THREE.CircleGeometry(1, 48),
    new THREE.MeshLambertMaterial({ color: 0xe8cf98, transparent: true, opacity: 0.9 }),
  );
  path.rotation.x = -Math.PI / 2;
  path.scale.set(1.5, 1.2, 1);
  path.position.set(0, 0.005, 0.2);
  scene.add(path);

  const r = rand(42);
  const dummy = new THREE.Object3D();

  // plush grass pompoms: small squashed spheres in three greens
  const pomGeo = new THREE.SphereGeometry(0.12, 10, 8);
  pomGeo.scale(1, 0.55, 1);
  const N = 1500;
  const tufts = new THREE.InstancedMesh(pomGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), N);
  const tuftColor = new THREE.Color();
  for (let i = 0; i < N; i++) {
    let x = 0, z = 0;
    if (i % 3 === 0) {
      do { x = (r() - 0.5) * 30; z = (r() - 0.5) * 30; } while (x * x + z * z < 5 || x * x + z * z > 230);
    } else {
      // cluster next to the previous pompom
      const prev = new THREE.Matrix4(); tufts.getMatrixAt(i - 1, prev);
      const pp = new THREE.Vector3().setFromMatrixPosition(prev);
      x = pp.x + (r() - 0.5) * 0.3; z = pp.z + (r() - 0.5) * 0.3;
    }
    dummy.position.set(x, 0.02, z);
    dummy.rotation.set(0, r() * 6.28, 0);
    dummy.scale.setScalar(0.6 + r() * 0.9);
    dummy.updateMatrix();
    tufts.setMatrixAt(i, dummy.matrix);
    tufts.setColorAt(i, tuftColor.setHSL(0.25 + r() * 0.07, 0.6, 0.3 + r() * 0.12));
  }
  scene.add(tufts);

  // flowers: stem + round head
  const palette = [0xff8fb0, 0xffe066, 0xffffff, 0xb9a3ff, 0xffa66b, 0x8fd3ff];
  const headGeo = new THREE.SphereGeometry(0.09, 10, 8);
  const stemGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.28, 5);
  stemGeo.translate(0, 0.14, 0);
  const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), 260);
  const stems = new THREE.InstancedMesh(stemGeo, new THREE.MeshLambertMaterial({ color: 0x5d9c48 }), 260);
  const fc = new THREE.Color();
  for (let i = 0; i < 260; i++) {
    let x = 0, z = 0;
    do { x = (r() - 0.5) * 22; z = (r() - 0.5) * 22; } while (x * x + z * z < 6);
    const h = 0.8 + r() * 0.6;
    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, h, 1);
    dummy.updateMatrix();
    stems.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, 0.28 * h, z);
    dummy.scale.setScalar(0.8 + r() * 0.6);
    dummy.updateMatrix();
    heads.setMatrixAt(i, dummy.matrix);
    heads.setColorAt(i, fc.set(palette[Math.floor(r() * palette.length)]));
  }
  scene.add(stems, heads);

  // round bushes
  const bushMat = new THREE.MeshLambertMaterial({ color: 0x5fa64f });
  const bushes: [number, number, number][] = [[-4.2, -3.5, 1.1], [4.6, -4.2, 1.3], [-6.5, 1.5, 0.9], [6.8, 0.8, 1], [-2.6, -6.5, 0.8], [2.4, -7.2, 1.2]];
  for (const [x, z, s] of bushes) {
    const g = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), bushMat);
      m.position.set((r() - 0.5) * 0.8, 0.4 + r() * 0.3, (r() - 0.5) * 0.6);
      m.scale.setScalar(0.8 + r() * 0.5);
      g.add(m);
    }
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    const sh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.4),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.012;
    g.add(sh);
    scene.add(g);
  }

  // a small wooden fence arc behind the pen
  const woodMat = new THREE.MeshLambertMaterial({ color: 0xc89a6a });
  const fence = new THREE.Group();
  const n = 9;
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI * 0.32 + (i / (n - 1)) * Math.PI * 0.64;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.8, 8), woodMat);
    post.position.set(Math.sin(ang) * 3.6, 0.4, -Math.cos(ang) * 3.6);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), woodMat);
    cap.position.y = 0.42;
    post.add(cap);
    fence.add(post);
    if (i < n - 1) {
      const ang2 = -Math.PI * 0.32 + ((i + 1) / (n - 1)) * Math.PI * 0.64;
      const a3 = new THREE.Vector3(Math.sin(ang) * 3.6, 0, -Math.cos(ang) * 3.6);
      const b3 = new THREE.Vector3(Math.sin(ang2) * 3.6, 0, -Math.cos(ang2) * 3.6);
      for (const y of [0.3, 0.6]) {
        const len = a3.distanceTo(b3);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.07, 0.05), woodMat);
        rail.position.copy(a3).lerp(b3, 0.5).setY(y);
        rail.rotation.y = -Math.atan2(b3.z - a3.z, b3.x - a3.x);
        fence.add(rail);
      }
    }
  }
  scene.add(fence);
  return {
    circles: bushes.map(([x, z, s]) => [x, z, 0.75 * s] as [number, number, number]),
    fence: { radius: 3.6, halfAngle: Math.PI * 0.32 },
  };
}

/** A little rain cloud that appears over the creature, drizzles and fades. */
export class RainPuff {
  group = new THREE.Group();
  private drops: THREE.InstancedMesh;
  private dropState: { y: number; x: number; z: number; v: number }[] = [];
  private life = -1;
  private puffMat: THREE.MeshLambertMaterial;
  private dummy = new THREE.Object3D();

  constructor(scene: THREE.Scene) {
    this.puffMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xc8d6e6, emissiveIntensity: 0.4, transparent: true });
    const cloud = new THREE.Group();
    const parts: [number, number, number, number][] = [[0, 0, 0, 0.32], [0.3, -0.04, 0.05, 0.25], [-0.3, -0.05, 0, 0.24], [0.12, 0.14, -0.05, 0.22], [-0.14, 0.1, 0.06, 0.2]];
    for (const [x, y, z, s] of parts) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), this.puffMat);
      m.position.set(x, y, z);
      m.scale.setScalar(s);
      cloud.add(m);
    }
    this.group.add(cloud);
    const dropGeo = new THREE.SphereGeometry(0.035, 8, 6);
    dropGeo.scale(1, 1.8, 1);
    this.drops = new THREE.InstancedMesh(
      dropGeo,
      new THREE.MeshStandardMaterial({ color: 0x8fd0ff, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.9 }),
      14,
    );
    for (let i = 0; i < 14; i++) this.dropState.push({ y: -Math.random(), x: 0, z: 0, v: 0 });
    this.group.add(this.drops);
    this.group.visible = false;
    scene.add(this.group);
  }

  trigger(at: THREE.Vector3) {
    this.group.position.copy(at);
    this.life = 0;
    this.group.visible = true;
    for (const d of this.dropState) this.respawn(d, Math.random() * 0.4);
  }

  private respawn(d: { y: number; x: number; z: number; v: number }, y = 0) {
    d.x = (Math.random() - 0.5) * 0.6;
    d.z = (Math.random() - 0.5) * 0.3;
    d.y = -0.15 - y;
    d.v = 0;
  }

  update(dt: number, floorY: number) {
    if (this.life < 0) return;
    this.life += dt;
    const L = this.life;
    const appear = THREE.MathUtils.smoothstep(L, 0, 0.25);
    const fade = 1 - THREE.MathUtils.smoothstep(L, 2.2, 2.8);
    const s = appear * (0.9 + 0.1 * Math.sin(L * 6));
    this.group.children[0].scale.setScalar(Math.max(0.001, s));
    this.group.position.y += Math.sin(L * 3) * 0.002;
    this.puffMat.opacity = fade;
    (this.drops.material as THREE.Material).opacity = 0.9 * fade;
    for (let i = 0; i < this.dropState.length; i++) {
      const d = this.dropState[i];
      d.v += 9.8 * dt;
      d.y -= d.v * dt;
      if (this.group.position.y + d.y < floorY && L < 2.2) this.respawn(d);
      this.dummy.position.set(d.x, d.y, d.z);
      this.dummy.scale.setScalar(L < 0.25 ? 0.001 : 1);
      this.dummy.updateMatrix();
      this.drops.setMatrixAt(i, this.dummy.matrix);
    }
    this.drops.instanceMatrix.needsUpdate = true;
    if (L > 2.9) {
      this.life = -1;
      this.group.visible = false;
    }
  }
}
