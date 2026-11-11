import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewsGrid } from "@/components/home/sections";
import { PageHero } from "@/components/ui";
import { home, news } from "@/lib/content";
import { getDictionary, hasLocale, tr } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/news">): Promise<Metadata> {
  const { lang } = await params;
  return { title: hasLocale(lang) ? tr(home.news.title, lang) : undefined };
}

export default async function NewsPage({ params }: PageProps<"/[lang]/news">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <>
      <PageHero kicker={tr(home.news.kicker, lang)} title={tr(home.news.title, lang)} image="https://ficepgroup.com/wp-content/uploads/2023/01/b-news-2.jpg" />
      <section className="py-14">
        <div className="wrap">
          <NewsGrid lang={lang} dict={getDictionary(lang)} items={news} columns="sm:grid-cols-2 lg:grid-cols-3" />
        </div>
      </section>
    </>
  );
}
