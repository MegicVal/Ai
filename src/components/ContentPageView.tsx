import Link from "next/link";
import { Reveal } from "@/components/layout/Motion";
import { PageHero, Photo, arrow, h3 } from "@/components/ui";
import { getPage, type ContentPage } from "@/lib/content";
import { href, tr, type Dictionary, type Locale } from "@/lib/i18n";

/** Generic text page (company, services, Academy…) rendered from content/pages.json. */
export function ContentPageView({ page, lang, dict }: { page: ContentPage; lang: Locale; dict: Dictionary }) {
  const related = (page.related ?? []).map(getPage).filter((item): item is ContentPage => !!item);
  return (
    <>
      <PageHero
        kicker={tr(page.kicker, lang)}
        title={tr(page.title, lang)}
        lead={tr(page.lead, lang)}
        image={page.image}
        images={page.sections.map((section) => section.image ?? "").slice(0, 3)}
      />

      <div className="wrap grid gap-[clamp(48px,7vw,96px)] py-[clamp(56px,8vw,112px)]">
        {page.sections.map((section, index) => (
          <Reveal key={section.title.it}>
            <section className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-16 ${section.image ? "" : "lg:grid-cols-[1fr_1.4fr]"}`}>
              <div className={`grid content-start gap-4 ${section.image && index % 2 ? "lg:order-2" : ""}`}>
                <h2 className={h3}>{tr(section.title, lang)}</h2>
                {!section.image && <span className="h-px w-16 bg-accent" aria-hidden="true" />}
              </div>
              {section.image ? (
                <>
                  <Photo src={section.image} className={`aspect-[3/2] ${index % 2 ? "lg:order-1" : ""}`} />
                  <div className="grid gap-4 lg:col-span-2 lg:max-w-[70ch]">
                    <p className="text-lg text-ink-2">{tr(section.text, lang)}</p>
                    <Items items={section.items} lang={lang} />
                  </div>
                </>
              ) : (
                <div className="grid gap-4">
                  <p className="text-lg text-ink-2">{tr(section.text, lang)}</p>
                  <Items items={section.items} lang={lang} />
                </div>
              )}
            </section>
          </Reveal>
        ))}
      </div>

      {(page.cta || related.length > 0) && (
        <section className="border-t border-line bg-white py-14">
          <div className="wrap grid gap-8">
            {page.cta && (
              <Link href={href(lang, page.cta.path)} className="btn btn-solid justify-self-start">
                {tr(page.cta.label, lang)}
              </Link>
            )}
            {related.length > 0 && (
              <nav aria-label={dict.common.seeAlso} className="grid gap-3">
                <span className="label text-ink-2">{dict.common.seeAlso}</span>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {related.map((item) => (
                    <li key={item.path}>
                      <Link href={href(lang, item.path)} className="group flex items-baseline justify-between gap-4 border-t border-line py-4 hover:text-accent">
                        <strong className="display text-xl font-bold">{tr(item.title, lang)}</strong>
                        <span className="text-steel">{arrow}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
        </section>
      )}
    </>
  );
}

function Items({ items, lang }: { items?: ContentPage["sections"][number]["items"]; lang: Locale }) {
  if (!items?.length) return null;
  return (
    <ul className="border-b border-line">
      {items.map((item) => (
        <li key={item.it} className="border-t border-line py-3 font-medium">
          {tr(item, lang)}
        </li>
      ))}
    </ul>
  );
}
