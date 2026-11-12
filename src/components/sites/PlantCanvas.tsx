"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, type RefObject } from "react";
import * as THREE from "three";
import type { Plant, SiteControl } from "./types";

const SKY = 0xc7d5d9;

/** Paints a repeating façade: `draw` works in metres on a tile `w` × `h` metres. */
function facade(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, m: number) => void): THREE.CanvasTexture {
  const scale = 512 / h;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  // draw with the origin at the ground, y up
  ctx.translate(0, canvas.height);
  ctx.scale(1, -1);
  draw(ctx, scale);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  // Extruded walls get u = metres along the wall and v = 1 − height.
  texture.repeat.set(1 / w, -1 / h);
  texture.offset.set(0, 1 / h);
  return texture;
}

function hallFacade(own: boolean) {
  return facade(24, 12, (ctx, m) => {
    ctx.fillStyle = own ? "#e4e8e6" : "#cfd3d0";
    ctx.fillRect(0, 0, 24 * m, 12 * m);
    ctx.fillStyle = "rgba(0,0,0,0.06)"; // sheet-metal ribs
    for (let x = 0; x < 24; x += 0.3) ctx.fillRect(x * m, 1.1 * m, 0.05 * m, 10.9 * m);
    ctx.fillStyle = "#9aa29e"; // concrete plinth
    ctx.fillRect(0, 0, 24 * m, 1.1 * m);
    ctx.fillStyle = "#4f6672"; // ribbon window
    ctx.fillRect(0, 7.4 * m, 24 * m, 1.5 * m);
    ctx.fillStyle = "#dfe4e2";
    for (let x = 0; x < 24; x += 2) ctx.fillRect(x * m, 7.4 * m, 0.08 * m, 1.5 * m);
    ctx.fillStyle = "#6f7a76"; // roller door and a side door
    ctx.fillRect(4 * m, 0, 4.4 * m, 4.6 * m);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (let y = 0.3; y < 4.6; y += 0.35) ctx.fillRect(4 * m, y * m, 4.4 * m, 0.04 * m);
    ctx.fillStyle = "#3d4844";
    ctx.fillRect(15 * m, 0, 1.1 * m, 2.2 * m);
    if (own) {
      ctx.fillStyle = "#00705f";
      ctx.fillRect(0, 10.9 * m, 24 * m, 1.1 * m);
    } else {
      ctx.fillStyle = "#b7bdb9";
      ctx.fillRect(0, 11.5 * m, 24 * m, 0.5 * m);
    }
  });
}

function storeyFacade(wall: string, glass: string, w: number, h: number, shutters = false) {
  return facade(w, h, (ctx, m) => {
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, w * m, h * m);
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(0, 0, w * m, 0.12 * m);
    const ww = shutters ? 1.1 : 2.2;
    const wh = shutters ? 1.4 : 1.7;
    for (let x = shutters ? 1.2 : 0.7; x + ww < w; x += shutters ? 3 : 3.5) {
      ctx.fillStyle = glass;
      ctx.fillRect(x * m, 0.95 * m, ww * m, wh * m);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect((x + ww / 2 - 0.03) * m, 0.95 * m, 0.06 * m, wh * m);
      if (shutters) {
        ctx.fillStyle = "#6b5b47";
        ctx.fillRect((x - 0.42) * m, 0.95 * m, 0.4 * m, wh * m);
        ctx.fillRect((x + ww + 0.02) * m, 0.95 * m, 0.4 * m, wh * m);
      }
    }
  });
}

const insidePolygon = (x: number, y: number, polygon: [number, number][]) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

/**
 * The plant and its neighbourhood, rebuilt from real data: OpenStreetMap footprints
 * extruded over satellite imagery. Roofs wear the satellite photo itself, walls get
 * painted façades, trees are planted wherever the photo shows dark green.
 */
class PlantModel {
  readonly group = new THREE.Group();
  readonly labels: { id: string; at: THREE.Vector3 }[] = [];
  private readonly trash: { dispose(): void }[] = [];
  private readonly point = new THREE.Vector3();
  private readonly imagery: HTMLCanvasElement;
  private readonly ground: THREE.CanvasTexture;
  private readonly roofs: THREE.CanvasTexture;
  private pending: number;
  private dirty = false;
  private planted = false;
  private sinceUpload = 0;
  private time = 0;

  constructor(private readonly plant: Plant) {
    const { ground } = plant;
    const width = ground.east - ground.west;
    const depth = ground.north - ground.south;

    this.imagery = document.createElement("canvas");
    this.imagery.width = this.imagery.height = 256 * ground.n;
    const ctx = this.imagery.getContext("2d", { willReadFrequently: true })!;
    ctx.fillStyle = "#56644f";
    ctx.fillRect(0, 0, this.imagery.width, this.imagery.height);
    this.ground = new THREE.CanvasTexture(this.imagery);
    this.ground.colorSpace = THREE.SRGBColorSpace;
    this.ground.anisotropy = 16;
    // The same photo, addressed in metres, so every roof shows what is really on it.
    this.roofs = this.ground.clone();
    this.roofs.repeat.set(1 / width, 1 / depth);
    this.roofs.offset.set(-ground.west / width, -ground.south / depth);
    this.trash.push(this.ground, this.roofs);
    this.pending = ground.n * ground.n;
    this.loadImagery(ctx);

    const far = this.mesh(new THREE.PlaneGeometry(7000, 7000), new THREE.MeshBasicMaterial({ color: 0x5d6b55 }));
    far.rotation.x = -Math.PI / 2;
    far.position.y = -0.4;
    const photo = this.mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshBasicMaterial({ map: this.ground, toneMapped: false }));
    photo.rotation.x = -Math.PI / 2;
    photo.position.set((ground.west + ground.east) / 2, 0, -(ground.north + ground.south) / 2);
    const shade = this.mesh(new THREE.PlaneGeometry(width, depth), new THREE.ShadowMaterial({ opacity: 0.38 }));
    shade.rotation.x = -Math.PI / 2;
    shade.position.set(photo.position.x, 0.06, photo.position.z);
    shade.receiveShadow = true;

    const roof = new THREE.MeshBasicMaterial({ map: this.roofs, toneMapped: false });
    const walls: Record<string, THREE.Material> = {
      own: new THREE.MeshStandardMaterial({ map: hallFacade(true), roughness: 0.75, metalness: 0.1 }),
      hall: new THREE.MeshStandardMaterial({ map: hallFacade(false), roughness: 0.8, metalness: 0.1 }),
      office: new THREE.MeshStandardMaterial({ map: storeyFacade("#e9ecea", "#3f5560", 7, 3.5), roughness: 0.7 }),
      house: new THREE.MeshStandardMaterial({ map: storeyFacade("#ddd2bf", "#4a5a62", 6, 3.2, true), roughness: 0.9 }),
    };
    this.trash.push(roof, ...Object.values(walls), ...Object.values(walls).map((m) => (m as THREE.MeshStandardMaterial).map!));

    for (const building of plant.buildings) {
      const shape = new THREE.Shape(building.points.map(([x, y]) => new THREE.Vector2(x, y)));
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: building.height, bevelEnabled: false });
      geometry.rotateX(-Math.PI / 2);
      const wall = building.kind === "office" ? walls.office : building.kind === "house" ? walls.house : building.ficep ? walls.own : walls.hall;
      const mesh = this.mesh(geometry, [roof, wall]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (building.role) {
        const cx = building.points.reduce((sum, p) => sum + p[0], 0) / building.points.length;
        const cy = building.points.reduce((sum, p) => sum + p[1], 0) / building.points.length;
        this.labels.push({ id: building.role, at: new THREE.Vector3(cx, building.height + 7, -cy) });
      }
    }
    this.perimeter(plant.site);
  }

  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[]) {
    const mesh = new THREE.Mesh(geometry, material);
    this.group.add(mesh);
    this.trash.push(geometry, ...(Array.isArray(material) ? [] : [material]));
    return mesh;
  }

  /** A glowing ribbon along the property line. */
  private perimeter(site: [number, number][]) {
    if (!site?.length) return;
    const height = 5;
    const positions: number[] = [];
    const uvs: number[] = [];
    const index: number[] = [];
    site.forEach(([x, y], i) => {
      positions.push(x, 0.3, -y, x, height, -y);
      uvs.push(i, 0, i, 1);
      const a = i * 2;
      const b = ((i + 1) % site.length) * 2;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(index);
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    const fade = ctx.createLinearGradient(0, 64, 0, 0);
    fade.addColorStop(0, "rgba(44,196,166,0.75)");
    fade.addColorStop(1, "rgba(44,196,166,0)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, 4, 64);
    const texture = new THREE.CanvasTexture(canvas);
    const ribbon = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    this.mesh(geometry, ribbon);
    const outline = new THREE.BufferGeometry().setFromPoints(site.map(([x, y]) => new THREE.Vector3(x, 0.35, -y)));
    const line = new THREE.LineLoop(outline, new THREE.LineBasicMaterial({ color: 0x2cc4a6, toneMapped: false }));
    this.group.add(line);
    this.trash.push(texture, outline, line.material as THREE.Material);
  }

  /** Draws the satellite tiles into one canvas shared by ground and roofs. */
  private loadImagery(ctx: CanvasRenderingContext2D) {
    const { tiles, z, x0, y0, n } = this.plant.ground;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
          ctx.drawImage(image, 256 * i, 256 * j);
          this.dirty = true;
          this.pending--;
        };
        image.onerror = () => {
          this.pending--;
        };
        image.src = tiles.replace("{z}", String(z)).replace("{x}", String(x0 + i)).replace("{y}", String(y0 + j));
      }
    }
  }

  /** Reads the photo and plants a tree wherever it shows dark green outside the buildings. */
  private plantTrees() {
    const { ground, buildings } = this.plant;
    let pixels: Uint8ClampedArray;
    try {
      pixels = this.imagery.getContext("2d")!.getImageData(0, 0, this.imagery.width, this.imagery.height).data;
    } catch {
      return; // imagery without cross-origin access: keep the flat photo
    }
    const size = this.imagery.width;
    const perMetre = size / (ground.east - ground.west);
    const boxes = buildings.map((b) => {
      const xs = b.points.map((p) => p[0]);
      const ys = b.points.map((p) => p[1]);
      return { minX: Math.min(...xs) - 3, maxX: Math.max(...xs) + 3, minY: Math.min(...ys) - 3, maxY: Math.max(...ys) + 3, points: b.points };
    });
    const trees: { x: number; y: number; r: number; color: THREE.Color }[] = [];
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let py = 12; py < size && trees.length < 2600; py += 20) {
      for (let px = 12; px < size; px += 20) {
        const at = (py * size + px) * 4;
        const r = pixels[at];
        const g = pixels[at + 1];
        const b = pixels[at + 2];
        if (!(g > r + 5 && g > b + 9 && r + g + b < 285)) continue;
        const x = ground.west + (px + (random() - 0.5) * 14) / perMetre;
        const y = ground.north - (py + (random() - 0.5) * 14) / perMetre;
        if (boxes.some((box) => x > box.minX && x < box.maxX && y > box.minY && y < box.maxY && insidePolygon(x, y, box.points))) continue;
        trees.push({ x, y, r: 3.2 + random() * 3, color: new THREE.Color(r / 255, g / 255, b / 255).multiplyScalar(0.62 + random() * 0.3) });
      }
    }
    if (!trees.length) return;
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const material = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
    const forest = new THREE.InstancedMesh(geometry, material, trees.length);
    const matrix = new THREE.Matrix4();
    const scale = new THREE.Vector3();
    const turn = new THREE.Quaternion();
    trees.forEach((tree, i) => {
      scale.set(tree.r, tree.r * (1.1 + random() * 0.5), tree.r);
      turn.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, random() * 6.28);
      matrix.compose(new THREE.Vector3(tree.x, scale.y * 0.82, -tree.y), turn, scale);
      forest.setMatrixAt(i, matrix);
      forest.setColorAt(i, tree.color);
    });
    forest.castShadow = true;
    forest.receiveShadow = true;
    this.group.add(forest);
    this.trash.push(geometry, material);
  }

  update(camera: THREE.PerspectiveCamera, width: number, height: number, dt: number, control: SiteControl) {
    if (!control.reduce) this.time += dt;
    this.sinceUpload += dt;
    if (this.dirty && (this.sinceUpload > 0.35 || this.pending <= 0)) {
      this.ground.needsUpdate = true;
      this.roofs.needsUpdate = true;
      this.dirty = false;
      this.sinceUpload = 0;
    }
    if (!this.planted && this.pending <= 0) {
      this.planted = true;
      this.plantTrees();
    }

    const radius = 400 * control.zoom;
    const azimuth = 0.5 + Math.sin(this.time * 0.07) * 0.35 + control.yaw;
    const polar = Math.max(0.25, Math.min(1.42, 1.02 - control.pitch));
    camera.position.set(radius * Math.sin(polar) * Math.sin(azimuth), radius * Math.cos(polar), radius * Math.sin(polar) * Math.cos(azimuth));
    camera.lookAt(0, 8, 0);
    camera.updateMatrixWorld();
    this.labels.forEach(({ at }, index) => {
      const element = control.markers[index];
      if (!element) return;
      this.point.copy(at).project(camera);
      element.style.transform = `translate(${((this.point.x * 0.5 + 0.5) * width).toFixed(1)}px, ${((-this.point.y * 0.5 + 0.5) * height).toFixed(1)}px)`;
      element.style.opacity = this.point.z < 1 ? "1" : "0";
    });
  }

  dispose() {
    this.trash.forEach((item) => item.dispose());
  }
}

function Scene({ plant, control, onLabels }: { plant: Plant; control: RefObject<SiteControl>; onLabels: (ids: string[]) => void }) {
  const model = useMemo(() => new PlantModel(plant), [plant]);
  useEffect(() => {
    onLabels(model.labels.map((label) => label.id));
    return () => model.dispose();
  }, [model, onLabels]);
  useFrame((state, delta) => {
    model.update(state.camera as THREE.PerspectiveCamera, state.size.width, state.size.height, Math.min(delta, 0.05), control.current);
  });
  return (
    <>
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, 650, 2600]} />
      <hemisphereLight args={[0xdfeaf0, 0x6f7b62, 1.5]} />
      <directionalLight castShadow position={[-260, 380, 180]} intensity={3.1} color={0xfff3e0} shadow-mapSize={[4096, 4096]} shadow-bias={-0.0008} shadow-normalBias={0.6}>
        <orthographicCamera attach="shadow-camera" args={[-470, 470, 470, -470, 10, 1200]} />
      </directionalLight>
      <primitive object={model.group} />
    </>
  );
}

export default function PlantCanvas({
  plant,
  control,
  active,
  label,
  onLabels,
}: {
  plant: Plant;
  control: RefObject<SiteControl>;
  active: boolean;
  label: string;
  onLabels: (ids: string[]) => void;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: true }}
      camera={{ fov: 35, near: 5, far: 6000, position: [200, 300, 300] }}
      role="img"
      aria-label={label}
    >
      <Scene plant={plant} control={control} onLabels={onLabels} />
    </Canvas>
  );
}
