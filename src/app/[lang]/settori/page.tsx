import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero, Photo, arrow } from "@/components/ui";
import { home, sectors } from "@/lib/content";
import { hasLocale, href, tr } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/settori">): Promise<Metadata> {
  const { lang } = await params;
  return { title: hasLocale(lang) ? tr(home.sectors.kicker, lang) : undefined };
}

export default async function SectorsPage({ params }: PageProps<"/[lang]/settori">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <>
      <PageHero kicker={tr(home.sectors.kicker, lang)} title={tr(home.sectors.title, lang)} image={sectors[2].image} />
      <section className="py-14">
        <ul className="wrap grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {sectors.map((sector) => (
            <li key={sector.slug}>
              <Link href={href(lang, `/settori/${sector.slug}`)} className="group grid gap-4">
                <Photo src={sector.image} alt="" className="aspect-[4/3]" />
                <span className="flex items-baseline justify-between gap-4">
                  <strong className="display text-2xl leading-tight font-bold group-hover:text-accent">{tr(sector.name, lang)}</strong>
                  <span className="text-steel">{arrow}</span>
                </span>
                <span className="text-ink-2">{tr(sector.text, lang)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
