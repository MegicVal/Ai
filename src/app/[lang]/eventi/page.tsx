import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventList } from "@/components/home/sections";
import { PageHero } from "@/components/ui";
import { home } from "@/lib/content";
import { getDictionary, hasLocale, tr } from "@/lib/i18n";

const lead = {
  it: "FICEP partecipa a fiere di settore in tutto il mondo e organizza seminari nella propria Academy.",
  en: "FICEP takes part in trade fairs worldwide and hosts seminars at its Academy.",
};

export async function generateMetadata({ params }: PageProps<"/[lang]/eventi">): Promise<Metadata> {
  const { lang } = await params;
  return { title: hasLocale(lang) ? tr(home.events.title, lang) : undefined };
}

export default async function EventsPage({ params }: PageProps<"/[lang]/eventi">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <>
      <PageHero kicker={tr(home.events.kicker, lang)} title={tr(home.events.title, lang)} lead={tr(lead, lang)} image="https://ficepgroup.com/wp-content/uploads/2023/01/b-eventi.jpg" />
      <section className="py-14">
        <div className="wrap max-w-[900px]">
          <EventList lang={lang} dict={getDictionary(lang)} />
        </div>
      </section>
    </>
  );
}
