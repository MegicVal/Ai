import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MachineFinder, type FinderItem, type FinderLabels } from "@/components/finder/MachineFinder";
import { PageHero } from "@/components/ui";
import { catalog, home, machinePath, machines, site } from "@/lib/content";
import { getDictionary, hasLocale, href, tr, type Locale } from "@/lib/i18n";

const labels: Record<Locale, FinderLabels> = {
  it: {
    step: "Domanda {n}",
    division: "In che settore lavori?",
    works: "Che cosa lavori?",
    processes: "Quali lavorazioni ti servono?",
    processesHint: "Scegline una o più: le macchine vengono ordinate per numero di lavorazioni coperte.",
    any: "Non importa",
    result: "Le macchine più adatte",
    resultHint: "Fino a tre proposte, a confronto.",
    matches: "{n} lavorazioni su {total}",
    none: "Nessuna macchina copre queste lavorazioni. Togline qualcuna o scrivici.",
    reset: "Ricomincia",
    open: "Apri la scheda",
    contact: "Parla con un tecnico",
  },
  en: {
    step: "Question {n}",
    division: "Which field do you work in?",
    works: "What do you process?",
    processes: "Which operations do you need?",
    processesHint: "Pick one or more: machines are ranked by how many operations they cover.",
    any: "No preference",
    result: "The best-suited machines",
    resultHint: "Up to three proposals, side by side.",
    matches: "{n} of {total} operations",
    none: "No machine covers these operations. Remove some or get in touch.",
    reset: "Start again",
    open: "Open the page",
    contact: "Talk to a technician",
  },
};

export async function generateMetadata({ params }: PageProps<"/[lang]/trova-la-tua-macchina">): Promise<Metadata> {
  const { lang } = await params;
  return { title: hasLocale(lang) ? getDictionary(lang).header.finder : undefined };
}

export default async function FinderPage({ params }: PageProps<"/[lang]/trova-la-tua-macchina">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const families = new Map(catalog.divisions.flatMap((division) => division.categories.map((category) => [category.id, tr(category.name, lang)] as const)));
  const items: FinderItem[] = machines.map((machine) => ({
    slug: machine.slug,
    name: machine.name,
    summary: tr(machine.summary, lang),
    thumb: machine.thumb,
    href: href(lang, machinePath(machine.slug)),
    division: machine.division,
    family: families.get(machine.category) ?? "",
    works: [...machine.profiles, ...machine.materials].map((item) => tr(item.label, lang)),
    processes: machine.processes.map((item) => tr(item.label, lang)),
  }));

  return (
    <>
      <PageHero kicker={tr(home.finder.kicker, lang)} title={tr(home.finder.title, lang)} lead={tr(home.finder.body, lang)} image={catalog.divisions[0].image} />
      <section className="py-14">
        <div className="wrap">
          <MachineFinder
            items={items}
            divisions={catalog.divisions.map((division) => ({ id: division.id, name: tr(division.name, lang), text: tr(division.summary, lang) }))}
            labels={labels[lang]}
            contactHref={href(lang, site.contactPath)}
          />
        </div>
      </section>
    </>
  );
}
