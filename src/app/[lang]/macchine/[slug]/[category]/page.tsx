import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogPage } from "@/components/catalog/CatalogPage";
import { catalog, getDivision } from "@/lib/content";
import { getDictionary, hasLocale, locales, tr } from "@/lib/i18n";

export function generateStaticParams() {
  return locales.flatMap((lang) =>
    catalog.divisions.flatMap((division) => division.categories.map((category) => ({ lang, slug: division.slug, category: category.id }))),
  );
}

export async function generateMetadata({ params }: PageProps<"/[lang]/macchine/[slug]/[category]">): Promise<Metadata> {
  const { lang, slug, category } = await params;
  const family = getDivision(slug)?.categories.find((item) => item.id === category);
  return { title: family && hasLocale(lang) ? tr(family.name, lang) : undefined };
}

export default async function CategoryPage({ params }: PageProps<"/[lang]/macchine/[slug]/[category]">) {
  const { lang, slug, category } = await params;
  const division = getDivision(slug);
  if (!hasLocale(lang) || !division || !division.categories.some((item) => item.id === category)) notFound();
  return <CatalogPage lang={lang} dict={getDictionary(lang)} division={division.id} category={category} />;
}
