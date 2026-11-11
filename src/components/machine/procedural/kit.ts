import * as THREE from "three";
import type { BuiltPart } from "../types";

const PALETTE = {
  white: { color: 0xf4f6f5, roughness: 0.62, metalness: 0.08 },
  dark: { color: 0x3d4844, roughness: 0.55, metalness: 0.25 },
  steel: { color: 0xbfc8c4, roughness: 0.35, metalness: 0.6 },
  plate: { color: 0xc4ccc8, roughness: 0.38, metalness: 0.55 },
  green: { color: 0x00705f, roughness: 0.5, metalness: 0.25 },
  hot: { color: 0xe2571c, roughness: 0.5, metalness: 0.1, emissive: 0xe2571c, emissiveIntensity: 0.9 },
} satisfies Record<string, THREE.MeshStandardMaterialParameters>;

export type Tone = keyof typeof PALETTE;
type Axis = "x" | "y" | "z";

/**
 * Small modelling kit for the placeholder machines: boxes and cylinders grouped into
 * named parts, each with its own materials so a part can be highlighted on its own.
 */
export class Kit {
  readonly parts: Record<string, BuiltPart> = {};
  readonly trash: { dispose(): void }[] = [];
  private current: BuiltPart = { group: new THREE.Group(), materials: [] };
  private tones = new Map<string, THREE.MeshStandardMaterial>();

  constructor(private readonly lineMaterial: THREE.LineBasicMaterial) {}

  /** Starts a new part; everything added afterwards belongs to it. */
  part(id: string): THREE.Group {
    this.current = this.parts[id] ?? { group: new THREE.Group(), materials: [] };
    this.parts[id] = this.current;
    this.tones = new Map();
    return this.current.group;
  }

  tone(name: Tone): THREE.MeshStandardMaterial {
    let material = this.tones.get(name);
    if (!material) {
      material = new THREE.MeshStandardMaterial(PALETTE[name]);
      this.tones.set(name, material);
      this.trash.push(material);
      if (name !== "hot") this.current.materials.push(material);
    }
    return material;
  }

  mesh(geometry: THREE.BufferGeometry, tone: Tone | THREE.Material, x: number, y: number, z: number): THREE.Mesh {
    const material = typeof tone === "string" ? this.tone(tone) : tone;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const edgeGeometry = new THREE.EdgesGeometry(geometry, 35);
    const edges = new THREE.LineSegments(edgeGeometry, this.lineMaterial);
    edges.raycast = () => {};
    mesh.add(edges);
    this.current.group.add(mesh);
    this.trash.push(geometry, edgeGeometry);
    return mesh;
  }

  box(w: number, h: number, d: number, tone: Tone, x: number, y: number, z: number): THREE.Mesh {
    return this.mesh(new THREE.BoxGeometry(w, h, d), tone, x, y, z);
  }

  /** Cylinder along `axis` (default vertical). `r2` gives a cone or taper. */
  cyl(r: number, h: number, tone: Tone, x: number, y: number, z: number, axis: Axis = "y", r2 = r): THREE.Mesh {
    const mesh = this.mesh(new THREE.CylinderGeometry(r, r2, h, 28), tone, x, y, z);
    if (axis === "x") mesh.rotation.z = Math.PI / 2;
    if (axis === "z") mesh.rotation.x = Math.PI / 2;
    return mesh;
  }

  add(object: THREE.Object3D): void {
    this.current.group.add(object);
  }

  /** Roller conveyor running along X between x0 and x1, centred on z. */
  conveyor(x0: number, x1: number, z: number, width: number, y = 0.7, step = 0.42): void {
    const length = x1 - x0;
    const mid = (x0 + x1) / 2;
    this.box(length, 0.14, 0.1, "white", mid, y - 0.02, z + width / 2);
    this.box(length, 0.14, 0.1, "white", mid, y - 0.02, z - width / 2);
    for (let x = x0 + step / 2; x < x1; x += step) this.cyl(0.055, width - 0.08, "steel", x, y, z, "z");
    const legs = Math.max(2, Math.round(length / 2.2) + 1);
    for (let i = 0; i < legs; i++) {
      const x = x0 + 0.25 + (i * (length - 0.5)) / (legs - 1);
      this.box(0.12, y - 0.09, 0.12, "dark", x, (y - 0.09) / 2, z + width / 2);
      this.box(0.12, y - 0.09, 0.12, "dark", x, (y - 0.09) / 2, z - width / 2);
    }
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

  /** Operator console with a lit screen. Returns the screen centre for the software panel. */
  console(x: number, z: number, facing = -0.5): THREE.Vector3 {
    this.part("cnc");
    this.box(0.46, 1.05, 0.4, "dark", x, 0.525, z);
    const housing = this.box(0.86, 0.56, 0.07, "dark", x, 1.38, z);
    housing.rotation.set(-0.28, facing, 0, "YXZ");
    const material = new THREE.MeshBasicMaterial({ map: screenTexture("CNC") });
    const geometry = new THREE.PlaneGeometry(0.78, 0.48);
    const screen = new THREE.Mesh(geometry, material);
    const normal = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(-0.28, facing, 0, "YXZ"));
    screen.position.set(x, 1.38, z).addScaledVector(normal, 0.04);
    screen.rotation.set(-0.28, facing, 0, "YXZ");
    this.add(screen);
    this.trash.push(geometry, material, material.map!);
    return new THREE.Vector3(x, 1.39, z);
  }

  cabinet(x: number, z: number, w = 0.5, h = 1.6, d = 1.25): void {
    this.box(w, h, d, "white", x, h / 2, z);
    this.box(w + 0.02, 0.06, d, "green", x, h - 0.14, z);
  }

  /** Floating software panel; invisible until the machine is exploded. */
  software(at: THREE.Vector3): (explode: number, camera: THREE.Camera) => void {
    const group = this.part("sw");
    const material = new THREE.MeshBasicMaterial({
      map: screenTexture("SOFTWARE"),
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const geometry = new THREE.PlaneGeometry(1.6, 1.0);
    group.add(new THREE.Mesh(geometry, material));
    const frameGeometry = new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.72, 1.12));
    const frameMaterial = new THREE.LineBasicMaterial({ color: 0x2cc4a6, transparent: true, opacity: 0 });
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
    const material = new THREE.PointsMaterial({ color: 0xff9a4d, size: 0.045, transparent: true, depthWrite: false });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.raycast = () => {};
    const light = new THREE.PointLight(0xff7a3d, 3, 3, 2);
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
      light.intensity = 3 * live + 0.4;
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
