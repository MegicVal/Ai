import catalogJson from "@content/catalog.json";
import eventsJson from "@content/events.json";
import homeJson from "@content/home.json";
import locationsJson from "@content/locations.json";
import geminiJson from "@content/machines/gemini.json";
import newsJson from "@content/news.json";
import sectorsJson from "@content/sectors.json";
import siteJson from "@content/site.json";
import type { Localized } from "./i18n";

export type Vec3 = [number, number, number];

/** Where a component's geometry comes from. Swap `procedural` for `glb` when FICEP supplies CAD exports. */
export type PartModel =
  | { type: "procedural"; part: string }
  | { type: "glb"; src: string; node: string };

export interface MachineComponent {
  id: string;
  name: Localized;
  function: Localized;
  specs: { label: Localized; value: Localized | string }[];
  /** Offset applied when the machine is fully exploded, in metres. */
  explode: Vec3;
  /** Where the numbered callout sits, in the component's local space. */
  anchor: Vec3;
  model: PartModel;
}

export interface Machine {
  slug: string;
  division: string;
  category: string;
  name: string;
  tagline: Localized;
  poster?: { landscape: string; portrait: string };
  specSource: Localized;
  components: MachineComponent[];
}

export interface CatalogMachine {
  slug: string;
  name: string;
  summary: Localized;
  viewer?: boolean;
}

export interface Division {
  id: string;
  slug: string;
  name: Localized;
  summary: Localized;
  categories: { id: string; name: Localized; machines: CatalogMachine[] }[];
}

export const catalog = catalogJson as { divisions: Division[] };
export const home = homeJson;
export const site = siteJson;
export const sectors = sectorsJson;
export const news = newsJson;
export const events = eventsJson;
export const locations = locationsJson;

const machines: Record<string, Machine> = {
  gemini: geminiJson as unknown as Machine,
};

export const getMachine = (slug: string): Machine | undefined => machines[slug];

export const machineCount = (division: Division): number =>
  division.categories.reduce((total, category) => total + category.machines.length, 0);
