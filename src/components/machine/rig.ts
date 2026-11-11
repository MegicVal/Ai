import * as THREE from "three";
import { proceduralMachines } from "./procedural";
import type { BuiltMachine, BuiltPart, ProceduralMachine, StageControl, StagePart } from "./types";

const INK = 0x0c1110;
const ACCENT_HI = 0x2cc4a6;
const ACCENT = 0x00705f;

/**
 * Framework-free controller for one machine: explode animation, selection highlight,
 * camera framing and the 2D callouts. React only feeds it the frame clock.
 */
export class MachineRig {
  readonly entries: { part: StagePart; built: BuiltPart }[];
  private readonly machine: BuiltMachine;
  private readonly view: ProceduralMachine["view"];
  private readonly lineMaterial = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.18 });
  private readonly target = new THREE.Vector3();
  private readonly point = new THREE.Vector3();
  private explode = 0;
  private time = 0;
  private selected: string | null = null;

  constructor(slug: string, parts: StagePart[]) {
    const source = proceduralMachines[slug];
    if (!source) throw new Error(`No 3D model registered for machine "${slug}"`);
    this.view = source.view;
    this.machine = source.build(this.lineMaterial);
    this.entries = parts.map((part) => {
      // GLB parts (`model.type === "glb"`) plug in here in phase 2; until then every part is procedural.
      const key = part.model.type === "procedural" ? part.model.part : part.id;
      const built = this.machine.parts[key] ?? { group: new THREE.Group(), materials: [] };
      return { part, built };
    });
  }

  isHidden(id: string): boolean {
    return this.machine.hidden(this.explode).includes(id);
  }

  update(
    camera: THREE.PerspectiveCamera,
    width: number,
    height: number,
    dt: number,
    control: StageControl,
    floor: THREE.ShadowMaterial | null,
  ): void {
    if (!control.reduce) this.time += dt;
    this.explode += (control.goal - this.explode) * Math.min(1, dt * 7);
    if (Math.abs(control.goal - this.explode) < 0.0005) this.explode = control.goal;
    const e = this.explode;
    const live = 1 - e;

    this.machine.tick(this.time, control.reduce ? 0 : dt, live, e, camera);
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
          material.emissiveIntensity = on ? 0.55 : 0;
        }
      }
    }

    this.lineMaterial.opacity = 0.16 + 0.5 * e;
    this.lineMaterial.color.setHex(e > 0.5 ? ACCENT_HI : INK);
    if (floor) floor.opacity = 0.16 * live;

    // Frame the machine: fit its width, drift slowly, follow drag and zoom.
    const aspect = width / height;
    const portrait = aspect < 0.85;
    const half = Math.tan((camera.fov * Math.PI) / 360);
    const fitWidth = (portrait ? this.view.halfWidth.portrait : this.view.halfWidth.landscape) / (half * aspect);
    const radius = Math.max(fitWidth, this.view.halfHeight / half) * (1 + (portrait ? 0.35 : 0.22) * e) * control.zoom;
    const azimuth =
      (portrait ? this.view.azimuth.portrait : this.view.azimuth.landscape) +
      Math.sin(this.time * 0.16) * (0.34 - 0.2 * e) +
      control.dragT +
      0.25 * e;
    const polar = 1.13 - 0.1 * e - control.dragP;
    this.target.set(0.5 + 0.9 * e, (portrait ? this.view.targetY.portrait : this.view.targetY.landscape) + 0.75 * e, 0.15 * e);
    camera.position.set(
      this.target.x + radius * Math.sin(polar) * Math.sin(azimuth),
      this.target.y + radius * Math.cos(polar),
      this.target.z + radius * Math.sin(polar) * Math.cos(azimuth),
    );
    camera.lookAt(this.target);
    // Slide the picture so the machine leaves room for the hero text.
    const offsetX = portrait ? 0 : -width * 0.15 * live;
    const offsetY = portrait ? height * (0.28 + 0.02 * e) : height * 0.02 * live;
    camera.setViewOffset(width, height, offsetX, offsetY, width, height);
    camera.updateMatrixWorld();

    const opacity = Math.max(0, (e - 0.45) / 0.4);
    this.entries.forEach(({ part, built }, index) => {
      const balloon = control.balloons[index];
      if (!balloon) return;
      built.group.updateMatrixWorld();
      this.point.set(part.anchor[0], part.anchor[1], part.anchor[2]);
      built.group.localToWorld(this.point).project(camera);
      const x = (this.point.x * 0.5 + 0.5) * width;
      const y = (-this.point.y * 0.5 + 0.5) * height;
      balloon.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      balloon.style.opacity = opacity.toFixed(2);
      balloon.style.pointerEvents = e > 0.6 ? "auto" : "none";
    });
  }

  dispose(): void {
    this.machine.dispose();
    this.lineMaterial.dispose();
  }
}
