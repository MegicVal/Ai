import Link from "next/link";
import { Suspense } from "react";
import { site } from "@/lib/content";
import { href, tr, type Dictionary, type Locale } from "@/lib/i18n";
import { LanguageSwitch } from "./LanguageSwitch";

/** Required on every page: this is a proposal, not FICEP's website. */
export function ConceptBanner({ text }: { text: string }) {
  return (
    <div className="label sticky top-0 z-40 flex h-(--nh) items-center justify-center bg-deep px-3 text-center text-[10.5px] tracking-[0.05em] text-white">
      {text}
    </div>
  );
}

function Logo({ lang, label, home }: { lang: Locale; label: string; home: string }) {
  return (
    <Link href={href(lang)} className="flex items-center gap-2.5">
      <span className="display grid size-[28px] place-items-center rounded-sm border-2 border-current text-[13px] font-bold">F</span>
      <span className="label hidden min-[480px]:inline">{label}</span>
      <span className="sr-only">{home}</span>
    </Link>
  );
}

/** Sits over the hero picture, so it is white; the picture carries a dark fade at the top. */
export function Header({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const t = dict.header;
  return (
    <header className="absolute inset-x-0 z-30 text-white">
      <div className="wrap flex items-center justify-between gap-4 py-[18px]">
        <Logo lang={lang} label={t.logo} home={t.home} />

        <nav aria-label={t.nav} className="hidden gap-7 text-[0.95rem] font-medium lg:flex">
          {site.nav.map((item) => (
            <Link
              key={item.id}
              href={href(lang, item.path)}
              className="relative py-1 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform hover:after:scale-x-100"
            >
              {tr(item.label, lang)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Suspense fallback={null}>
            <LanguageSwitch lang={lang} label={t.language} className="hidden sm:flex" />
          </Suspense>
          <Link href={href(lang, site.finderPath)} className="btn btn-glass max-sm:hidden">
            {t.finder}
          </Link>

          {/* Mobile menu: a native disclosure, so it works before any script loads. */}
          <details className="group lg:hidden">
            <summary className="btn btn-glass cursor-pointer list-none [&::-webkit-details-marker]:hidden">{t.menu}</summary>
            <div className="absolute inset-x-0 top-full bg-white text-ink shadow-(--shadow)">
              <nav aria-label={t.nav} className="wrap grid py-3">
                {site.nav.map((item) => (
                  <Link key={item.id} href={href(lang, item.path)} className="display border-b border-line py-3 text-2xl font-semibold text-accent">
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
    <footer className="bg-accent text-white">
      <div className="wrap grid gap-12 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_repeat(4,1fr)]">
          <div className="grid content-start gap-4">
            <Logo lang={lang} label={dict.header.logo} home={dict.header.home} />
            <address className="text-sm leading-relaxed text-white/85 not-italic">
              <span className="label mb-1 block text-white/60">{dict.footer.address}</span>
              {site.address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          </div>
          {site.footer.map((column) => (
            <nav key={column.title.it} aria-label={tr(column.title, lang)} className="grid content-start gap-3">
              <h2 className="label text-white/60">{tr(column.title, lang)}</h2>
              <ul className="grid gap-2 text-sm">
                {column.links.map((link) => (
                  <li key={link.path}>
                    <Link href={href(lang, link.path)} className="text-white/85 underline-offset-4 transition-colors hover:text-white hover:underline">
                      {tr(link.label, lang)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="grid gap-4 border-t border-white/25 pt-6 text-xs text-white/80">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {site.legal.map((link) => (
              <li key={link.path}>
                <Link href={href(lang, link.path)} className="hover:text-white hover:underline">
                  {tr(link.label, lang)}
                </Link>
              </li>
            ))}
          </ul>
          <p className="max-w-[90ch]">{dict.footer.disclaimer}</p>
        </div>
      </div>
    </footer>
  );
}
