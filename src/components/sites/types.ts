import type { ViewerSource } from "@/components/machine/types";

export interface Plant {
  name: string;
  address: string;
  center: { lat: number; lon: number };
  ground: { tiles: string; z: number; x0: number; y0: number; n: number; west: number; north: number; east: number; south: number; attribution: string };
  attribution: string;
  /** Property line of the plant, in metres east/north of its centre. */
  site: [number, number][];
  buildings: { id: string; ficep: boolean; kind: "hall" | "office" | "house"; height: number; points: [number, number][]; role?: string }[];
}

/** Camera state shared between the page controls and the render loop. */
export interface SiteControl {
  yaw: number;
  pitch: number;
  zoom: number;
  reduce: boolean;
  /** Target viewpoint of the interior tour. */
  node: string;
  /** Elements positioned every frame: building labels, or tour arrows and machine tags. */
  markers: (HTMLElement | null)[];
  /** Arrow on the floor-plan thumbnail; rotated to the viewing direction. */
  compass: SVGElement | null;
}

export interface TourZone {
  id: string;
  name: string;
  text: string;
  rect: [number, number, number, number];
  height: number;
  photo: string;
  href: string;
}

export interface TourNode {
  id: string;
  zone: string;
  name: string;
  pos: [number, number];
  yaw: number;
  links: string[];
  /** Equirectangular 360° photo of this spot, when FICEP supplies one. */
  panorama: string | null;
}

export interface TourMachine {
  slug: string;
  name: string;
  summary: string;
  href: string;
  source: ViewerSource;
  pos: [number, number];
  rot: number;
}

export interface Tour {
  zones: TourZone[];
  nodes: TourNode[];
  doors: { between: string[]; at: [number, number]; axis: "x" | "z"; width: number }[];
  machines: TourMachine[];
}
