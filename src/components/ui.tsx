import Link from "next/link";
import type { ReactNode } from "react";
import { Reveal } from "@/components/layout/Motion";
import { getMachine, machinePath, viewerParts, type Machine } from "@/lib/content";
import { href, tr, type Dictionary, type Locale } from "@/lib/i18n";
import type { StagePart, ViewerLabels } from "@/components/machine/types";

export const band = "py-[clamp(64px,9vw,128px)]";
export const h2 = "display text-[clamp(2rem,5.2vw,4.6rem)] leading-[0.95] font-extrabold";
export const h3 = "display text-[clamp(1.5rem,3vw,2.4rem)] leading-none font-bold";

export const arrow = (
  <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1.5">
    →
  </span>
);

/**
 * A photo loaded straight from FICEP's website. Nothing is copied into this project;
 * replace `src` with licensed files when the concept becomes a real site.
 */
export function Photo({ src, alt = "", className = "", eager = false }: { src: string; alt?: string; className?: string; eager?: boolean }) {
  return (
    <div className={`photo ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- remote demo imagery, not ours to optimise or re-host */}
      <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" fetchPriority={eager ? "high" : undefined} referrerPolicy="no-referrer" />
    </div>
  );
}

/** Top of an inner page: photo behind, kicker, large title, lead. */
export function PageHero({ kicker, title, lead, image, children }: { kicker: string; title: string; lead?: string; image?: string; children?: ReactNode }) {
  return (
    <section className="on-dark relative isolate overflow-hidden bg-ink text-paper">
      {image && (
        <>
          <Photo src={image} eager className="absolute inset-0 -z-20 bg-ink" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/70 to-ink/55" />
        </>
      )}
      <div className="wrap grid min-h-[58svh] content-end gap-5 pt-40 pb-14">
        <span className="label text-accent-hi">{kicker}</span>
        <h1 className="display max-w-[18ch] text-[clamp(2.4rem,7vw,6rem)] leading-[0.92] font-extrabold">{title}</h1>
        {lead && <p className="max-w-[58ch] text-lg text-[#d5dbd8]">{lead}</p>}
        {children}
      </div>
    </section>
  );
}

export function SectionHead({ kicker, title, id, dark = false }: { kicker?: string; title: string; id?: string; dark?: boolean }) {
  return (
    <Reveal className="grid gap-3">
      {kicker && <span className={`label ${dark ? "text-accent-hi" : "text-accent"}`}>{kicker}</span>}
      <h2 id={id} className={`${h2} max-w-[16ch]`}>
        {title}
      </h2>
    </Reveal>
  );
}

/** Catalogue card: real photo, name, one-line summary. */
export function MachineCard({ machine, lang, dark = false }: { machine: Pick<Machine, "slug" | "name" | "summary" | "thumb">; lang: Locale; dark?: boolean }) {
  return (
    <Link href={href(lang, machinePath(machine.slug))} className="group grid h-full content-start gap-3">
      <Photo src={machine.thumb} alt={machine.name} className="aspect-[16/9]" />
      <span className="flex items-baseline justify-between gap-3">
        <strong className="display text-xl leading-tight font-bold transition-colors group-hover:text-accent">{machine.name}</strong>
        <span className={dark ? "text-fog" : "text-steel"}>{arrow}</span>
      </span>
      <span className={`text-[0.95rem] ${dark ? "text-fog" : "text-ink-2"}`}>{tr(machine.summary, lang)}</span>
    </Link>
  );
}

export const viewerLabels = (dict: Dictionary): ViewerLabels => dict.viewer;

/** The translated component list of a machine's 3D model. */
export function stageParts(machine: Machine, lang: Locale): StagePart[] {
  return (viewerParts[machine.viewer.archetype] ?? []).map((component) => ({
    id: component.id,
    name: tr(component.name, lang),
    role: tr(component.function, lang),
    explode: component.explode,
  }));
}

export const machinesBySlug = (slugs: string[]): Machine[] => slugs.map(getMachine).filter((machine): machine is Machine => !!machine);
