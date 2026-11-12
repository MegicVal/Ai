import type { Group, MeshStandardMaterial } from "three";
import type { Vec3 } from "@/lib/content";

/** A component of the 3D model, already translated. */
export interface StagePart {
  id: string;
  name: string;
  role: string;
  explode: Vec3;
}

export interface ViewerSource {
  archetype: string;
  variant: string;
  glb?: string;
}

export interface ViewerLabels {
  placeholder: string;
  explode: string;
  assemble: string;
  explodeAmount: string;
  zoomIn: string;
  zoomOut: string;
  components: string;
  componentOf: string;
  closeCard: string;
  canvas: string;
  noWebgl: string;
  hint: string;
}

/** Mutable state shared between the page (slider, buttons, drag) and the render loop. */
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
