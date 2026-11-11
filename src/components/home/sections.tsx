import showcaseJson from "@content/showcase.json";
import Link from "next/link";
import { Reveal } from "@/components/layout/Motion";
import { MachineShowcase, type ShowcaseItem } from "@/components/machine/MachineShowcase";
import { Photo, SectionHead, arrow, band, h2, machinesBySlug, stageParts, viewerLabels } from "@/components/ui";
import { catalog, events, home, locations, machineCount, machinePath, news, sectors, site } from "@/lib/content";
import { href, tr, type Dictionary, type Locale } from "@/lib/i18n";
import { HeroVideo, NewsletterForm } from "./client";

interface SectionProps {
  lang: Locale;
  dict: Dictionary;
}

const stack = "wrap grid gap-[clamp(32px,5vw,64px)]";

function formatDate(iso: string, lang: Locale, withYear = true) {
  return new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: withYear ? "numeric" : undefined }).format(
    new Date(`${iso}T12:00:00Z`),
  );
}

/** Full-bleed company film with the headline over it. */
export function HomeHero({ lang }: SectionProps) {
  const t = showcaseJson.hero;
  return (
    <section className="on-dark relative isolate overflow-hidden bg-ink text-paper">
      <HeroVideo src={t.video} poster={t.poster} />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/50 to-ink/50" />
      <div className="wrap grid min-h-[calc(100svh-var(--nh))] content-end gap-6 pt-40 pb-16">
        <span className="label text-accent-hi">{tr(t.kicker, lang)}</span>
        <h1 className="display max-w-[15ch] text-[clamp(2.6rem,7.4vw,6.6rem)] leading-[0.92] font-extrabold">{tr(t.title, lang)}</h1>
        <p className="max-w-[52ch] text-lg text-[#d5dbd8]">{tr(t.body, lang)}</p>
        <div className="flex flex-wrap gap-2.5">
          <Link href={href(lang, "/macchine")} className="btn btn-solid">
            {tr(t.primary, lang)}
          </Link>
          <Link href={href(lang, "/sedi")} className="btn btn-ghost">
            {tr(t.secondary, lang)}
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Eight machines, one per family, in the interactive 3D viewer. */
export function Showcase({ lang, dict }: SectionProps) {
  const t = showcaseJson.showcase;
  const items: ShowcaseItem[] = machinesBySlug(t.machines).map((machine) => {
    const family = catalog.divisions.flatMap((division) => division.categories).find((category) => category.id === machine.category);
    return {
      slug: machine.slug,
      name: machine.name,
      family: family ? tr(family.name, lang) : "",
      summary: tr(machine.summary, lang),
      href: href(lang, machinePath(machine.slug)),
      source: machine.viewer,
      parts: stageParts(machine, lang),
    };
  });
  return (
    <section className="on-dark bg-ink pt-[clamp(64px,9vw,128px)] text-paper" aria-labelledby="showcase-title" id="3d">
      <div className="wrap grid gap-5 pb-8 lg:grid-cols-2 lg:items-end">
        <div className="grid gap-3">
          <span className="label text-accent-hi">{tr(t.kicker, lang)}</span>
          <h2 id="showcase-title" className={h2}>
            {tr(t.title, lang)}
          </h2>
        </div>
        <p className="max-w-[50ch] text-lg text-fog lg:justify-self-end">{tr(t.body, lang)}</p>
      </div>
      <MachineShowcase items={items} labels={viewerLabels(dict)} openLabel={tr(t.open, lang)} />
    </section>
  );
}

export function Divisions({ lang }: SectionProps) {
  const t = home.divisions;
  return (
    <section className={band} aria-labelledby="divisions-title">
      <div className={stack}>
        <SectionHead kicker={tr(t.kicker, lang)} title={tr(t.title, lang)} id="divisions-title" />
        <div className="grid gap-4 lg:grid-cols-2">
          {catalog.divisions.map((division, index) => {
            const forging = division.id === "forging";
            return (
              <Reveal key={division.id} delay={index * 0.08}>
                <article className={`grid h-full content-start ${forging ? "on-dark bg-ink text-paper" : "bg-white"}`}>
                  <Link href={href(lang, `/macchine/${division.slug}`)} className="group block" tabIndex={-1} aria-hidden="true">
                    <Photo src={division.image} alt="" className="aspect-[16/9]" />
                  </Link>
                  <div className="grid gap-6 p-6 sm:p-9">
                    <div className="grid gap-4">
                      <span className={`label ${forging ? "text-hot" : "text-accent"}`}>
                        {machineCount(division)} {tr(t.countLabel, lang)}
                      </span>
                      <h3 className="display text-[clamp(2rem,4.2vw,3.4rem)] leading-none font-extrabold">{tr(division.name, lang)}</h3>
                      <p className={`max-w-[46ch] text-lg ${forging ? "text-fog" : "text-ink-2"}`}>{tr(division.summary, lang)}</p>
                    </div>
                    <ul className={`grid border-b ${forging ? "border-rule" : "border-line"}`}>
                      {division.categories.map((category) => (
                        <li key={category.id}>
                          <Link
                            href={href(lang, `/macchine/${division.slug}/${category.id}`)}
                            className={`group flex items-baseline justify-between gap-4 border-t py-3 font-medium transition-colors ${
                              forging ? "border-rule hover:text-hot" : "border-line hover:text-accent"
                            }`}
                          >
                            <span>{tr(category.name, lang)}</span>
                            <span className={`font-mono text-xs tabular-nums ${forging ? "text-fog" : "text-ink-2"}`}>
                              {String(category.machines.length).padStart(2, "0")} {arrow}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link href={href(lang, `/macchine/${division.slug}`)} className="btn btn-ghost justify-self-start">
                      {tr(t.cta, lang)}
                    </Link>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const tileStyle: Record<string, string> = {
  ink: "bg-ink text-paper [&_p]:text-fog",
  white: "bg-white [&_p]:text-ink-2",
  accent: "bg-accent text-white [&_p]:text-[#d6efe9]",
};

export function Numbers({ lang }: SectionProps) {
  const t = home.numbers;
  return (
    <section className={`${band} pt-0`} aria-labelledby="numbers-title">
      <div className={stack}>
        <SectionHead kicker={tr(t.kicker, lang)} title={lang === "it" ? "Quasi un secolo, in numeri." : "Almost a century, in numbers."} id="numbers-title" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {t.tiles.map((tile, index) => (
            <Reveal key={tile.value} delay={(index % 4) * 0.05} className={tile.wide ? "sm:col-span-2" : ""}>
              <div className={`grid h-full min-h-[190px] content-between gap-7 p-6 ${tileStyle[tile.style]}`}>
                <b className="display text-[clamp(2.6rem,6vw,5rem)] leading-[0.9] font-extrabold tracking-[-0.03em] tabular-nums">{tile.value}</b>
                <p className="max-w-[26ch] text-[0.95rem]">{tr(tile.text, lang)}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Link href={href(lang, "/azienda/storia")} className="btn btn-ghost justify-self-start">
          {tr(t.cta, lang)}
        </Link>
      </div>
    </section>
  );
}

export function Sectors({ lang }: SectionProps) {
  const t = home.sectors;
  return (
    <section className={`${band} bg-white`} aria-labelledby="sectors-title">
      <div className={stack}>
        <SectionHead kicker={tr(t.kicker, lang)} title={tr(t.title, lang)} id="sectors-title" />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sectors.map((sector, index) => (
            <li key={sector.slug}>
              <Reveal delay={(index % 3) * 0.06}>
                <Link href={href(lang, `/settori/${sector.slug}`)} className="group on-dark relative isolate grid aspect-[4/3] content-end overflow-hidden bg-ink p-5 text-paper">
                  <Photo src={sector.image} alt="" className="absolute inset-0 -z-20" />
                  <span className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/90 via-ink/25 to-transparent" />
                  <strong className="display text-[clamp(1.3rem,2.2vw,1.8rem)] leading-tight font-bold">{tr(sector.name, lang)}</strong>
                  <span className="flex items-baseline justify-between gap-4 text-[0.95rem] text-[#d5dbd8]">
                    {tr(sector.text, lang)} <span className="text-hot">{arrow}</span>
                  </span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Finder({ lang }: SectionProps) {
  const t = home.finder;
  return (
    <section className={band} aria-labelledby="finder-title">
      <div className="wrap grid items-end gap-12 lg:grid-cols-[1.25fr_1fr]">
        <Reveal className="grid gap-6">
          <span className="label text-accent">{tr(t.kicker, lang)}</span>
          <h2 id="finder-title" className={`${h2} max-w-[13ch]`}>
            {tr(t.title, lang)}
          </h2>
          <p className="max-w-[48ch] text-lg text-ink-2">{tr(t.body, lang)}</p>
          <Link href={href(lang, site.finderPath)} className="btn btn-solid justify-self-start">
            {tr(t.cta, lang)}
          </Link>
        </Reveal>
        <Reveal delay={0.1}>
          <ol className="border-b border-line">
            {t.steps.map((step, index) => (
              <li key={step.it} className="flex items-baseline gap-5 border-t border-line py-4">
                <span className="font-mono text-xs text-accent tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                <span className="display text-2xl font-semibold">{tr(step, lang)}</span>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}

export function Locations({ lang }: SectionProps) {
  const t = home.locations;
  return (
    <section className={`${band} on-dark bg-ink text-paper`} aria-labelledby="locations-title">
      <div className="wrap grid items-center gap-12 lg:grid-cols-2">
        <Reveal className="grid gap-6">
          <span className="label text-accent-hi">{tr(t.kicker, lang)}</span>
          <h2 id="locations-title" className={`${h2} max-w-[12ch]`}>
            {tr(t.title, lang)}
          </h2>
          <p className="max-w-[48ch] text-lg text-fog">{tr(t.body, lang)}</p>
          <ul className="flex flex-wrap gap-2">
            {locations.map((place) => (
              <li key={place.slug} className={`label border px-2.5 py-1.5 ${place.kind === "hq" ? "border-hot text-hot" : "border-rule text-fog"}`}>
                {tr(place.city, lang)}
              </li>
            ))}
          </ul>
          <Link href={href(lang, "/sedi")} className="btn btn-solid justify-self-start">
            {tr(t.cta, lang)}
          </Link>
        </Reveal>
        <Reveal delay={0.1}>
          <Link href={href(lang, "/sedi")} className="group block" tabIndex={-1} aria-hidden="true">
            <Photo src="https://ficepgroup.com/wp-content/uploads/2022/10/b-chi-siamo.jpg" alt="" className="aspect-[4/3]" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

export function NewsGrid({ lang, items, columns = "sm:grid-cols-2" }: SectionProps & { items: typeof news; columns?: string }) {
  return (
    <ul className={`grid gap-x-6 gap-y-10 ${columns}`}>
      {items.map((item, index) => (
        <li key={item.slug}>
          <Reveal delay={(index % 3) * 0.06} className="grid gap-4">
            <Photo src={item.image} alt="" className="aspect-[3/2]" />
            <time dateTime={item.date} className="label text-ink-2">
              {formatDate(item.date, lang)}
            </time>
            <h3 className="display text-xl leading-tight font-bold">{tr(item.title, lang)}</h3>
            <p className="text-[0.95rem] text-ink-2">{tr(item.excerpt, lang)}</p>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

export function EventList({ lang, dict }: SectionProps) {
  return (
    <ul className="border-b border-line">
      {events.map((event) => (
        <li key={event.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 border-t border-line py-4">
          <strong className="display text-lg font-bold">{event.name}</strong>
          <span className="label text-steel">{dict.common.past}</span>
          <span className="text-sm text-ink-2">{tr(event.place, lang)}</span>
          <span className="font-mono text-xs text-ink-2 tabular-nums">
            {formatDate(event.start, lang, false)} – {formatDate(event.end, lang)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function NewsEvents({ lang, dict }: SectionProps) {
  return (
    <section className={`${band} bg-white`} aria-label={`${tr(home.news.kicker, lang)} · ${tr(home.events.kicker, lang)}`}>
      <div className="wrap grid gap-16 lg:grid-cols-[1.5fr_1fr]">
        <div className="grid content-start gap-8">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div className="grid gap-3">
              <span className="label text-accent">{tr(home.news.kicker, lang)}</span>
              <h2 className="display text-[clamp(1.8rem,3.6vw,3rem)] leading-none font-extrabold">{tr(home.news.title, lang)}</h2>
            </div>
            <Link href={href(lang, "/news")} className="group font-semibold hover:text-accent">
              {tr(home.news.all, lang)} {arrow}
            </Link>
          </Reveal>
          <NewsGrid lang={lang} dict={dict} items={news.slice(0, 2)} />
        </div>
        <div className="grid content-start gap-8">
          <Reveal className="grid gap-3">
            <span className="label text-accent">{tr(home.events.kicker, lang)}</span>
            <h2 className="display text-[clamp(1.8rem,3.6vw,3rem)] leading-none font-extrabold">{tr(home.events.title, lang)}</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <EventList lang={lang} dict={dict} />
          </Reveal>
          <Link href={href(lang, "/eventi")} className="group font-semibold hover:text-accent">
            {tr(home.events.all, lang)} {arrow}
          </Link>
        </div>
      </div>
    </section>
  );
}

export function Services({ lang }: SectionProps) {
  const t = home.services;
  return (
    <section className={band} aria-label={tr(t.kicker, lang)}>
      <div className="wrap grid gap-6">
        <span className="label text-accent">{tr(t.kicker, lang)}</span>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {t.items.map((item, index) => (
            <li key={item.path}>
              <Reveal delay={index * 0.05} className="h-full">
                <Link
                  href={href(lang, item.path)}
                  className="group grid h-full min-h-[170px] content-between gap-8 bg-white p-6 transition-colors hover:bg-ink hover:text-paper"
                >
                  <span className="flex items-baseline justify-between gap-4">
                    <strong className="display text-2xl font-bold">{tr(item.title, lang)}</strong>
                    <span className="text-xl text-steel group-hover:text-hot">{arrow}</span>
                  </span>
                  <span className="text-[0.95rem] text-ink-2 transition-colors group-hover:text-fog">{tr(item.text, lang)}</span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Newsletter({ lang }: SectionProps) {
  const t = home.newsletter;
  return (
    <section className="border-t border-line bg-white py-16" aria-labelledby="newsletter-title">
      <div className="wrap grid items-center gap-8 lg:grid-cols-2">
        <h2 id="newsletter-title" className="display max-w-[22ch] text-[clamp(1.6rem,3vw,2.4rem)] leading-tight font-bold">
          {tr(t.title, lang)}
        </h2>
        <NewsletterForm placeholder={tr(t.placeholder, lang)} cta={tr(t.cta, lang)} demo={tr(t.demo, lang)} />
      </div>
    </section>
  );
}
