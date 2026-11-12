import { PageHero } from "@/components/ui";
import { catalog, getMachine, machinePath } from "@/lib/content";
import { href, tr, type Dictionary, type Locale } from "@/lib/i18n";
import { CatalogBrowser, type CatalogGroup, type CatalogItem } from "./CatalogBrowser";

/** The catalogue, optionally opened on one division or one family. */
export function CatalogPage({ lang, dict, division, category }: { lang: Locale; dict: Dictionary; division?: string; category?: string }) {
  const groups: CatalogGroup[] = catalog.divisions.map((item) => ({
    id: item.id,
    name: tr(item.name, lang),
    categories: item.categories.map((family) => ({ id: family.id, name: tr(family.name, lang) })),
  }));
  const items: CatalogItem[] = catalog.divisions.flatMap((item) =>
    item.categories.flatMap((family) =>
      family.machines.map((entry) => {
        const machine = getMachine(entry.slug);
        return {
          slug: entry.slug,
          name: entry.name,
          summary: tr(entry.summary, lang),
          thumb: machine?.thumb ?? entry.thumb ?? "",
          href: href(lang, machinePath(entry.slug)),
          division: item.id,
          category: family.id,
          categoryName: tr(family.name, lang),
          processes: machine?.processes.map((process) => tr(process.label, lang)) ?? [],
        };
      }),
    ),
  );
  const current = catalog.divisions.find((item) => item.id === division);
  const family = current?.categories.find((item) => item.id === category);

  return (
    <>
      <PageHero
        kicker={dict.catalog.kicker}
        title={family ? tr(family.name, lang) : current ? tr(current.name, lang) : dict.catalog.title}
        lead={current ? tr(current.summary, lang) : dict.catalog.lead}
        image={current?.image ?? catalog.divisions[0].image}
        images={items.filter((item) => (!division || item.division === division) && (!category || item.category === category)).slice(0, 4).map((item) => getMachine(item.slug)?.hero ?? "")}
      />
      <section className="py-12">
        <div className="wrap">
          <CatalogBrowser items={items} groups={groups} labels={dict.catalog} initialDivision={division} initialCategory={category} />
        </div>
      </section>
    </>
  );
}
