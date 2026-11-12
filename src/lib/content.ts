import catalogJson from "@content/catalog.json";
import eventsJson from "@content/events.json";
import historyJson from "@content/history.json";
import homeJson from "@content/home.json";
import locationsJson from "@content/locations.json";
import newsJson from "@content/news.json";
import pagesJson from "@content/pages.json";
import sectorsJson from "@content/sectors.json";
import siteJson from "@content/site.json";
import viewerJson from "@content/viewer.json";
import type { Localized } from "./i18n";
import { machineIndex } from "./machines.generated";

export type Vec3 = [number, number, number];

export interface Labelled {
  label: Localized;
  icon?: string;
}

export interface SpecTable {
  title: Localized;
  models: string[];
  rows: { label: Localized; values: string[] }[];
}

/** One machine page. Text is rewritten; photos, icons and video are loaded from FICEP's own site. */
export interface Machine {
  slug: string;
  name: string;
  division: string;
  divisionSlug: string;
  category: string;
  summary: Localized;
  descriptor: Localized;
  hero: string;
  thumb: string;
  source: string;
  processes: Labelled[];
  profiles: Labelled[];
  materials: Labelled[];
  /** Materials stated as a sentence (forging machines). */
  materialsNote?: Localized;
  features: { title: Localized; text: Localized; image: string | null }[];
  advantages: Localized[];
  gallery: string[];
  video: string | null;
  specs: SpecTable[];
  /**
   * Which 3D model to show. Today every machine uses a simplified model built in code
   * (`archetype` + `variant`). With FICEP's CAD exports this becomes
   * `{ "glb": "/models/<slug>.glb" }` and the same viewer loads the real geometry.
   */
  viewer: { archetype: string; variant: string; glb?: string };
}

export interface CatalogMachine {
  slug: string;
  name: string;
  summary: Localized;
  thumb?: string;
}

export interface Division {
  id: string;
  slug: string;
  name: Localized;
  summary: Localized;
  image: string;
  categories: { id: string; name: Localized; machines: CatalogMachine[] }[];
}

/** A component of a 3D model: what the callout and card say, and how far it moves when exploded. */
export interface ViewerComponent {
  id: string;
  name: Localized;
  function: Localized;
  explode: Vec3;
}

export interface ContentPage {
  path: string;
  kicker: Localized;
  title: Localized;
  lead: Localized;
  image: string;
  sections: { title: Localized; text: Localized; image?: string; items?: Localized[] }[];
  cta?: { label: Localized; path: string };
  related?: string[];
}

export const catalog = catalogJson as { divisions: Division[] };
export const home = homeJson;
export const site = siteJson;
export const sectors = sectorsJson;
export const news = newsJson;
export const events = eventsJson;
export const locations = locationsJson;
export const history = historyJson;
export const pages = pagesJson as ContentPage[];
export const viewerParts = viewerJson as unknown as Record<string, ViewerComponent[]>;

export const machines: Machine[] = catalog.divisions.flatMap((division) =>
  division.categories.flatMap((category) => category.machines.map((machine) => machineIndex[machine.slug])),
);

export const getMachine = (slug: string): Machine | undefined => machineIndex[slug];
export const getPage = (path: string): ContentPage | undefined => pages.find((page) => page.path === path);
export const getDivision = (slug: string): Division | undefined => catalog.divisions.find((division) => division.slug === slug);

export const machineCount = (division: Division): number =>
  division.categories.reduce((total, category) => total + category.machines.length, 0);

export const machinePath = (slug: string): string => `/macchine/${slug}`;
