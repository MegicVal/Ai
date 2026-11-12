import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { BuiltPart } from "../types";

/** Physically based finishes, lit by the studio environment map. */
const PALETTE = {
  white: { color: 0xeef1f0, roughness: 0.36, metalness: 0.12 }, // painted panels
  green: { color: 0x0a6b5c, roughness: 0.38, metalness: 0.15 },
  dark: { color: 0x2b312f, roughness: 0.58, metalness: 0.45 }, // cast and black-painted steel
  steel: { color: 0xd0d6d3, roughness: 0.2, metalness: 1 }, // machined steel
  plate: { color: 0x6c777c, roughness: 0.5, metalness: 0.85 }, // raw plate and sections
  rubber: { color: 0x141817, roughness: 0.85, metalness: 0 },
  yellow: { color: 0xf0b400, roughness: 0.5, metalness: 0.1 },
  red: { color: 0xc8221c, roughness: 0.45, metalness: 0.1 },
  hot: { color: 0xe2571c, roughness: 0.5, metalness: 0.1, emissive: 0xe2571c, emissiveIntensity: 1.6 },
  lampRed: { color: 0xff3b30, emissive: 0xff3b30, emissiveIntensity: 0.5, roughness: 0.3 },
  lampAmber: { color: 0xffb020, emissive: 0xffb020, emissiveIntensity: 0.5, roughness: 0.3 },
  lampGreen: { color: 0x35d06a, emissive: 0x35d06a, emissiveIntensity: 2.2, roughness: 0.3 },
  glass: { color: 0xa9c9cf, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.26, depthWrite: false },
} satisfies Record<string, THREE.MeshStandardMaterialParameters>;

export type Tone = keyof typeof PALETTE;
type Axis = "x" | "y" | "z";
/** Finishes that should not light up when their component is selected. */
const FIXED: Tone[] = ["hot", "lampRed", "lampAmber", "lampGreen", "glass"];

const shared = new Map<string, THREE.Texture>();
function sharedTexture(key: string, make: () => THREE.Texture): THREE.Texture {
  let texture = shared.get(key);
  if (!texture) shared.set(key, (texture = make()));
  return texture;
}

/**
 * Modelling kit for the placeholder machines. Parts are built from bevelled boxes
 * and cylinders, then dressed with the things real lines have: motors, hoses,
 * cable chains, safety fencing, tower lights, hazard markings and name plates.
 * Every part owns its materials, so one part can be highlighted on its own.
 */
export class Kit {
  readonly parts: Record<string, BuiltPart> = {};
  readonly trash: { dispose(): void }[] = [];
  private current: BuiltPart = { group: new THREE.Group(), materials: [] };
  private tones = new Map<string, THREE.MeshStandardMaterial>();
  private readonly geometries = new Map<string, THREE.BufferGeometry>();

  /** Starts (or returns to) a part; everything added afterwards belongs to it. */
  part(id: string): THREE.Group {
    if (!this.parts[id]) this.parts[id] = { group: new THREE.Group(), materials: [] };
    this.current = this.parts[id];
    this.tones = (this.current.group.userData.tones ??= new Map<string, THREE.MeshStandardMaterial>());
    return this.current.group;
  }

  tone(name: Tone): THREE.MeshStandardMaterial {
    let material = this.tones.get(name);
    if (!material) {
      material = new THREE.MeshStandardMaterial(PALETTE[name]);
      this.tones.set(name, material);
      this.trash.push(material);
      if (!FIXED.includes(name)) this.current.materials.push(material);
    }
    return material;
  }

  private geometry(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
    let geometry = this.geometries.get(key);
    if (!geometry) {
      geometry = make();
      this.geometries.set(key, geometry);
      this.trash.push(geometry);
    }
    return geometry;
  }

  mesh(geometry: THREE.BufferGeometry, tone: Tone | THREE.Material, x: number, y: number, z: number): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, typeof tone === "string" ? this.tone(tone) : tone);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.current.group.add(mesh);
    return mesh;
  }

  /** Box with softly bevelled edges, as on folded and machined metal. */
  box(w: number, h: number, d: number, tone: Tone | THREE.Material, x: number, y: number, z: number): THREE.Mesh {
    const thin = Math.min(w, h, d);
    const radius = Math.min(0.022, thin * 0.3);
    const key = `b${w.toFixed(3)}_${h.toFixed(3)}_${d.toFixed(3)}`;
    const geometry = this.geometry(key, () => (thin < 0.035 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 2, radius)));
    return this.mesh(geometry, tone, x, y, z);
  }

  /** Cylinder along `axis` (default vertical). `r2` gives a cone or taper. */
  cyl(r: number, h: number, tone: Tone | THREE.Material, x: number, y: number, z: number, axis: Axis = "y", r2 = r): THREE.Mesh {
    const key = `c${r.toFixed(3)}_${r2.toFixed(3)}_${h.toFixed(3)}`;
    const mesh = this.mesh(this.geometry(key, () => new THREE.CylinderGeometry(r, r2, h, r > 0.2 ? 48 : 24)), tone, x, y, z);
    if (axis === "x") mesh.rotation.z = Math.PI / 2;
    if (axis === "z") mesh.rotation.x = Math.PI / 2;
    return mesh;
  }

  add(object: THREE.Object3D): void {
    this.current.group.add(object);
  }

  /** Builds into a sub-group of the current part (for assemblies that move together). */
  within<T>(group: THREE.Group, build: () => T): T {
    const part = this.current.group;
    this.current.group = group;
    try {
      return build();
    } finally {
      this.current.group = part;
    }
  }

  /** Geared motor with cooling fins, shaft along `axis`. */
  motor(x: number, y: number, z: number, axis: Axis = "x", size = 1): void {
    const along = (offset: number): [number, number, number] =>
      axis === "x" ? [x + offset, y, z] : axis === "z" ? [x, y, z + offset] : [x, y + offset, z];
    this.cyl(0.1 * size, 0.3 * size, "dark", ...along(0), axis);
    for (let i = -2; i <= 2; i++) this.cyl(0.115 * size, 0.014, "dark", ...along(i * 0.05 * size), axis);
    this.cyl(0.085 * size, 0.05 * size, "steel", ...along(0.17 * size), axis);
    this.cyl(0.1 * size, 0.04 * size, "rubber", ...along(-0.17 * size), axis);
    const box = along(0.02 * size);
    this.box(0.1 * size, 0.07 * size, 0.1 * size, "dark", box[0], box[1] + (axis === "y" ? 0 : 0.12 * size), box[2] + (axis === "y" ? 0.12 * size : 0));
    const gear = along(0.27 * size);
    this.box(0.17 * size, 0.2 * size, 0.17 * size, "steel", ...gear);
  }

  /** Red, amber and green signal tower. */
  towerLight(x: number, y: number, z: number): void {
    this.cyl(0.014, 0.3, "steel", x, y + 0.15, z);
    this.cyl(0.036, 0.055, "lampRed", x, y + 0.44, z);
    this.cyl(0.036, 0.055, "lampAmber", x, y + 0.385, z);
    this.cyl(0.036, 0.055, "lampGreen", x, y + 0.33, z);
    this.cyl(0.038, 0.012, "dark", x, y + 0.474, z);
  }

  /** Levelling feet under a frame. */
  feet(points: [number, number][]): void {
    points.forEach(([x, z]) => {
      this.cyl(0.09, 0.025, "steel", x, 0.0125, z);
      this.cyl(0.022, 0.09, "steel", x, 0.06, z);
    });
  }

  /** Flexible hose or cable through the given points. */
  hose(points: [number, number, number][], radius = 0.022, tone: Tone = "rubber"): void {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    const geometry = new THREE.TubeGeometry(curve, Math.max(12, points.length * 8), radius, 8);
    this.trash.push(geometry);
    this.mesh(geometry, tone, 0, 0, 0);
  }

  /** Energy chain lying in its tray, from `a` to `b` along `axis`. */
  cableChain(a: number, b: number, y: number, fixed: number, axis: "x" | "z" = "x"): void {
    const length = b - a;
    const mid = (a + b) / 2;
    if (axis === "x") this.box(length, 0.02, 0.16, "steel", mid, y - 0.035, fixed);
    else this.box(0.16, 0.02, length, "steel", fixed, y - 0.035, mid);
    for (let at = a + 0.05; at < b; at += 0.1) {
      if (axis === "x") this.box(0.085, 0.05, 0.11, "rubber", at, y, fixed);
      else this.box(0.11, 0.05, 0.085, "rubber", fixed, y, at);
    }
  }

  /** Yellow and black hazard marking. */
  hazard(w: number, h: number, d: number, x: number, y: number, z: number): THREE.Mesh {
    const texture = sharedTexture("hazard", () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#f0b400";
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = "#141817";
      // 45° stripes that tile: black where (x + y) mod 64 < 32
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(32, 0);
      ctx.lineTo(0, 32);
      ctx.closePath();
      ctx.moveTo(64, 0);
      ctx.lineTo(64, 32);
      ctx.lineTo(32, 64);
      ctx.lineTo(0, 64);
      ctx.closePath();
      ctx.fill();
      const result = new THREE.CanvasTexture(canvas);
      result.colorSpace = THREE.SRGBColorSpace;
      result.wrapS = result.wrapT = THREE.RepeatWrapping;
      return result;
    });
    const map = texture.clone();
    const long = Math.max(w, h, d);
    map.repeat.set(Math.max(1, Math.round(long / 0.25)), 1);
    map.needsUpdate = true;
    const material = new THREE.MeshStandardMaterial({ map, roughness: 0.6 });
    this.trash.push(map, material);
    const mesh = this.box(w, h, d, material, x, y, z);
    return mesh;
  }

  /** Mesh safety fencing on yellow posts, through the given floor points. */
  fence(points: [number, number][], height = 2): void {
    const alpha = sharedTexture("mesh", () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, 64, 64);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 5;
      ctx.strokeRect(0, 0, 64, 64);
      const result = new THREE.CanvasTexture(canvas);
      result.wrapS = result.wrapT = THREE.RepeatWrapping;
      return result;
    });
    for (let i = 0; i < points.length; i++) {
      const [x, z] = points[i];
      this.box(0.06, height, 0.06, "yellow", x, height / 2, z);
      this.box(0.16, 0.012, 0.16, "yellow", x, 0.006, z);
      const next = points[i + 1];
      if (!next) continue;
      const dx = next[0] - x;
      const dz = next[1] - z;
      const length = Math.hypot(dx, dz);
      const map = alpha.clone();
      map.repeat.set(Math.round(length / 0.07), Math.round((height - 0.25) / 0.07));
      map.needsUpdate = true;
      const material = new THREE.MeshStandardMaterial({ color: 0x1b201e, alphaMap: map, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.7, metalness: 0.4 });
      const geometry = new THREE.PlaneGeometry(length, height - 0.25);
      const panel = new THREE.Mesh(geometry, material);
      panel.position.set(x + dx / 2, (height - 0.25) / 2 + 0.2, z + dz / 2);
      panel.rotation.y = -Math.atan2(dz, dx);
      panel.raycast = () => {};
      this.add(panel);
      this.trash.push(map, material, geometry);
      const rail = this.box(length, 0.035, 0.035, "yellow", x + dx / 2, height - 0.02, z + dz / 2);
      rail.rotation.y = -Math.atan2(dz, dx);
    }
  }

  /** Lettering applied to a panel, facing +Z before `turn` (radians about Y). */
  nameplate(text: string, width: number, x: number, y: number, z: number, turn = 0, color = "#f4f6f5"): void {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 160;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.font = "800 130px Arial, Helvetica, sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    const measured = ctx.measureText(text).width;
    ctx.save();
    ctx.translate(512, 86);
    ctx.scale(Math.min(1, 980 / measured), 1);
    ctx.fillText(text, 0, 0);
    ctx.restore();
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    const material = new THREE.MeshStandardMaterial({ map, transparent: true, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -4 });
    const used = Math.min(1, measured / 980);
    const geometry = new THREE.PlaneGeometry(width, (width * 160) / 1024);
    const plate = new THREE.Mesh(geometry, material);
    plate.scale.x = Math.max(0.5, used);
    plate.position.set(x, y, z);
    plate.rotation.y = turn;
    plate.raycast = () => {};
    this.add(plate);
    this.trash.push(map, material, geometry);
  }

  /** Roller conveyor running along X between x0 and x1, centred on z, with drive and feet. */
  conveyor(x0: number, x1: number, z: number, width: number, y = 0.7, step = 0.42): void {
    const length = x1 - x0;
    const mid = (x0 + x1) / 2;
    [1, -1].forEach((side) => {
      this.box(length, 0.16, 0.06, "white", mid, y - 0.03, z + (side * width) / 2);
      this.box(length, 0.02, 0.13, "white", mid, y + 0.06, z + side * (width / 2 + 0.035));
      this.box(length, 0.02, 0.13, "white", mid, y - 0.12, z + side * (width / 2 + 0.035));
    });
    for (let x = x0 + step / 2; x < x1; x += step) {
      this.cyl(0.052, width - 0.1, "steel", x, y, z, "z");
      this.cyl(0.018, width + 0.05, "dark", x, y, z, "z");
    }
    const legs = Math.max(2, Math.round(length / 2.2) + 1);
    for (let i = 0; i < legs; i++) {
      const x = x0 + 0.25 + (i * (length - 0.5)) / (legs - 1);
      [1, -1].forEach((side) => {
        this.box(0.1, y - 0.12, 0.1, "dark", x, (y - 0.12) / 2, z + (side * width) / 2);
        this.box(0.24, 0.02, 0.24, "dark", x, 0.01, z + (side * width) / 2);
      });
      this.box(0.06, 0.06, width, "dark", x, y * 0.42, z);
    }
    this.motor(x0 + 0.55, y - 0.3, z + width / 2 + 0.2, "x", 0.9);
    this.box(0.5, 0.26, 0.05, "green", x0 + 0.55, y - 0.1, z + width / 2 + 0.07);
  }

  /** I-beam lying along X, resting at height y. */
  beam(length: number, x: number, y: number, z: number, h = 0.5, w = 0.32, tone: Tone = "plate"): THREE.Group {
    const group = new THREE.Group();
    const previous = this.current.group;
    this.current.group = group;
    this.box(length, 0.04, w, tone, 0, 0.02, 0);
    this.box(length, h - 0.08, 0.03, tone, 0, h / 2, 0);
    this.box(length, 0.04, w, tone, 0, h - 0.02, 0);
    this.current.group = previous;
    group.position.set(x, y, z);
    previous.add(group);
    return group;
  }

  /** Operator console: lit screen, keys, emergency stop, signal tower. Returns the screen centre. */
  console(x: number, z: number, facing = -0.5): THREE.Vector3 {
    this.part("cnc");
    this.box(0.56, 0.03, 0.5, "dark", x, 0.015, z);
    this.box(0.44, 1.02, 0.36, "white", x, 0.54, z);
    this.box(0.46, 0.05, 0.38, "green", x, 0.96, z);
    const tilt = new THREE.Euler(-0.28, facing, 0, "YXZ");
    const normal = new THREE.Vector3(0, 0, 1).applyEuler(tilt);
    const side = new THREE.Vector3(1, 0, 0).applyEuler(tilt);
    const housing = this.box(0.9, 0.6, 0.08, "dark", x, 1.4, z);
    housing.rotation.copy(tilt);
    const material = new THREE.MeshBasicMaterial({ map: screenTexture("CNC"), toneMapped: false });
    const geometry = new THREE.PlaneGeometry(0.66, 0.44);
    const screen = new THREE.Mesh(geometry, material);
    screen.position.set(x, 1.42, z).addScaledVector(normal, 0.045).addScaledVector(side, -0.08);
    screen.rotation.copy(tilt);
    this.add(screen);
    this.trash.push(geometry, material, material.map!);
    // key column beside the screen, emergency stop below it
    for (let i = 0; i < 4; i++) {
      const key = this.box(0.07, 0.06, 0.02, i === 0 ? "lampGreen" : "steel", x, 1.56 - i * 0.09, z);
      key.position.addScaledVector(normal, 0.05).addScaledVector(side, 0.36);
      key.rotation.copy(tilt);
    }
    const shelf = this.box(0.7, 0.03, 0.22, "dark", x, 1.08, z);
    shelf.position.addScaledVector(normal, 0.16);
    shelf.rotation.set(0, facing, 0);
    const stopBase = this.cyl(0.05, 0.02, "yellow", x, 1.1, z);
    stopBase.position.addScaledVector(normal, 0.2).addScaledVector(side, 0.26);
    const stop = this.cyl(0.035, 0.035, "red", x, 1.125, z);
    stop.position.copy(stopBase.position).setY(1.125);
    this.towerLight(x - side.x * 0.38, 1.68, z - side.z * 0.38);
    this.hose([[x, 0.2, z - 0.2], [x, 0.06, z - 0.5], [x + 0.1, 0.04, z - 1.0]], 0.025);
    return new THREE.Vector3(x, 1.42, z);
  }

  /** Electrical cabinet with doors, handles, vents, main switch and cable riser. */
  cabinet(x: number, z: number, w = 0.5, h = 1.7, d = 1.3): void {
    this.box(w + 0.04, 0.1, d + 0.04, "dark", x, 0.05, z);
    this.box(w, h, d, "white", x, 0.1 + h / 2, z);
    this.box(w + 0.015, 0.07, d + 0.01, "green", x, h - 0.05, z);
    const face = x + w / 2 + 0.004; // doors on the side that faces the camera
    for (const at of [-d / 4, d / 4]) {
      this.box(0.006, h - 0.3, d / 2 - 0.03, "white", face, 0.1 + h / 2 - 0.08, z + at);
      this.box(0.03, 0.16, 0.025, "steel", face + 0.015, 0.95, z + at + (at < 0 ? d / 4 - 0.08 : -d / 4 + 0.08));
      for (let i = 0; i < 5; i++) this.box(0.008, 0.012, d / 2 - 0.2, "dark", face + 0.004, 0.32 + i * 0.03, z + at);
    }
    this.cyl(0.06, 0.02, "yellow", face + 0.01, 1.3, z + d / 4, "x");
    this.box(0.03, 0.03, 0.1, "red", face + 0.03, 1.3, z + d / 4);
    this.box(0.14, 0.5, 0.14, "steel", x, h + 0.35, z);
    this.box(0.14, 0.08, d * 0.9, "steel", x, h + 0.14, z);
  }

  /** Floating software panel; invisible until the machine is exploded. */
  software(at: THREE.Vector3): (explode: number, camera: THREE.Camera) => void {
    const group = this.part("sw");
    const material = new THREE.MeshBasicMaterial({ map: screenTexture("SOFTWARE"), transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false });
    const geometry = new THREE.PlaneGeometry(1.6, 1.0);
    group.add(new THREE.Mesh(geometry, material));
    const frameGeometry = new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.72, 1.12));
    const frameMaterial = new THREE.LineBasicMaterial({ color: 0x2cc4a6, transparent: true, opacity: 0, toneMapped: false });
    const frame = new THREE.LineSegments(frameGeometry, frameMaterial);
    frame.raycast = () => {};
    group.add(frame);
    this.trash.push(geometry, material, material.map!, frameGeometry, frameMaterial);
    return (explode, camera) => {
      group.position.copy(at);
      group.scale.setScalar(0.45 + 0.55 * explode);
      group.quaternion.copy(camera.quaternion);
      material.opacity = explode;
      frameMaterial.opacity = explode;
    };
  }

  /** Sparks falling from a point, for cutting torches and hot billets. */
  sparks(at: THREE.Vector3, floor: number, count = 60): (dt: number, live: number) => void {
    const positions = new Float32Array(count * 3);
    const state = Array.from({ length: count }, () => [0, 0, 0, 0]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0xffb060, size: 0.05, transparent: true, depthWrite: false, toneMapped: false });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.raycast = () => {};
    const light = new THREE.PointLight(0xff7a3d, 4, 3.5, 2);
    light.position.copy(at);
    this.add(points);
    this.add(light);
    this.trash.push(geometry, material);
    return (dt, live) => {
      for (let i = 0; i < count; i++) {
        const s = state[i];
        s[3] -= dt;
        if (s[3] <= 0) {
          positions[i * 3] = at.x;
          positions[i * 3 + 1] = at.y;
          positions[i * 3 + 2] = at.z;
          const angle = Math.random() * Math.PI * 2;
          const speed = 0.5 + Math.random() * 1.6;
          s[0] = Math.cos(angle) * speed;
          s[1] = 0.6 + Math.random() * 1.4;
          s[2] = Math.sin(angle) * speed;
          s[3] = 0.25 + Math.random() * 0.45;
        }
        s[1] -= 6 * dt;
        positions[i * 3] += s[0] * dt;
        positions[i * 3 + 1] = Math.max(floor, positions[i * 3 + 1] + s[1] * dt);
        positions[i * 3 + 2] += s[2] * dt;
      }
      geometry.attributes.position.needsUpdate = true;
      material.opacity = dt === 0 ? 0 : 0.95 * live;
      light.intensity = 4 * live + 0.4;
    };
  }

  dispose(): void {
    this.trash.forEach((item) => item.dispose());
  }
}

function screenTexture(title: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0C1110";
  ctx.fillRect(0, 0, 512, 320);
  ctx.fillStyle = "#ECF0EE";
  ctx.font = "600 20px monospace";
  ctx.fillText(title, 22, 36);
  ctx.strokeStyle = "#2CC4A6";
  ctx.lineWidth = 3;
  [
    [22, 58, 150, 104], [184, 58, 96, 58], [292, 58, 198, 84], [184, 128, 96, 34],
    [22, 176, 112, 122], [146, 176, 158, 56], [316, 154, 174, 144], [146, 244, 158, 54],
  ].forEach(([x, y, w, h]) => ctx.strokeRect(x, y, w, h));
  ctx.fillStyle = "#2CC4A6";
  [[60, 96], [120, 130], [340, 96], [440, 110], [70, 236], [380, 220], [440, 270], [220, 204]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#E2571C";
  ctx.fillRect(22, 308, 300, 5);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
