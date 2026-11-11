import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogPage } from "@/components/catalog/CatalogPage";
import { getDictionary, hasLocale } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/macchine">): Promise<Metadata> {
  const { lang } = await params;
  return { title: hasLocale(lang) ? getDictionary(lang).catalog.title : undefined };
}

export default async function MachinesPage({ params }: PageProps<"/[lang]/macchine">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <CatalogPage lang={lang} dict={getDictionary(lang)} />;
}
