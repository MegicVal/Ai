import Link from "next/link";
import { notFound } from "next/navigation";
import { Divisions, Finder, Locations, NewsEvents, Newsletter, Numbers, Sectors, Services, VideoBand } from "@/components/home/sections";
import { HeroStage } from "@/components/machine/HeroStage";
import type { StageLabels, StagePart } from "@/components/machine/types";
import { getMachine, home, site } from "@/lib/content";
import { getDictionary, hasLocale, href, tr } from "@/lib/i18n";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const machine = getMachine(home.featuredMachine);
  if (!machine) notFound();

  const parts: StagePart[] = machine.components.map((component) => ({
    id: component.id,
    name: tr(component.name, lang),
    role: tr(component.function, lang),
    specs: component.specs.map((spec) => [tr(spec.label, lang), tr(spec.value, lang)]),
    explode: component.explode,
    anchor: component.anchor,
    model: component.model,
  }));
  const labels: StageLabels = { ...dict.stage, specNote: tr(machine.specSource, lang) };
  const section = { lang, dict };

  return (
    <>
      {/* The poster is the largest thing on the first screen: fetch it before anything else. */}
      {machine.poster && (
        <>
          <link rel="preload" as="image" href={machine.poster.portrait} media="(max-aspect-ratio: 85/100)" fetchPriority="high" />
          <link rel="preload" as="image" href={machine.poster.landscape} media="(min-aspect-ratio: 85/100)" fetchPriority="high" />
        </>
      )}
      <HeroStage id="macchina" slug={machine.slug} name={machine.name} parts={parts} labels={labels} poster={machine.poster}>
        <div className="ch items-end">
          <div className="grid max-w-[560px] gap-[18px]">
            <span className="label text-accent">{tr(machine.tagline, lang)}</span>
            <h1 className="display text-[clamp(2.1rem,4.6vw,3.9rem)] leading-none font-bold">{tr(home.hero.title, lang)}</h1>
            <p className="max-w-[44ch] text-lg text-ink-2">{tr(home.hero.body, lang)}</p>
            <div className="flex flex-wrap gap-2.5">
              <a href="#esplosa" className="btn btn-solid">
                {tr(home.hero.explodeCta, lang)}
              </a>
              <Link href={href(lang, site.finderPath)} className="btn btn-ghost">
                {dict.header.finder}
              </Link>
            </div>
          </div>
        </div>
        <div className="ch ch-inside items-center">
          <div className="grid max-w-[560px] gap-[18px]">
            <h2 className="display text-[clamp(2.4rem,6vw,5rem)] leading-[0.95] font-extrabold">{tr(home.hero.insideTitle, lang)}</h2>
            <p className="max-w-[36ch] text-lg">{tr(home.hero.insideBody, lang)}</p>
          </div>
        </div>
        <div id="esplosa" className="ch ch-hold" aria-hidden="true" />
      </HeroStage>

      <Divisions {...section} />
      <Numbers {...section} />
      <VideoBand {...section} />
      <Sectors {...section} />
      <Finder {...section} />
      <Locations {...section} />
      <NewsEvents {...section} />
      <Services {...section} />
      <Newsletter {...section} />
    </>
  );
}
