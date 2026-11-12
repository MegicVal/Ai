import * as THREE from "three";
import { archetypes, type Animate } from "./procedural/archetypes";
import { Kit } from "./procedural/kit";
import type { BuiltPart, StageControl, StagePart, ViewerSource } from "./types";

const ACCENT = 0x00a88f;

/**
 * Framework-free controller for one machine: builds the model, then runs the explode
 * animation, selection highlight, camera framing and the 2D callouts each frame.
 *
 * Models are procedural today. A machine whose JSON has `viewer.glb` would load that
 * file here instead and map its nodes to the same component ids.
 */
export class MachineRig {
  readonly entries: { part: StagePart; built: BuiltPart; anchor: THREE.Vector3 }[];
  private readonly kit: Kit;
  private readonly animate?: Animate;
  private readonly software: (explode: number, camera: THREE.Camera) => void;
  private readonly center = new THREE.Vector3();
  private readonly extent = new THREE.Vector2();
  private readonly openCenter = new THREE.Vector3();
  private readonly openExtent = new THREE.Vector2();
  private readonly target = new THREE.Vector3();
  private readonly point = new THREE.Vector3();
  private explode = 0;
  private time = 0;
  private selected: string | null = null;

  constructor(source: ViewerSource, parts: StagePart[], name: string) {
    const build = archetypes[source.archetype];
    if (!build) throw new Error(`No 3D model registered for "${source.archetype}"`);
    this.kit = new Kit();
    const built = build(this.kit, source.variant, name);
    this.animate = built.animate;
    this.software = this.kit.software(built.console);

    // Frame the camera on the assembled machine, software panel excluded.
    const bounds = new THREE.Box3();
    for (const [id, part] of Object.entries(this.kit.parts)) {
      part.group.updateMatrixWorld(true);
      if (id !== "sw") bounds.union(meshBounds(part.group));
    }
    const size = bounds.getSize(new THREE.Vector3());
    bounds.getCenter(this.center);
    this.extent.set(0.5 * Math.hypot(size.x, size.z), 0.5 * size.y);

    this.entries = parts
      .filter((part) => this.kit.parts[part.id])
      .map((part) => {
        const group = this.kit.parts[part.id].group;
        const box = part.id === "sw" ? new THREE.Box3(new THREE.Vector3(-0.8, -0.5, 0), new THREE.Vector3(0.8, 0.62, 0)) : meshBounds(group);
        const mid = box.getCenter(new THREE.Vector3());
        return { part, built: this.kit.parts[part.id], anchor: new THREE.Vector3(mid.x, box.max.y, mid.z) };
      });

    // The same framing for the exploded machine, so it stays centred while it opens.
    const open = new THREE.Box3();
    for (const { part, built } of this.entries) {
      if (part.id !== "sw") open.union(meshBounds(built.group).translate(new THREE.Vector3(...part.explode)));
    }
    const openSize = open.getSize(new THREE.Vector3());
    open.getCenter(this.openCenter);
    this.openExtent.set(0.5 * Math.hypot(openSize.x, openSize.z), 0.5 * openSize.y);
  }

  /** The software panel only exists once the machine is open. */
  isHidden(id: string): boolean {
    return id === "sw" && this.explode < 0.5;
  }

  update(camera: THREE.PerspectiveCamera, width: number, height: number, dt: number, control: StageControl, floor: THREE.Material | null): void {
    if (!control.reduce) this.time += dt;
    this.explode += (control.goal - this.explode) * Math.min(1, dt * 7);
    if (Math.abs(control.goal - this.explode) < 0.0005) this.explode = control.goal;
    const e = this.explode;
    const live = 1 - e;

    for (const { built } of this.entries) built.group.position.set(0, 0, 0);
    this.animate?.(this.time, control.reduce ? 0 : dt, live);
    this.software(e, camera);
    for (const { part, built } of this.entries) {
      built.group.position.x += part.explode[0] * e;
      built.group.position.y += part.explode[1] * e;
      built.group.position.z += part.explode[2] * e;
    }

    if (control.selected !== this.selected) {
      this.selected = control.selected;
      for (const { part, built } of this.entries) {
        const on = part.id === this.selected;
        for (const material of built.materials) {
          material.emissive.setHex(on ? ACCENT : 0x000000);
          material.emissiveIntensity = on ? 0.5 : 0;
        }
      }
    }

    if (floor) floor.opacity = 1 - 0.45 * e;

    // Frame the machine by its bounding sphere, drift slowly, follow drag and zoom.
    const aspect = width / height;
    const portrait = aspect < 0.85;
    const half = Math.tan((camera.fov * Math.PI) / 360);
    // x = half the footprint diagonal, y = half the height, for the current opening
    const wide = this.extent.x + (this.openExtent.x - this.extent.x) * e;
    const tall = this.extent.y + (this.openExtent.y - this.extent.y) * e;
    const fit = Math.max((wide * (portrait ? 0.8 : 1)) / (half * Math.min(aspect, 1.9)), (tall * 1.3) / half) + wide * 0.6;
    const radius = fit * control.zoom;
    const azimuth = (portrait ? 1.05 : 0.62) + Math.sin(this.time * 0.16) * (0.3 - 0.18 * e) + control.dragT + 0.2 * e;
    const polar = 1.14 - 0.08 * e - control.dragP;
    this.target.lerpVectors(this.center, this.openCenter, e);
    this.target.y *= 0.88;
    camera.position.set(
      this.target.x + radius * Math.sin(polar) * Math.sin(azimuth),
      this.target.y + radius * Math.cos(polar),
      this.target.z + radius * Math.sin(polar) * Math.cos(azimuth),
    );
    camera.lookAt(this.target);
    camera.updateMatrixWorld();

    const opacity = Math.max(0, (e - 0.35) / 0.4);
    this.entries.forEach(({ built, anchor }, index) => {
      const balloon = control.balloons[index];
      if (!balloon) return;
      built.group.updateMatrixWorld();
      this.point.copy(anchor);
      built.group.localToWorld(this.point).project(camera);
      const x = (this.point.x * 0.5 + 0.5) * width;
      const y = (-this.point.y * 0.5 + 0.5) * height;
      balloon.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      balloon.style.opacity = opacity.toFixed(2);
      balloon.style.pointerEvents = e > 0.5 ? "auto" : "none";
    });
  }

  dispose(): void {
    this.kit.dispose();
  }
}

/** Bounding box of the solid meshes in a group (ignores lights, sparks and guide lines). */
function meshBounds(group: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  group.traverse((object) => {
    if (object instanceof THREE.Mesh && object.geometry) {
      object.geometry.computeBoundingBox();
      box.union(object.geometry.boundingBox!.clone().applyMatrix4(object.matrixWorld));
    }
  });
  return box;
}
