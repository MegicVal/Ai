import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MachineCard, PageHero, SectionHead, band, machinesBySlug } from "@/components/ui";
import { home, sectors, site } from "@/lib/content";
import { getDictionary, hasLocale, href, locales, tr } from "@/lib/i18n";

export function generateStaticParams() {
  return locales.flatMap((lang) => sectors.map((sector) => ({ lang, slug: sector.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/settori/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const sector = sectors.find((item) => item.slug === slug);
  return sector && hasLocale(lang) ? { title: tr(sector.name, lang), description: tr(sector.text, lang) } : {};
}

export default async function SectorPage({ params }: PageProps<"/[lang]/settori/[slug]">) {
  const { lang, slug } = await params;
  const sector = sectors.find((item) => item.slug === slug);
  if (!hasLocale(lang) || !sector) notFound();
  const dict = getDictionary(lang);
  return (
    <>
      <PageHero
        kicker={tr(home.sectors.kicker, lang)}
        title={tr(sector.name, lang)}
        lead={tr(sector.text, lang)}
        image={sector.image}
        images={machinesBySlug(sector.machines).map((machine) => machine.hero)}
      />
      <section className="py-14">
        <div className="wrap">
          <p className="display max-w-[40ch] text-[clamp(1.3rem,2.4vw,1.9rem)] leading-snug font-semibold">{tr(sector.body, lang)}</p>
        </div>
      </section>
      <section className={`${band} bg-white`} aria-labelledby="solution-title">
        <div className="wrap grid gap-10">
          <SectionHead title={dict.common.solution} id="solution-title" />
          <ul className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {machinesBySlug(sector.machines).map((machine) => (
              <li key={machine.slug}>
                <MachineCard machine={machine} lang={lang} />
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2.5">
            <Link href={href(lang, site.finderPath)} className="btn btn-solid">
              {dict.header.finder}
            </Link>
            <Link href={href(lang, "/settori")} className="btn btn-ghost">
              {dict.common.allSectors}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
