import Link from "next/link";
import { Reveal } from "@/components/layout/Motion";
import { Slideshow } from "@/components/Slideshow";
import { HeroShell, MachineCard, Photo, SectionHead, band, h3, pictures, stageParts, viewerLabels } from "@/components/ui";
import { catalog, machines, site, type Labelled, type Machine } from "@/lib/content";
import { href, tr, type Dictionary, type Locale } from "@/lib/i18n";
import { MachineViewer } from "./MachineViewer";

function IconList({ title, items, lang }: { title: string; items: Labelled[]; lang: Locale }) {
  if (!items.length) return null;
  return (
    <div className="grid content-start gap-3">
      <h2 className="label text-ink-2">{title}</h2>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.label.it} className="flex items-center gap-2.5 rounded-sm border border-line bg-white py-2 pr-3.5 pl-2.5 text-sm font-medium">
            {item.icon && (
              // eslint-disable-next-line @next/next/no-img-element -- FICEP's own pictogram, loaded from their site
              <img src={item.icon} alt="" width={26} height={26} loading="lazy" referrerPolicy="no-referrer" className="size-[26px] object-contain" />
            )}
            {tr(item.label, lang)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One machine: photo hero, what it does, 3D model, features, data, gallery, video. */
export function MachinePage({ machine, lang, dict }: { machine: Machine; lang: Locale; dict: Dictionary }) {
  const t = dict.machine;
  const division = catalog.divisions.find((item) => item.id === machine.division);
  const family = division?.categories.find((item) => item.id === machine.category);
  const related = machines.filter((item) => item.category === machine.category && item.slug !== machine.slug).slice(0, 4);

  return (
    <>
      <HeroShell images={pictures(machine.hero, ...machine.gallery.slice(0, 4))} tall>
          <nav aria-label="Breadcrumb" className="label flex flex-wrap gap-x-2 text-ink-2">
            <Link href={href(lang, "/macchine")} className="hover:text-accent">
              {dict.catalog.kicker}
            </Link>
            <span aria-hidden="true">/</span>
            {division && (
              <Link href={href(lang, `/macchine/${division.slug}`)} className="hover:text-accent">
                {tr(division.name, lang)}
              </Link>
            )}
            <span aria-hidden="true">/</span>
            {division && family && (
              <Link href={href(lang, `/macchine/${division.slug}/${family.id}`)} className="hover:text-accent">
                {tr(family.name, lang)}
              </Link>
            )}
          </nav>
          <h1 className="display text-[clamp(2.8rem,9vw,7.5rem)] leading-[0.88] font-bold text-accent">{machine.name}</h1>
          <p className="max-w-[50ch] text-xl text-ink-2">{tr(machine.descriptor, lang)}</p>
          <div className="flex flex-wrap gap-2.5 pt-2">
            <Link href={href(lang, site.contactPath)} className="btn btn-solid">
              {t.requestInfo}
            </Link>
            <a href="#modello-3d" className="btn btn-ghost">
              {t.view3d}
            </a>
          </div>
      </HeroShell>

      <section className="py-14">
        <div className="wrap grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <p className="display text-[clamp(1.4rem,2.6vw,2.1rem)] leading-tight font-semibold text-accent">{tr(machine.summary, lang)}</p>
          <div className="grid gap-7">
            <IconList title={t.processes} items={machine.processes} lang={lang} />
            <IconList title={t.profiles} items={machine.profiles} lang={lang} />
            <IconList title={t.materials} items={machine.materials} lang={lang} />
            {machine.materialsNote && (
              <div className="grid content-start gap-3">
                <h2 className="label text-ink-2">{t.materials}</h2>
                <p className="max-w-[60ch] rounded-sm border border-line bg-white px-3.5 py-2.5 text-sm font-medium">{tr(machine.materialsNote, lang)}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="modello-3d" className="bg-white" aria-labelledby="viewer-title">
        <div className="wrap grid gap-3 pt-14 pb-6 lg:grid-cols-2 lg:items-end">
          <div className="grid gap-3">
            <span className="label text-accent-hi">{t.viewerKicker}</span>
            <h2 id="viewer-title" className={h3}>
              {t.viewerTitle}
            </h2>
          </div>
          <p className="max-w-[50ch] text-ink-2 lg:justify-self-end">{t.viewerBody}</p>
        </div>
        <MachineViewer name={machine.name} source={machine.viewer} parts={stageParts(machine, lang)} labels={viewerLabels(dict)} />
      </section>

      {machine.features.length > 0 && (
        <section className={band} aria-labelledby="features-title">
          <div className="wrap grid gap-10">
            <SectionHead title={t.features} id="features-title" />
            <ul className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
              {machine.features.map((feature, index) => (
                <li key={feature.title.it}>
                  <Reveal delay={(index % 3) * 0.06} className="grid gap-3">
                    {feature.image && <Photo src={feature.image} alt="" className="aspect-[16/10]" />}
                    <h3 className="display text-lg leading-tight font-bold">{tr(feature.title, lang)}</h3>
                    <p className="text-[0.95rem] text-ink-2">{tr(feature.text, lang)}</p>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {machine.advantages.length > 0 && (
        <section className="bg-accent py-16 text-white [&_h2]:text-white" aria-labelledby="advantages-title">
          <div className="wrap grid gap-8 lg:grid-cols-[1fr_2fr]">
            <h2 id="advantages-title" className={h3}>
              {t.advantages}
            </h2>
            <ul className="grid gap-x-10 sm:grid-cols-2">
              {machine.advantages.map((advantage) => (
                <li key={advantage.it} className="border-t border-white/30 py-4 text-lg">
                  {tr(advantage, lang)}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {machine.specs.length > 0 && (
        <section className={`${band} bg-white`} aria-labelledby="specs-title">
          <div className="grid gap-8">
            <div className="wrap">
              <SectionHead title={t.specs} id="specs-title" />
            </div>
            {machine.specs.map((table) => (
              <div key={table.models.join("-")} className="wrap grid gap-3">
                <h3 className="font-semibold">{tr(table.title, lang)}</h3>
                <div className="overflow-x-auto border border-line">
                  <table className="spec-table">
                    <thead>
                      <tr>
                        <th scope="col">{t.model}</th>
                        {table.models.map((model) => (
                          <th key={model} scope="col">
                            {model}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row) => (
                        <tr key={row.label.it}>
                          <th scope="row">{tr(row.label, lang)}</th>
                          {row.values.map((value, index) => (
                            <td key={index}>{value || "—"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            <p className="wrap label text-ink-2">{t.specsNote}</p>
          </div>
        </section>
      )}

      {machine.gallery.length > 0 && (
        <section className={band} aria-labelledby="gallery-title">
          <div className="grid gap-8">
            <div className="wrap">
              <SectionHead title={t.gallery} id="gallery-title" />
            </div>
            <div className="wrap">
              <Slideshow images={machine.gallery} alt={machine.name} controls labels={dict.gallery} interval={4200} className="aspect-[16/9] max-h-[82svh] w-full" />
            </div>
          </div>
        </section>
      )}

      {machine.video && (
        <section className="bg-mint py-16" aria-labelledby="video-title">
          <div className="wrap grid gap-6">
            <h2 id="video-title" className={h3}>
              {t.video}
            </h2>
            <video className="aspect-video w-full rounded-lg bg-ghost shadow-(--shadow)" controls preload="none" poster={machine.hero} playsInline>
              <source src={machine.video} type="video/mp4" />
            </video>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className={band} aria-labelledby="related-title">
          <div className="wrap grid gap-10">
            <SectionHead title={t.related} id="related-title" kicker={family ? tr(family.name, lang) : undefined} />
            <ul className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <li key={item.slug}>
                  <MachineCard machine={item} lang={lang} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="border-t border-line bg-white py-14">
        <div className="wrap flex flex-wrap items-center justify-between gap-6">
          <p className="display max-w-[24ch] text-[clamp(1.5rem,3vw,2.4rem)] leading-tight font-bold">
            {machine.name}: {t.requestInfo.toLowerCase()}
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Link href={href(lang, site.contactPath)} className="btn btn-solid">
              {t.requestInfo}
            </Link>
            <a href={machine.source} className="btn btn-ghost" target="_blank" rel="noreferrer">
              {t.source}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
