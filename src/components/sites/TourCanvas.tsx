"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, type RefObject } from "react";
import * as THREE from "three";
import { archetypes, type Animate } from "@/components/machine/procedural/archetypes";
import { Kit } from "@/components/machine/procedural/kit";
import type { SiteControl, Tour } from "./types";

const EYE = 1.65;
const DOOR = 3.2;

/**
 * Walk-through of the headquarters: rooms built from the floor plan in content/tour.json,
 * with the catalogue's 3D machines standing in the showroom and the production bays.
 * Placeholder interiors; a viewpoint with a `panorama` would show the real 360° photo instead.
 */
class TourModel {
  readonly group = new THREE.Group();
  private readonly trash: { dispose(): void }[] = [];
  private readonly animations: Animate[] = [];
  private readonly position = new THREE.Vector3();
  private readonly point = new THREE.Vector3();
  private yaw = 0;
  private current = "";
  private time = 0;

  constructor(private readonly tour: Tour) {
    const wall = this.material(0xe9edeb, 0.9);
    const stripe = this.material(0x00705f, 0.6);
    const dark = this.material(0x2a3330, 0.8);
    const lamp = new THREE.MeshBasicMaterial({ color: 0xf6f8f7 });
    this.trash.push(lamp);
    const floors: Record<string, THREE.Material> = {
      ingresso: this.material(0xd9dedb, 0.5),
      showroom: this.material(0x3d4844, 0.35),
      academy: this.material(0xc9cfcc, 0.6),
      produzione: this.material(0x9aa5a1, 0.7),
    };

    for (const zone of tour.zones) {
      const [x0, z0, x1, z1] = zone.rect;
      const w = x1 - x0;
      const d = z1 - z0;
      const mx = (x0 + x1) / 2;
      const mz = (z0 + z1) / 2;
      this.box(w, 0.1, d, floors[zone.id] ?? floors.ingresso, mx, -0.05, mz);
      this.box(w, 0.1, d, dark, mx, zone.height + 0.05, mz);
      const rows = Math.max(2, Math.round(d / 6));
      for (let i = 0; i < rows; i++) this.box(w * 0.86, 0.06, 0.35, lamp, mx, zone.height - 0.04, z0 + ((i + 0.5) * d) / rows);
      // four walls, each split where a door opens onto another room
      this.wall(zone.id, "x", z0, x0, x1, zone.height, wall, stripe);
      this.wall(zone.id, "x", z1, x0, x1, zone.height, wall, stripe);
      this.wall(zone.id, "z", x0, z0, z1, zone.height, wall, stripe);
      this.wall(zone.id, "z", x1, z0, z1, zone.height, wall, stripe);
    }

    // reception desk and seating
    this.box(4.2, 1.1, 0.9, wall, 0, 0.55, 8.2);
    this.box(4.24, 0.08, 0.94, stripe, 0, 1.0, 8.2);
    this.box(5, 2.2, 0.12, dark, 0, 2.2, 10.6);
    [-4.6, 4.6].forEach((x) => this.box(1.8, 0.45, 0.8, dark, x, 0.23, 2.2));
    // classroom: desks facing a screen
    for (let row = 0; row < 3; row++) for (let seat = 0; seat < 3; seat++) this.box(1.6, 0.75, 0.7, wall, -11 - row * 3.2, 0.38, 2.4 + seat * 3);
    this.box(0.12, 2.2, 5.5, dark, -22.7, 2.1, 5.5);
    this.box(0.04, 1.8, 4.8, lamp, -22.6, 2.1, 5.5);
    // production: overhead crane and pallets
    this.box(64, 0.5, 0.4, stripe, 9, 9.2, 14);
    this.box(64, 0.5, 0.4, stripe, 9, 9.2, 40);
    this.box(1.2, 0.9, 26.4, this.material(0xe2571c, 0.6), 12, 9.6, 27);
    [[-4, 38], [14, 16], [36, 22], [-20, 14]].forEach(([x, z]) => {
      this.box(2.4, 0.3, 1.6, dark, x, 0.15, z);
      this.box(2.2, 1.0, 1.4, wall, x, 0.8, z);
    });

    // machines from the catalogue
    const line = new THREE.LineBasicMaterial({ color: 0x0c1110, transparent: true, opacity: 0.35 });
    this.trash.push(line);
    for (const machine of tour.machines) {
      const build = archetypes[machine.source.archetype];
      if (!build) continue;
      const kit = new Kit(line);
      const built = build(kit, machine.source.variant);
      const holder = new THREE.Group();
      Object.values(kit.parts).forEach((part) => holder.add(part.group));
      holder.traverse((object) => {
        object.castShadow = false;
      });
      holder.scale.setScalar(0.85);
      holder.rotation.y = machine.rot;
      holder.position.set(machine.pos[0], 0, machine.pos[1]);
      this.group.add(holder);
      if (built.animate) this.animations.push(built.animate);
      this.trash.push(kit);
    }
  }

  private material(color: number, roughness: number) {
    const material = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05 });
    this.trash.push(material);
    return material;
  }

  private box(w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) {
    const geometry = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    this.group.add(mesh);
    this.trash.push(geometry);
  }

  /** A wall along `axis` at `fixed`, from `a` to `b`, with gaps for this room's doors. */
  private wall(zone: string, axis: "x" | "z", fixed: number, a: number, b: number, height: number, wall: THREE.Material, stripe: THREE.Material) {
    const gaps = this.tour.doors
      .filter((door) => door.axis === axis && door.between.includes(zone) && Math.abs((axis === "x" ? door.at[1] : door.at[0]) - fixed) < 0.01)
      .map((door) => ({ from: (axis === "x" ? door.at[0] : door.at[1]) - door.width / 2, to: (axis === "x" ? door.at[0] : door.at[1]) + door.width / 2 }))
      .sort((p, q) => p.from - q.from);
    const piece = (from: number, to: number, y0: number, y1: number, material: THREE.Material, thick = 0.2) => {
      if (to - from < 0.01) return;
      const len = to - from;
      const mid = (from + to) / 2;
      if (axis === "x") this.box(len, y1 - y0, thick, material, mid, (y0 + y1) / 2, fixed);
      else this.box(thick, y1 - y0, len, material, fixed, (y0 + y1) / 2, mid);
    };
    let cursor = a;
    for (const gap of gaps) {
      piece(cursor, gap.from, 0, height, wall);
      piece(cursor, gap.from, 1.0, 1.12, stripe, 0.24);
      piece(gap.from, gap.to, DOOR, height, wall);
      cursor = gap.to;
    }
    piece(cursor, b, 0, height, wall);
    piece(cursor, b, 1.0, 1.12, stripe, 0.24);
  }

  update(camera: THREE.PerspectiveCamera, width: number, height: number, dt: number, control: SiteControl) {
    if (!control.reduce) this.time += dt;
    this.animations.forEach((animate) => animate(this.time, control.reduce ? 0 : dt, 1));

    const node = this.tour.nodes.find((item) => item.id === control.node) ?? this.tour.nodes[0];
    if (this.current !== node.id) {
      if (!this.current) {
        this.position.set(node.pos[0], EYE, node.pos[1]);
        this.yaw = node.yaw;
      }
      this.current = node.id;
    }
    const ease = Math.min(1, dt * (control.reduce ? 60 : 2.6));
    this.position.x += (node.pos[0] - this.position.x) * ease;
    this.position.z += (node.pos[1] - this.position.z) * ease;
    this.position.y = EYE;
    const goal = node.yaw + control.yaw;
    this.yaw += Math.atan2(Math.sin(goal - this.yaw), Math.cos(goal - this.yaw)) * Math.min(1, dt * 6);
    camera.position.copy(this.position);
    camera.rotation.set(Math.max(-0.5, Math.min(0.6, control.pitch)), this.yaw + Math.PI, 0, "YXZ");
    camera.updateMatrixWorld();
    if (control.compass) control.compass.setAttribute("transform", `translate(${this.position.x.toFixed(2)} ${this.position.z.toFixed(2)}) rotate(${((-this.yaw * 180) / Math.PI).toFixed(1)})`);

    // floor arrows to the linked viewpoints, then tags over nearby machines
    const targets = [
      ...this.tour.nodes.map((item) => ({ show: node.links.includes(item.id), x: item.pos[0], y: 0.4, z: item.pos[1], reach: 60 })),
      ...this.tour.machines.map((item) => ({ show: this.zoneAt(item.pos) === node.zone, x: item.pos[0], y: 3.4, z: item.pos[1], reach: 30 })),
    ];
    targets.forEach((target, index) => {
      const element = control.markers[index];
      if (!element) return;
      this.point.set(target.x, target.y, target.z);
      const distance = this.point.distanceTo(this.position);
      this.point.project(camera);
      const visible = target.show && this.point.z < 1 && distance < target.reach && distance > 1.5 && Math.abs(this.point.x) < 1.05 && Math.abs(this.point.y) < 1.05;
      element.style.transform = `translate(${((this.point.x * 0.5 + 0.5) * width).toFixed(1)}px, ${((-this.point.y * 0.5 + 0.5) * height).toFixed(1)}px)`;
      element.style.opacity = visible ? "1" : "0";
      element.style.pointerEvents = visible ? "auto" : "none";
    });
  }

  private zoneAt([x, z]: [number, number]) {
    return this.tour.zones.find((zone) => x >= zone.rect[0] && x <= zone.rect[2] && z >= zone.rect[1] && z <= zone.rect[3])?.id;
  }

  dispose() {
    this.trash.forEach((item) => item.dispose());
  }
}

function Scene({ tour, control }: { tour: Tour; control: RefObject<SiteControl> }) {
  const model = useMemo(() => new TourModel(tour), [tour]);
  useEffect(() => () => model.dispose(), [model]);
  useFrame((state, delta) => {
    model.update(state.camera as THREE.PerspectiveCamera, state.size.width, state.size.height, Math.min(delta, 0.05), control.current);
  });
  return (
    <>
      <hemisphereLight args={[0xffffff, 0x9aa5a1, 2.7]} />
      <directionalLight position={[10, 30, -8]} intensity={1.4} />
      <directionalLight position={[-12, 20, 30]} intensity={0.8} color={0xcfe9e2} />
      <primitive object={model.group} />
    </>
  );
}

export default function TourCanvas({ tour, control, active, label }: { tour: Tour; control: RefObject<SiteControl>; active: boolean; label: string }) {
  return (
    <Canvas
      flat
      dpr={[1, 1.75]}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: true }}
      camera={{ fov: 66, near: 0.1, far: 220 }}
      onCreated={({ gl }) => gl.setClearColor(0x0c1110)}
      role="img"
      aria-label={label}
    >
      <Scene tour={tour} control={control} />
    </Canvas>
  );
}
