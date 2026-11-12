import plantJson from "@content/plant.json";
import tourJson from "@content/tour.json";
import { geoEqualEarth, geoPath } from "d3-geo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import landJson from "world-atlas/land-110m.json";
import { SitesExplorer, type SiteLabels, type SiteMarker } from "@/components/sites/SitesExplorer";
import type { Plant, Tour } from "@/components/sites/types";
import { PageHero } from "@/components/ui";
import { getMachine, home, locations, machinePath } from "@/lib/content";
import { hasLocale, href, tr, type Locale } from "@/lib/i18n";

// The world outline is projected once, on the server: the page ships a plain SVG path.
const topology = landJson as unknown as Topology<{ land: GeometryCollection }>;
const land = feature(topology, topology.objects.land);
const projection = geoEqualEarth().fitExtent([[8, 8], [992, 492]], land);
const landPath = geoPath(projection).digits(1)(land) ?? "";

const labels: Record<Locale, SiteLabels> = {
  it: {
    mapTitle: "Sede centrale e filiali dirette",
    hq: "Sede centrale",
    subsidiary: "Filiale",
    tourSoon: "Tour in preparazione",
    enterPlant: "Esplora lo stabilimento",
    tabs: { plant: "Dall'alto in 3D", tour: "Tour interno", satellite: "Satellite Google", earth: "Google Earth 3D" },
    roles: { production: "Produzione", assembly: "Montaggio", academy: "Academy e showroom", offices: "Uffici e ingresso" },
    enter: "Entra",
    drag: "Trascina per girare intorno allo stabilimento",
    lookAround: "Trascina per guardarti intorno",
    zoomIn: "Avvicina",
    zoomOut: "Allontana",
    openEarth: "Apri in Google Earth",
    openPage: "Vai alla pagina",
    plantLabel: "Modello 3D dello stabilimento FICEP di Gazzada Schianno visto dall'alto.",
    tourLabel: "Tour 3D degli interni della sede.",
    roleNote: "Posizione dei reparti indicativa",
    goTo: "Vai a",
    youAreHere: "Sei qui",
    viewpoints: "Planimetria con i punti di vista",
    tourNote: tr(tourJson.note, "it"),
    machineOpen: "Apri la scheda",
  },
  en: {
    mapTitle: "Headquarters and direct subsidiaries",
    hq: "Headquarters",
    subsidiary: "Subsidiary",
    tourSoon: "Tour in preparation",
    enterPlant: "Explore the plant",
    tabs: { plant: "From above in 3D", tour: "Interior tour", satellite: "Google satellite", earth: "Google Earth 3D" },
    roles: { production: "Production", assembly: "Assembly", academy: "Academy and showroom", offices: "Offices and entrance" },
    enter: "Enter",
    drag: "Drag to orbit around the plant",
    lookAround: "Drag to look around",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    openEarth: "Open in Google Earth",
    openPage: "Go to the page",
    plantLabel: "3D model of the FICEP plant in Gazzada Schianno seen from above.",
    tourLabel: "3D tour of the headquarters interiors.",
    roleNote: "Department positions are indicative",
    goTo: "Go to",
    youAreHere: "You are here",
    viewpoints: "Floor plan with the viewpoints",
    tourNote: tr(tourJson.note, "en"),
    machineOpen: "Open the page",
  },
};

export async function generateMetadata({ params }: PageProps<"/[lang]/sedi">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: tr(home.locations.kicker, lang), description: tr(home.locations.body, lang) } : {};
}

export default async function SitesPage({ params }: PageProps<"/[lang]/sedi">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const markers: SiteMarker[] = locations.map((place) => {
    const [x, y] = projection([place.coords[1], place.coords[0]]) ?? [0, 0];
    return { slug: place.slug, name: place.name, city: tr(place.city, lang), country: tr(place.country, lang), kind: place.kind, x: Math.round(x), y: Math.round(y) };
  });
  const tour: Tour = {
    zones: tourJson.zones.map((zone) => ({
      id: zone.id,
      name: tr(zone.name, lang),
      text: tr(zone.text, lang),
      rect: zone.rect as [number, number, number, number],
      height: zone.height,
      photo: zone.photo,
      href: href(lang, zone.path),
    })),
    nodes: tourJson.nodes.map((node) => ({ ...node, name: tr(node.name, lang), pos: node.pos as [number, number] })),
    doors: tourJson.doors as Tour["doors"],
    machines: tourJson.machines.flatMap((item) => {
      const machine = getMachine(item.slug);
      return machine
        ? [{ slug: machine.slug, name: machine.name, summary: tr(machine.summary, lang), href: href(lang, machinePath(machine.slug)), source: machine.viewer, pos: item.pos as [number, number], rot: item.rot }]
        : [];
    }),
  };

  return (
    <>
      <PageHero
        kicker={tr(home.locations.kicker, lang)}
        title={tr(home.locations.title, lang)}
        lead={tr(home.locations.body, lang)}
        image="https://ficepgroup.com/wp-content/uploads/2022/10/b-chi-siamo.jpg"
        images={tourJson.zones.map((zone) => zone.photo)}
      />
      <SitesExplorer
        land={landPath}
        markers={markers}
        plant={plantJson as unknown as Plant}
        tour={tour}
        labels={labels[lang]}
        mapsKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}
      />
    </>
  );
}
