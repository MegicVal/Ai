import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogPage } from "@/components/catalog/CatalogPage";
import { ContentPageView } from "@/components/ContentPageView";
import { MachinePage } from "@/components/machine/MachinePage";
import { catalog, getDivision, getMachine, getPage, machines } from "@/lib/content";
import { getDictionary, hasLocale, locales, tr } from "@/lib/i18n";

// One segment covers three things: a division, the software page, or a machine.
const softwarePage = getPage("/macchine/software");

export function generateStaticParams() {
  const slugs = [...catalog.divisions.map((division) => division.slug), "software", ...machines.map((machine) => machine.slug)];
  return locales.flatMap((lang) => slugs.map((slug) => ({ lang, slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/macchine/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const division = getDivision(slug);
  const machine = getMachine(slug);
  if (division) return { title: tr(division.name, lang), description: tr(division.summary, lang) };
  if (machine) return { title: machine.name, description: tr(machine.summary, lang) };
  return { title: slug === "software" && softwarePage ? tr(softwarePage.title, lang) : undefined };
}

export default async function MachineOrDivisionPage({ params }: PageProps<"/[lang]/macchine/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const division = getDivision(slug);
  if (division) return <CatalogPage lang={lang} dict={dict} division={division.id} />;
  if (slug === "software" && softwarePage) return <ContentPageView page={softwarePage} lang={lang} dict={dict} />;
  const machine = getMachine(slug);
  if (!machine) notFound();
  return <MachinePage machine={machine} lang={lang} dict={dict} />;
}
