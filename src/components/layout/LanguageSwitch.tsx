"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/lib/i18n";

/** Links to the same page in every language. */
export function LanguageSwitch({ lang, label, className = "" }: { lang: Locale; label: string; className?: string }) {
  const pathname = usePathname() ?? `/${lang}`;
  const rest = pathname.replace(/^\/[^/]+/, "");
  return (
    <nav aria-label={label} className={`label flex items-center gap-1 ${className}`}>
      {locales.map((locale) => (
        <Link
          key={locale}
          href={`/${locale}${rest}`}
          hrefLang={locale}
          aria-current={locale === lang ? "true" : undefined}
          className="grid min-h-9 min-w-9 place-items-center rounded-xs px-1.5 opacity-55 transition-opacity hover:opacity-100 aria-[current=true]:font-medium aria-[current=true]:opacity-100 aria-[current=true]:underline aria-[current=true]:underline-offset-4"
        >
          {locale}
        </Link>
      ))}
    </nav>
  );
}
