import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/layout/Motion";
import { PageHero, Photo } from "@/components/ui";
import { history } from "@/lib/content";
import { hasLocale, tr } from "@/lib/i18n";

const title = { it: "Storia", en: "History" };
const lead = {
  it: "Due famiglie, Colombo e Giuliani, e quasi un secolo passato a costruire macchine per l'acciaio.",
  en: "Two families, Colombo and Giuliani, and almost a century spent building machines for steel.",
};

export async function generateMetadata({ params }: PageProps<"/[lang]/azienda/storia">): Promise<Metadata> {
  const { lang } = await params;
  return { title: hasLocale(lang) ? tr(title, lang) : undefined };
}

export default async function HistoryPage({ params }: PageProps<"/[lang]/azienda/storia">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <>
      <PageHero
        kicker={lang === "it" ? "Azienda" : "Company"}
        title={tr(title, lang)}
        lead={tr(lead, lang)}
        image="https://ficepgroup.com/wp-content/uploads/2022/10/b-storia.jpg"
      />
      <section className="py-[clamp(56px,8vw,112px)]">
        <ol className="wrap grid gap-0">
          {history.map((step, index) => (
            <li key={step.year} className="grid gap-6 border-t border-line py-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] md:items-center">
              <Reveal>
                <span className="display text-[clamp(3rem,8vw,6.5rem)] leading-[0.85] font-extrabold tracking-[-0.03em] text-accent tabular-nums">
                  {step.year === "Oggi" && lang !== "it" ? "Today" : step.year}
                </span>
              </Reveal>
              <Reveal delay={0.06} className="grid gap-2">
                <h2 className="display text-2xl font-bold">{tr(step.title, lang)}</h2>
                <p className="max-w-[44ch] text-lg text-ink-2">{tr(step.text, lang)}</p>
              </Reveal>
              <Reveal delay={0.12}>
                <Photo src={step.image} alt="" className={`aspect-[4/3] ${index % 2 ? "md:ml-auto md:w-4/5" : "md:w-4/5"}`} />
              </Reveal>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
