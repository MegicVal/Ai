import showcase from "@content/showcase.json";
import { notFound } from "next/navigation";
import { Divisions, Finder, HomeHero, Locations, NewsEvents, Newsletter, Numbers, Sectors, Services, Showcase } from "@/components/home/sections";
import { getDictionary, hasLocale } from "@/lib/i18n";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const section = { lang, dict: getDictionary(lang) };

  return (
    <>
      {/* The hero photo is the largest thing on the first screen: fetch it before anything else. */}
      <link rel="preload" as="image" href={showcase.hero.poster} fetchPriority="high" />
      <HomeHero {...section} />
      <Showcase {...section} />
      <Divisions {...section} />
      <Numbers {...section} />
      <Sectors {...section} />
      <Finder {...section} />
      <Locations {...section} />
      <NewsEvents {...section} />
      <Services {...section} />
      <Newsletter {...section} />
    </>
  );
}
