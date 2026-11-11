import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { catalog, sectors, site } from "@/lib/content";
import { getDictionary, hasLocale, href, locales, tr, type Localized } from "@/lib/i18n";

/**
 * Stand-in for every page that later phases will build. Keeps all navigation
 * working and says honestly that the page is not there yet.
 */
const upcoming: { path: string; label: Localized | string }[] = [
  ...site.nav,
  ...site.footer.flatMap((column) => column.links),
  ...site.legal,
  { path: site.finderPath, label: { it: "Trova la tua macchina", en: "Find your machine" } },
  { path: site.contactPath, label: { it: "Contatti", en: "Contact" } },
  ...sectors.map((sector) => ({ path: `/settori/${sector.slug}`, label: sector.name })),
  ...catalog.divisions.flatMap((division) => [
    { path: `/macchine/${division.slug}`, label: division.name },
    ...division.categories.map((category) => ({ path: `/macchine/${division.slug}/${category.id}`, label: category.name })),
  ]),
];

const titleFor = (path: string) => upcoming.find((page) => page.path === path)?.label;

export function generateStaticParams() {
  const paths = [...new Set(upcoming.map((page) => page.path))];
  return locales.flatMap((lang) => paths.map((path) => ({ lang, slug: path.split("/").filter(Boolean) })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/[...slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const label = titleFor(`/${slug.join("/")}`);
  return { title: label && hasLocale(lang) ? tr(label, lang) : undefined };
}

export default async function UpcomingPage({ params }: PageProps<"/[lang]/[...slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const label = titleFor(`/${slug.join("/")}`);

  return (
    <section className="wrap grid min-h-[78svh] content-center gap-6 pt-32 pb-24">
      <span className="label text-accent">{dict.soon.kicker}</span>
      <h1 className="display max-w-[16ch] text-[clamp(2.2rem,6vw,5rem)] leading-[0.95] font-extrabold">
        {label ? tr(label, lang) : dict.soon.title}
      </h1>
      <p className="max-w-[52ch] text-lg text-ink-2">
        {label ? `${dict.soon.title} ` : ""}
        {dict.soon.body}
      </p>
      <Link href={href(lang)} className="btn btn-solid justify-self-start">
        {dict.soon.back}
      </Link>
    </section>
  );
}
