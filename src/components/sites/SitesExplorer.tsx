"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import type { Plant, SiteControl, Tour } from "./types";

const PlantCanvas = dynamic(() => import("./PlantCanvas"), { ssr: false });
const TourCanvas = dynamic(() => import("./TourCanvas"), { ssr: false });

export interface SiteMarker {
  slug: string;
  name: string;
  city: string;
  country: string;
  kind: string;
  x: number;
  y: number;
}

export interface SiteLabels {
  mapTitle: string;
  hq: string;
  subsidiary: string;
  tourSoon: string;
  enterPlant: string;
  tabs: { plant: string; tour: string; satellite: string; earth: string };
  roles: Record<string, string>;
  enter: string;
  drag: string;
  lookAround: string;
  zoomIn: string;
  zoomOut: string;
  openEarth: string;
  openPage: string;
  plantLabel: string;
  tourLabel: string;
  roleNote: string;
  goTo: string;
  youAreHere: string;
  viewpoints: string;
  tourNote: string;
  machineOpen: string;
}

type View = "plant" | "tour" | "satellite" | "earth";

/** World map of the sites, then the headquarters in 3D: from above, inside, or on satellite imagery. */
export function SitesExplorer({
  land,
  markers,
  plant,
  tour,
  labels,
  mapsKey,
}: {
  land: string;
  markers: SiteMarker[];
  plant: Plant;
  tour: Tour;
  labels: SiteLabels;
  mapsKey?: string;
}) {
  const [site, setSite] = useState(markers.find((marker) => marker.kind === "hq")?.slug ?? markers[0].slug);
  const [view, setView] = useState<View>("plant");
  const [node, setNode] = useState(tour.nodes[0].id);
  const [roles, setRoles] = useState<string[]>([]);
  const [machine, setMachine] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const control = useRef<SiteControl>({ yaw: 0, pitch: 0, zoom: 1, reduce: false, node: tour.nodes[0].id, markers: [], compass: null });
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);

  const selected = markers.find((marker) => marker.slug === site) ?? markers[0];
  const currentNode = tour.nodes.find((item) => item.id === node) ?? tour.nodes[0];
  const zone = tour.zones.find((item) => item.id === currentNode.zone) ?? tour.zones[0];
  const activeMachine = tour.machines.find((item) => item.slug === machine);

  // Start the 3D scenes only when the stage is on screen.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    control.current.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new IntersectionObserver(([entry]) => setLive(entry.isIntersecting), { rootMargin: "150px" });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const show = useCallback((next: View) => {
    control.current.yaw = 0;
    control.current.pitch = 0;
    control.current.markers = [];
    setMachine(null);
    setView(next);
  }, []);
  const goTo = useCallback((id: string) => {
    control.current.node = id;
    control.current.yaw = 0;
    control.current.pitch = 0;
    setMachine(null);
    setNode(id);
  }, []);
  const enter = (role: string) => {
    const start = { offices: "reception", academy: "showroom-door", production: "bay-centre", assembly: "bay-east" }[role] ?? tour.nodes[0].id;
    show("tour");
    goTo(start);
  };
  const openPlant = () => {
    stageRef.current?.scrollIntoView({ behavior: control.current.reduce ? "auto" : "smooth", block: "start" });
  };

  const onPointerDown = (event: PointerEvent) => {
    drag.current = { x: event.clientX, y: event.clientY, yaw: control.current.yaw, pitch: control.current.pitch };
  };
  const onPointerMove = (event: PointerEvent) => {
    const start = drag.current;
    if (!start) return;
    const turn = view === "tour" ? 0.004 : -0.006;
    control.current.yaw = start.yaw + (event.clientX - start.x) * turn;
    control.current.pitch = Math.max(-0.6, Math.min(0.7, start.pitch + (event.clientY - start.y) * (view === "tour" ? 0.003 : -0.004)));
  };
  const endDrag = () => {
    drag.current = null;
  };
  const zoomBy = (factor: number) => {
    control.current.zoom = Math.max(0.35, Math.min(1.7, control.current.zoom * factor));
  };

  const tabs: [View, string][] = [
    ["plant", labels.tabs.plant],
    ["tour", labels.tabs.tour],
    ["satellite", labels.tabs.satellite],
    ...(mapsKey ? ([["earth", labels.tabs.earth]] as [View, string][]) : []),
  ];
  const { lat, lon } = plant.center;
  const bounds = tour.zones.reduce(
    (box, item) => [Math.min(box[0], item.rect[0]), Math.min(box[1], item.rect[1]), Math.max(box[2], item.rect[2]), Math.max(box[3], item.rect[3])],
    [Infinity, Infinity, -Infinity, -Infinity],
  );

  return (
    <>
      <section className="py-14" aria-labelledby="map-title">
        <div className="wrap grid gap-8 lg:grid-cols-[2fr_1fr] lg:items-start">
          <div className="grid gap-4">
            <h2 id="map-title" className="label text-ink-2">
              {labels.mapTitle}
            </h2>
            <svg viewBox="0 0 1000 500" className="h-auto w-full" role="group" aria-labelledby="map-title">
              <path d={land} className="fill-ghost stroke-line" strokeWidth="0.5" />
              {markers.map((marker) => {
                const on = marker.slug === site;
                return (
                  <g key={marker.slug} transform={`translate(${marker.x} ${marker.y})`}>
                    {on && <circle r="13" className={marker.kind === "hq" ? "fill-hot/25" : "fill-accent/25"} />}
                    <circle r={marker.kind === "hq" ? 6.5 : 4.5} className={`${marker.kind === "hq" ? "fill-hot" : "fill-accent"} stroke-white`} strokeWidth="1.5" />
                    <circle
                      r="14"
                      fill="transparent"
                      className="cursor-pointer outline-offset-2"
                      tabIndex={0}
                      role="button"
                      aria-label={`${marker.name}, ${marker.city}`}
                      aria-pressed={on}
                      onClick={() => setSite(marker.slug)}
                      onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && setSite(marker.slug)}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="grid gap-5">
            <div className="grid gap-3 bg-white p-6" aria-live="polite">
              <span className={`label ${selected.kind === "hq" ? "text-hot" : "text-accent"}`}>{selected.kind === "hq" ? labels.hq : labels.subsidiary}</span>
              <h3 className="display text-2xl leading-tight font-bold">{selected.name}</h3>
              <p className="text-ink-2">
                {selected.city}, {selected.country}
              </p>
              {selected.kind === "hq" ? (
                <button type="button" className="btn btn-solid justify-self-start" onClick={openPlant}>
                  {labels.enterPlant}
                </button>
              ) : (
                <p className="label text-steel">{labels.tourSoon}</p>
              )}
            </div>
            <ul className="grid max-h-72 overflow-y-auto border-y border-line">
              {markers.map((marker) => (
                <li key={marker.slug}>
                  <button
                    type="button"
                    aria-pressed={marker.slug === site}
                    onClick={() => setSite(marker.slug)}
                    className="flex w-full cursor-pointer items-baseline justify-between gap-4 border-t border-line py-2.5 text-left first:border-t-0 hover:text-accent aria-pressed:font-semibold aria-pressed:text-accent"
                  >
                    <span>{marker.city}</span>
                    <span className="label text-steel">{marker.country}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section ref={stageRef} className="on-dark scroll-mt-(--nh) bg-ink text-paper" aria-label={plant.name} id="stabilimento">
        <div className="wrap flex flex-wrap items-end justify-between gap-4 pt-12 pb-5">
          <div className="grid gap-2">
            <span className="label text-accent-hi">{labels.hq}</span>
            <h2 className="display text-[clamp(1.8rem,4vw,3.2rem)] leading-none font-extrabold">{plant.name}</h2>
            <p className="text-fog">{plant.address}</p>
          </div>
          <div role="tablist" className="flex flex-wrap gap-2">
            {tabs.map(([id, name]) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`site-tab-${id}`}
                aria-selected={view === id}
                onClick={() => show(id)}
                className={`min-h-11 cursor-pointer rounded-xs border px-4 font-semibold transition-colors ${
                  view === id ? "border-paper bg-paper text-ink" : "border-rule text-fog hover:border-paper hover:text-paper"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="site-stage">
          {(view === "plant" || view === "tour") && (
            <div
              className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
              onPointerCancel={endDrag}
            >
              {view === "plant" && <PlantCanvas plant={plant} control={control} active={live} label={labels.plantLabel} onLabels={setRoles} />}
              {view === "tour" && <TourCanvas tour={tour} control={control} active={live} label={labels.tourLabel} />}
            </div>
          )}

          {view === "plant" && (
            <>
              <div className="pointer-events-none absolute inset-0">
                {roles.map((role, index) => (
                  <button
                    key={`${role}-${index}`}
                    ref={(element) => {
                      control.current.markers[index] = element;
                    }}
                    type="button"
                    className="site-pin"
                    onClick={() => enter(role)}
                  >
                    <b>{labels.roles[role] ?? role}</b>
                    <span>{labels.enter} →</span>
                  </button>
                ))}
              </div>
              <p className="label absolute top-4 left-(--gutter) max-w-[60%] text-fog">{labels.drag}</p>
              <div className="absolute right-(--gutter) bottom-4 flex flex-wrap justify-end gap-2">
                <a className="site-tool" href={`https://earth.google.com/web/@${lat},${lon},300a,650d,35y,20h,60t,0r`} target="_blank" rel="noreferrer">
                  {labels.openEarth}
                </a>
                <button type="button" className="site-tool" aria-label={labels.zoomOut} onClick={() => zoomBy(1.2)}>
                  −
                </button>
                <button type="button" className="site-tool" aria-label={labels.zoomIn} onClick={() => zoomBy(0.83)}>
                  +
                </button>
              </div>
              <p className="absolute bottom-4 left-(--gutter) max-w-[55%] text-[11px] text-fog">
                {labels.roleNote} · {plant.attribution} · {plant.ground.attribution}
              </p>
            </>
          )}

          {view === "tour" && (
            <>
              <div className="pointer-events-none absolute inset-0">
                {tour.nodes.map((item, index) => (
                  <button
                    key={item.id}
                    ref={(element) => {
                      control.current.markers[index] = element;
                    }}
                    type="button"
                    className="tour-arrow"
                    aria-label={`${labels.goTo} ${item.name}`}
                    onClick={() => goTo(item.id)}
                  >
                    <i aria-hidden="true">↑</i>
                    <span>{item.name}</span>
                  </button>
                ))}
                {tour.machines.map((item, index) => (
                  <button
                    key={item.slug}
                    ref={(element) => {
                      control.current.markers[tour.nodes.length + index] = element;
                    }}
                    type="button"
                    className="tour-tag"
                    aria-pressed={machine === item.slug}
                    onClick={() => setMachine(machine === item.slug ? null : item.slug)}
                  >
                    {item.name}
                  </button>
                ))}
              </div>

              <div className="tour-panel">
                <span className="label text-accent-hi">{zone.name}</span>
                <strong className="display text-xl leading-tight font-bold">{currentNode.name}</strong>
                <p className="text-sm text-fog">{zone.text}</p>
                <div className="photo aspect-[16/9] max-sm:hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element -- remote demo photo from FICEP's site */}
                  <img src={zone.photo} alt="" loading="lazy" referrerPolicy="no-referrer" />
                </div>
                <Link href={zone.href} className="text-sm font-semibold text-accent-hi hover:text-paper">
                  {labels.openPage} →
                </Link>
              </div>

              {activeMachine && (
                <div className="tour-machine" aria-live="polite">
                  <strong className="display text-lg font-bold">{activeMachine.name}</strong>
                  <p className="text-sm text-fog">{activeMachine.summary}</p>
                  <Link href={activeMachine.href} className="btn btn-solid min-h-10 justify-self-start text-sm">
                    {labels.machineOpen}
                  </Link>
                </div>
              )}

              <div className="tour-map">
                <svg viewBox={`${bounds[0] - 2} ${bounds[1] - 2} ${bounds[2] - bounds[0] + 4} ${bounds[3] - bounds[1] + 4}`} role="group" aria-label={labels.viewpoints}>
                  {tour.zones.map((item) => (
                    <rect
                      key={item.id}
                      x={item.rect[0]}
                      y={item.rect[1]}
                      width={item.rect[2] - item.rect[0]}
                      height={item.rect[3] - item.rect[1]}
                      className={item.id === zone.id ? "fill-accent/45 stroke-accent-hi" : "fill-coal stroke-steel"}
                      strokeWidth="0.35"
                    />
                  ))}
                  {tour.nodes.map((item) => (
                    <circle
                      key={item.id}
                      cx={item.pos[0]}
                      cy={item.pos[1]}
                      r="1.5"
                      className={`cursor-pointer ${item.id === node ? "fill-hot" : "fill-paper"}`}
                      tabIndex={0}
                      role="button"
                      aria-label={item.id === node ? `${labels.youAreHere}: ${item.name}` : `${labels.goTo} ${item.name}`}
                      onClick={() => goTo(item.id)}
                      onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && goTo(item.id)}
                    />
                  ))}
                  <g
                    ref={(element) => {
                      control.current.compass = element;
                    }}
                  >
                    <path d="M0 5.5 L-2.6 -1.5 L2.6 -1.5 Z" className="fill-hot/70" />
                  </g>
                </svg>
              </div>
              <p className="label absolute top-4 right-(--gutter) text-right text-fog max-sm:hidden">{labels.lookAround}</p>
            </>
          )}

          {view === "satellite" && (
            <iframe
              title={labels.tabs.satellite}
              className="absolute inset-0 size-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${lat},${lon}&t=k&z=17&output=embed`}
            />
          )}

          {view === "earth" && mapsKey && <GoogleEarth mapsKey={mapsKey} lat={lat} lon={lon} />}
        </div>
        {view === "tour" && <p className="wrap py-4 text-xs text-fog">{labels.tourNote}</p>}
      </section>
    </>
  );
}

/**
 * Google's photorealistic 3D view (the Google Earth imagery). Needs a Google Maps
 * key in NEXT_PUBLIC_GOOGLE_MAPS_KEY; without one this tab is not shown.
 */
function GoogleEarth({ mapsKey, lat, lon }: { mapsKey: string; lat: number; lon: number }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = "google-maps-3d";
    if (!document.getElementById(id)) {
      const script = document.createElement("script");
      script.id = id;
      script.async = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(mapsKey)}&v=alpha&libraries=maps3d`;
      document.head.appendChild(script);
    }
    const map = document.createElement("gmp-map-3d");
    map.setAttribute("center", `${lat},${lon},300`);
    map.setAttribute("tilt", "62");
    map.setAttribute("range", "700");
    map.setAttribute("heading", "20");
    map.setAttribute("mode", "hybrid");
    map.style.cssText = "position:absolute;inset:0";
    const element = host.current;
    element?.appendChild(map);
    return () => {
      element?.removeChild(map);
    };
  }, [mapsKey, lat, lon]);
  return <div ref={host} className="absolute inset-0" />;
}
