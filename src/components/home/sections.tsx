import showcaseJson from "@content/showcase.json";
import Link from "next/link";
import { Reveal } from "@/components/layout/Motion";
import { MachineShowcase, type ShowcaseItem } from "@/components/machine/MachineShowcase";
import { Slideshow } from "@/components/Slideshow";
import { HeroShell, Photo, SectionHead, arrow, band, h2, machinesBySlug, pictures, stageParts, viewerLabels } from "@/components/ui";
import { catalog, events, home, locations, machineCount, machinePath, machines, news, sectors, site } from "@/lib/content";
import { href, tr, type Dictionary, type Locale } from "@/lib/i18n";
import { HeroVideo, NewsletterForm } from "./client";

interface SectionProps {
  lang: Locale;
  dict: Dictionary;
}

const stack = "wrap grid gap-[clamp(32px,5vw,64px)]";
const kicker = "label text-accent-hi";

function formatDate(iso: string, lang: Locale, withYear = true) {
  return new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: withYear ? "numeric" : undefined }).format(
    new Date(`${iso}T12:00:00Z`),
  );
}

/** The company film across the full width, with the headline on a white card over its lower edge. */
export function HomeHero({ lang }: SectionProps) {
  const t = showcaseJson.hero;
  return (
    <HeroShell tall media={<HeroVideo src={t.video} poster={t.poster} />}>
      <span className={kicker}>{tr(t.kicker, lang)}</span>
      <h1 className="display max-w-[17ch] text-[clamp(2.3rem,6vw,5rem)] leading-[0.95] font-bold text-accent">{tr(t.title, lang)}</h1>
      <p className="max-w-[56ch] text-lg text-ink-2">{tr(t.body, lang)}</p>
      <div className="flex flex-wrap gap-2.5 pt-1">
        <Link href={href(lang, "/macchine")} className="btn btn-solid">
          {tr(t.primary, lang)}
        </Link>
        <Link href={href(lang, "/sedi")} className="btn btn-ghost">
          {tr(t.secondary, lang)}
        </Link>
      </div>
    </HeroShell>
  );
}

/** Every machine name, running across the page under the hero. */
export function Ticker() {
  const names = machines.map((machine) => machine.name);
  const row = (hidden: boolean) => (
    <div aria-hidden={hidden}>
      {names.map((name) => (
        <span key={name}>{name}</span>
      ))}
    </div>
  );
  return (
    <div className="ticker display border-y border-line py-4 text-[clamp(1.05rem,2vw,1.6rem)] font-bold text-accent/30">
      {row(false)}
      {row(true)}
    </div>
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
    <section className="bg-white pt-[clamp(64px,9vw,128px)]" aria-labelledby="showcase-title" id="3d">
      <div className="wrap grid gap-5 pb-8 lg:grid-cols-2 lg:items-end">
        <div className="grid gap-3">
          <span className={kicker}>{tr(t.kicker, lang)}</span>
          <h2 id="showcase-title" className={h2}>
            {tr(t.title, lang)}
          </h2>
        </div>
        <p className="max-w-[50ch] text-lg text-ink-2 lg:justify-self-end">{tr(t.body, lang)}</p>
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
        <div className="grid gap-5 lg:grid-cols-2">
          {catalog.divisions.map((division, index) => (
            <Reveal key={division.id} delay={index * 0.08}>
              <article className="card grid h-full content-start overflow-hidden">
                <Link href={href(lang, `/macchine/${division.slug}`)} className="block" tabIndex={-1} aria-hidden="true">
                  <Slideshow
                    images={pictures(division.image, ...machines.filter((machine) => machine.division === division.id).slice(0, 5).map((machine) => machine.hero))}
                    interval={4200 + index * 700}
                    className="aspect-[16/9] rounded-none"
                  />
                </Link>
                <div className="grid gap-6 p-6 sm:p-9">
                  <div className="grid gap-4">
                    <span className={kicker}>
                      {machineCount(division)} {tr(t.countLabel, lang)}
                    </span>
                    <h3 className="display text-[clamp(1.9rem,3.8vw,3rem)] leading-none font-bold text-accent">{tr(division.name, lang)}</h3>
                    <p className="max-w-[46ch] text-lg text-ink-2">{tr(division.summary, lang)}</p>
                  </div>
                  <ul className="grid border-b border-line">
                    {division.categories.map((category) => (
                      <li key={category.id}>
                        <Link
                          href={href(lang, `/macchine/${division.slug}/${category.id}`)}
                          className="group flex items-baseline justify-between gap-4 border-t border-line py-3 font-medium transition-colors hover:text-accent"
                        >
                          <span>{tr(category.name, lang)}</span>
                          <span className="font-mono text-xs text-ink-2 tabular-nums group-hover:text-accent">
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
          ))}
        </div>
      </div>
    </section>
  );
}

const tileStyle: Record<string, string> = {
  ink: "bg-accent text-white [&_p]:text-white/85",
  white: "card text-accent [&_p]:text-ink-2",
  accent: "bg-mint text-accent [&_p]:text-ink-2",
};

export function Numbers({ lang }: SectionProps) {
  const t = home.numbers;
  return (
    <section className={`${band} pt-0`} aria-labelledby="numbers-title">
      <div className={stack}>
        <SectionHead kicker={tr(t.kicker, lang)} title={lang === "it" ? "Quasi un secolo, in numeri." : "Almost a century, in numbers."} id="numbers-title" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.tiles.map((tile, index) => (
            <Reveal key={tile.value} delay={(index % 4) * 0.05} className={tile.wide ? "sm:col-span-2" : ""}>
              <div className={`grid h-full min-h-[190px] content-between gap-7 rounded-lg p-6 ${tileStyle[tile.style]}`}>
                <b className="display text-[clamp(2.6rem,5.6vw,4.6rem)] leading-[0.9] font-bold tracking-[-0.03em] tabular-nums">{tile.value}</b>
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
        <ul className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {sectors.map((sector, index) => (
            <li key={sector.slug}>
              <Reveal delay={(index % 3) * 0.06}>
                <Link href={href(lang, `/settori/${sector.slug}`)} className="group grid gap-4">
                  <Photo src={sector.image} alt="" className="aspect-[4/3]" />
                  <span className="flex items-baseline justify-between gap-4">
                    <strong className="display text-[clamp(1.3rem,2.1vw,1.7rem)] leading-tight font-bold transition-colors group-hover:text-accent">
                      {tr(sector.name, lang)}
                    </strong>
                    <span className="text-accent">{arrow}</span>
                  </span>
                  <span className="text-[0.95rem] text-ink-2">{tr(sector.text, lang)}</span>
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
          <span className={kicker}>{tr(t.kicker, lang)}</span>
          <h2 id="finder-title" className={`${h2} max-w-[14ch]`}>
            {tr(t.title, lang)}
          </h2>
          <p className="max-w-[48ch] text-lg text-ink-2">{tr(t.body, lang)}</p>
          <Link href={href(lang, site.finderPath)} className="btn btn-solid justify-self-start">
            {tr(t.cta, lang)}
          </Link>
        </Reveal>
        <Reveal delay={0.1}>
          <ol className="card px-6 py-2">
            {t.steps.map((step, index) => (
              <li key={step.it} className="flex items-baseline gap-5 border-t border-line py-4 first:border-t-0">
                <span className="font-mono text-xs text-accent-hi tabular-nums">{String(index + 1).padStart(2, "0")}</span>
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
    <section className={`${band} bg-mint`} aria-labelledby="locations-title">
      <div className="wrap grid items-center gap-12 lg:grid-cols-2">
        <Reveal className="grid gap-6">
          <span className={kicker}>{tr(t.kicker, lang)}</span>
          <h2 id="locations-title" className={`${h2} max-w-[13ch]`}>
            {tr(t.title, lang)}
          </h2>
          <p className="max-w-[48ch] text-lg text-ink-2">{tr(t.body, lang)}</p>
          <ul className="flex flex-wrap gap-2">
            {locations.map((place) => (
              <li
                key={place.slug}
                className={`label rounded-sm border px-2.5 py-1.5 ${place.kind === "hq" ? "border-accent bg-accent text-white" : "border-accent/25 bg-white text-ink-2"}`}
              >
                {tr(place.city, lang)}
              </li>
            ))}
          </ul>
          <Link href={href(lang, "/sedi")} className="btn btn-solid justify-self-start">
            {tr(t.cta, lang)}
          </Link>
        </Reveal>
        <Reveal delay={0.1}>
          <Link href={href(lang, "/sedi")} className="block" tabIndex={-1} aria-hidden="true">
            <Slideshow
              images={[
                "https://ficepgroup.com/wp-content/uploads/2022/10/b-chi-siamo.jpg",
                "https://ficepgroup.com/wp-content/uploads/2022/10/sr-g6.jpg",
                "https://ficepgroup.com/wp-content/uploads/2022/10/unita-linee-di-taglio.jpg",
                "https://ficepgroup.com/wp-content/uploads/2023/01/academy-b.jpg",
              ]}
              className="aspect-[4/3] shadow-(--shadow)"
            />
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
            <time dateTime={item.date} className="label text-accent-hi">
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

const subhead = "display text-[clamp(1.8rem,3.4vw,2.8rem)] leading-none font-bold text-accent";

export function NewsEvents({ lang, dict }: SectionProps) {
  return (
    <section className={`${band} bg-white`} aria-label={`${tr(home.news.kicker, lang)} · ${tr(home.events.kicker, lang)}`}>
      <div className="wrap grid gap-16 lg:grid-cols-[1.5fr_1fr]">
        <div className="grid content-start gap-8">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div className="grid gap-3">
              <span className={kicker}>{tr(home.news.kicker, lang)}</span>
              <h2 className={subhead}>{tr(home.news.title, lang)}</h2>
            </div>
            <Link href={href(lang, "/news")} className="group font-semibold text-accent hover:text-deep">
              {tr(home.news.all, lang)} {arrow}
            </Link>
          </Reveal>
          <NewsGrid lang={lang} dict={dict} items={news.slice(0, 2)} />
        </div>
        <div className="grid content-start gap-8">
          <Reveal className="grid gap-3">
            <span className={kicker}>{tr(home.events.kicker, lang)}</span>
            <h2 className={subhead}>{tr(home.events.title, lang)}</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <EventList lang={lang} dict={dict} />
          </Reveal>
          <Link href={href(lang, "/eventi")} className="group font-semibold text-accent hover:text-deep">
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
        <span className={kicker}>{tr(t.kicker, lang)}</span>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.items.map((item, index) => (
            <li key={item.path}>
              <Reveal delay={index * 0.05} className="h-full">
                <Link
                  href={href(lang, item.path)}
                  className="group card grid h-full min-h-[170px] content-between gap-8 p-6 transition-colors hover:bg-accent hover:text-white"
                >
                  <span className="flex items-baseline justify-between gap-4">
                    <strong className="display text-2xl font-bold text-accent transition-colors group-hover:text-white">{tr(item.title, lang)}</strong>
                    <span className="text-xl text-accent group-hover:text-white">{arrow}</span>
                  </span>
                  <span className="text-[0.95rem] text-ink-2 transition-colors group-hover:text-white/85">{tr(item.text, lang)}</span>
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
        <h2 id="newsletter-title" className="display max-w-[22ch] text-[clamp(1.6rem,3vw,2.4rem)] leading-tight font-bold text-accent">
          {tr(t.title, lang)}
        </h2>
        <NewsletterForm placeholder={tr(t.placeholder, lang)} cta={tr(t.cta, lang)} demo={tr(t.demo, lang)} />
      </div>
    </section>
  );
}
