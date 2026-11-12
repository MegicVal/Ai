import Link from "next/link";
import type { ReactNode } from "react";
import { Reveal } from "@/components/layout/Motion";
import { Slideshow } from "@/components/Slideshow";
import { getMachine, machinePath, viewerParts, type Machine } from "@/lib/content";
import { href, tr, type Dictionary, type Locale } from "@/lib/i18n";
import type { StagePart, ViewerLabels } from "@/components/machine/types";

export const band = "py-[clamp(64px,9vw,128px)]";
/** Section and page titles carry FICEP green. */
export const h2 = "display text-[clamp(2rem,4.8vw,4.2rem)] leading-[0.98] font-bold text-accent";
export const h3 = "display text-[clamp(1.5rem,2.8vw,2.3rem)] leading-[1.05] font-bold text-accent";

export const arrow = (
  <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1.5">
    →
  </span>
);

/** Keeps the first occurrence of each picture, drops empties. */
export const pictures = (...sources: (string | null | undefined)[]): string[] => [...new Set(sources.filter((src): src is string => !!src))];

/**
 * A photo loaded straight from FICEP's website. Nothing is copied into this project;
 * replace `src` with licensed files when the concept becomes a real site.
 */
export function Photo({ src, alt = "", className = "", eager = false }: { src: string; alt?: string; className?: string; eager?: boolean }) {
  return (
    <div className={`photo ${eager ? "photo-still" : ""} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- remote demo imagery, not ours to optimise or re-host */}
      <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" fetchPriority={eager ? "high" : undefined} referrerPolicy="no-referrer" />
    </div>
  );
}

/**
 * Page opening shared by every page: pictures playing across the full width,
 * and a white card with the title lifted over their lower edge.
 */
export function HeroShell({ images, media, tall = false, children }: { images?: string[]; media?: ReactNode; tall?: boolean; children: ReactNode }) {
  return (
    <section className="pb-[clamp(28px,4vw,56px)]">
      <div className={`hero-media ${tall ? "tall" : ""}`}>{media ?? (images && images.length > 0 && <Slideshow images={images} priority />)}</div>
      <div className="wrap">
        <div className="hero-card card">{children}</div>
      </div>
    </section>
  );
}

/** Top of an inner page: pictures, kicker, green title, lead. */
export function PageHero({
  kicker,
  title,
  lead,
  image,
  images,
  children,
}: {
  kicker: string;
  title: string;
  lead?: string;
  image?: string;
  images?: string[];
  children?: ReactNode;
}) {
  return (
    <HeroShell images={pictures(image, ...(images ?? []))}>
      <span className="label text-accent-hi">{kicker}</span>
      <h1 className="display max-w-[18ch] text-[clamp(2.3rem,6vw,5rem)] leading-[0.95] font-bold text-accent">{title}</h1>
      {lead && <p className="max-w-[60ch] text-lg text-ink-2">{lead}</p>}
      {children}
    </HeroShell>
  );
}

export function SectionHead({ kicker, title, id }: { kicker?: string; title: string; id?: string }) {
  return (
    <Reveal className="grid gap-3">
      {kicker && <span className="label text-accent-hi">{kicker}</span>}
      <h2 id={id} className={`${h2} max-w-[17ch]`}>
        {title}
      </h2>
    </Reveal>
  );
}

/** Catalogue card: real photo, name, one-line summary. */
export function MachineCard({ machine, lang }: { machine: Pick<Machine, "slug" | "name" | "summary" | "thumb">; lang: Locale }) {
  return (
    <Link href={href(lang, machinePath(machine.slug))} className="group grid h-full content-start gap-3">
      <Photo src={machine.thumb} alt={machine.name} className="aspect-[16/9] bg-white" />
      <span className="flex items-baseline justify-between gap-3">
        <strong className="display text-xl leading-tight font-bold transition-colors group-hover:text-accent">{machine.name}</strong>
        <span className="text-accent">{arrow}</span>
      </span>
      <span className="text-[0.95rem] text-ink-2">{tr(machine.summary, lang)}</span>
    </Link>
  );
}

export const viewerLabels = (dict: Dictionary): ViewerLabels => dict.viewer;

const mitrol = {
  it: " Il controllo numerico è sviluppato da Mitrol, nel gruppo FICEP.",
  en: " The numerical control is developed by Mitrol, part of the FICEP group.",
};
const steelProjects = {
  it: " Per la carpenteria, la suite Steel Projects collega l'ufficio tecnico all'officina.",
  en: " For steel fabrication, the Steel Projects suite links the design office to the shop floor.",
};

/** The translated component list of a machine's 3D model. */
export function stageParts(machine: Machine, lang: Locale): StagePart[] {
  const steel = machine.division === "steel";
  return (viewerParts[machine.viewer.archetype] ?? []).map((component) => ({
    id: component.id,
    name: tr(component.name, lang),
    // Mitrol controls and Steel Projects software are documented for the steel lines only.
    role: tr(component.function, lang) + (steel && component.id === "cnc" ? tr(mitrol, lang) : steel && component.id === "sw" ? tr(steelProjects, lang) : ""),
    explode: component.explode,
  }));
}

export const machinesBySlug = (slugs: string[]): Machine[] => slugs.map(getMachine).filter((machine): machine is Machine => !!machine);
