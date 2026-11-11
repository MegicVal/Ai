import * as THREE from "three";
import { archetypes, type Animate } from "./procedural/archetypes";
import { Kit } from "./procedural/kit";
import type { BuiltPart, StageControl, StagePart, ViewerSource } from "./types";

const INK = 0x0c1110;
const ACCENT_HI = 0x2cc4a6;
const ACCENT = 0x00705f;

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
  private readonly lineMaterial = new THREE.LineBasicMaterial({ color: ACCENT_HI, transparent: true, opacity: 0.25 });
  private readonly center = new THREE.Vector3();
  private readonly radius: number;
  private readonly target = new THREE.Vector3();
  private readonly point = new THREE.Vector3();
  private explode = 0;
  private time = 0;
  private selected: string | null = null;

  constructor(source: ViewerSource, parts: StagePart[]) {
    const build = archetypes[source.archetype];
    if (!build) throw new Error(`No 3D model registered for "${source.archetype}"`);
    this.kit = new Kit(this.lineMaterial);
    const built = build(this.kit, source.variant);
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
    this.radius = 0.5 * Math.hypot(size.x, size.y, size.z);

    this.entries = parts
      .filter((part) => this.kit.parts[part.id])
      .map((part) => {
        const group = this.kit.parts[part.id].group;
        const box = part.id === "sw" ? new THREE.Box3(new THREE.Vector3(-0.8, -0.5, 0), new THREE.Vector3(0.8, 0.62, 0)) : meshBounds(group);
        const mid = box.getCenter(new THREE.Vector3());
        return { part, built: this.kit.parts[part.id], anchor: new THREE.Vector3(mid.x, box.max.y, mid.z) };
      });
  }

  /** The software panel only exists once the machine is open. */
  isHidden(id: string): boolean {
    return id === "sw" && this.explode < 0.5;
  }

  update(camera: THREE.PerspectiveCamera, width: number, height: number, dt: number, control: StageControl, floor: THREE.ShadowMaterial | null): void {
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
          material.emissiveIntensity = on ? 0.6 : 0;
        }
      }
    }

    this.lineMaterial.opacity = 0.22 + 0.45 * e;
    this.lineMaterial.color.setHex(e > 0.05 ? ACCENT_HI : INK);
    if (floor) floor.opacity = 0.2 * live;

    // Frame the machine by its bounding sphere, drift slowly, follow drag and zoom.
    const aspect = width / height;
    const portrait = aspect < 0.85;
    const half = Math.tan((camera.fov * Math.PI) / 360);
    const fit = Math.max((this.radius * (portrait ? 0.86 : 1.02)) / (half * Math.min(aspect, 1.9)), (this.radius * 0.82) / half);
    const radius = fit * (1 + 0.3 * e) * control.zoom;
    const azimuth = (portrait ? 1.05 : 0.62) + Math.sin(this.time * 0.16) * (0.3 - 0.18 * e) + control.dragT + 0.2 * e;
    const polar = 1.14 - 0.08 * e - control.dragP;
    this.target.set(this.center.x + 0.5 * e, this.center.y * 0.85 + 0.7 * e, this.center.z);
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
    this.lineMaterial.dispose();
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
