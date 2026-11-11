import Link from "next/link";
import { Suspense } from "react";
import { site } from "@/lib/content";
import { href, tr, type Dictionary, type Locale } from "@/lib/i18n";
import { LanguageSwitch } from "./LanguageSwitch";

/** Required on every page: this is a proposal, not FICEP's website. */
export function ConceptBanner({ text }: { text: string }) {
  return (
    <div className="label sticky top-0 z-40 flex h-(--nh) items-center justify-center bg-ink px-3 text-center text-[10.5px] tracking-[0.05em] text-paper">
      {text}
    </div>
  );
}

function Logo({ lang, label, home }: { lang: Locale; label: string; home: string }) {
  return (
    <Link href={href(lang)} className="flex items-center gap-2.5">
      <span className="display grid size-[26px] place-items-center border-2 border-current text-[13px] font-bold">F</span>
      <span className="label hidden min-[480px]:inline">{label}</span>
      <span className="sr-only">{home}</span>
    </Link>
  );
}

export function Header({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const t = dict.header;
  return (
    <header className="on-dark absolute inset-x-0 z-30 text-paper">
      <div className="wrap flex items-center justify-between gap-4 py-[18px]">
        <Logo lang={lang} label={t.logo} home={t.home} />

        <nav aria-label={t.nav} className="hidden gap-7 text-[0.95rem] font-medium lg:flex">
          {site.nav.map((item) => (
            <Link key={item.id} href={href(lang, item.path)} className="transition-colors hover:text-accent-hi">
              {tr(item.label, lang)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Suspense fallback={null}>
            <LanguageSwitch lang={lang} label={t.language} className="hidden sm:flex" />
          </Suspense>
          <Link href={href(lang, site.finderPath)} className="btn btn-ghost bg-ink/35 backdrop-blur-sm max-sm:hidden">
            {t.finder}
          </Link>

          {/* Mobile menu: a native disclosure, so it works before any script loads. */}
          <details className="group lg:hidden">
            <summary className="btn btn-ghost cursor-pointer list-none bg-ink/35 backdrop-blur-sm [&::-webkit-details-marker]:hidden">
              {t.menu}
            </summary>
            <div className="absolute inset-x-0 top-full border-y border-line bg-paper text-ink shadow-[0_24px_40px_-24px_rgb(12_17_16/0.35)]">
              <nav aria-label={t.nav} className="wrap grid py-3">
                {site.nav.map((item) => (
                  <Link
                    key={item.id}
                    href={href(lang, item.path)}
                    className="display border-b border-line py-3 text-2xl font-semibold"
                  >
                    {tr(item.label, lang)}
                  </Link>
                ))}
                <Link href={href(lang, site.contactPath)} className="border-b border-line py-3 font-medium">
                  {t.contact}
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <Suspense fallback={null}>
                    <LanguageSwitch lang={lang} label={t.language} />
                  </Suspense>
                  <Link href={href(lang, site.finderPath)} className="btn btn-solid">
                    {t.finder}
                  </Link>
                </div>
              </nav>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

export function Footer({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  return (
    <footer className="on-dark bg-ink text-paper">
      <div className="wrap grid gap-12 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_repeat(4,1fr)]">
          <div className="grid content-start gap-4">
            <Logo lang={lang} label={dict.header.logo} home={dict.header.home} />
            <address className="text-sm leading-relaxed text-fog not-italic">
              <span className="label mb-1 block text-steel">{dict.footer.address}</span>
              {site.address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          </div>
          {site.footer.map((column) => (
            <nav key={column.title.it} aria-label={tr(column.title, lang)} className="grid content-start gap-3">
              <h2 className="label text-steel">{tr(column.title, lang)}</h2>
              <ul className="grid gap-2 text-sm">
                {column.links.map((link) => (
                  <li key={link.path}>
                    <Link href={href(lang, link.path)} className="text-fog transition-colors hover:text-accent-hi">
                      {tr(link.label, lang)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="grid gap-4 border-t border-rule pt-6 text-xs text-fog">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {site.legal.map((link) => (
              <li key={link.path}>
                <Link href={href(lang, link.path)} className="hover:text-paper">
                  {tr(link.label, lang)}
                </Link>
              </li>
            ))}
          </ul>
          <p className="max-w-[80ch]">{dict.footer.disclaimer}</p>
        </div>
      </div>
    </footer>
  );
}
