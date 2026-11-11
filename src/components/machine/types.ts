import type { Group, LineBasicMaterial, MeshStandardMaterial, PerspectiveCamera } from "three";
import type { PartModel, Vec3 } from "@/lib/content";

/** A machine component, already translated, as the 3D stage needs it. */
export interface StagePart {
  id: string;
  name: string;
  role: string;
  specs: [label: string, value: string][];
  explode: Vec3;
  anchor: Vec3;
  model: PartModel;
}

export interface StageLabels {
  region: string;
  placeholder: string;
  explode: string;
  assemble: string;
  zoomIn: string;
  zoomOut: string;
  components: string;
  componentOf: string;
  closeCard: string;
  canvas: string;
  noWebgl: string;
  specNote: string;
}

/** Mutable state shared between the page (scroll, buttons) and the render loop. */
export interface StageControl {
  /** 0 = assembled, 1 = fully exploded. The render loop eases towards it. */
  goal: number;
  zoom: number;
  dragT: number;
  dragP: number;
  selected: string | null;
  reduce: boolean;
  /** One callout element per component, positioned every frame. */
  balloons: (HTMLElement | null)[];
}

export interface BuiltPart {
  group: Group;
  /** Materials tinted when the component is selected. */
  materials: MeshStandardMaterial[];
}

export interface BuiltMachine {
  parts: Record<string, BuiltPart>;
  /** Places every part at rest (before the explode offset) and runs the working animation. */
  tick(time: number, dt: number, live: number, explode: number, camera: PerspectiveCamera): void;
  /** Parts that cannot be picked right now (e.g. the software panel while assembled). */
  hidden(explode: number): string[];
  dispose(): void;
}

/** A machine modelled in code. Replace with GLB parts by changing `model` in the machine JSON. */
export interface ProceduralMachine {
  view: {
    halfWidth: { landscape: number; portrait: number };
    halfHeight: number;
    azimuth: { landscape: number; portrait: number };
    targetY: { landscape: number; portrait: number };
  };
  build(lineMaterial: LineBasicMaterial): BuiltMachine;
}
