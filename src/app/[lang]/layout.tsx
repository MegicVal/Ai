import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { ConceptBanner, Footer, Header } from "@/components/layout/Chrome";
import { MotionRoot } from "@/components/layout/Motion";
import { getDictionary, hasLocale, locales } from "@/lib/i18n";
import "../globals.css";

// Fonts are self-hosted (SIL Open Font License), so nothing is fetched from third parties.
// Archivo is cut down to what headings use: weights 600–800, widths 115–125%, Latin glyphs.
const archivo = localFont({
  src: "../fonts/archivo-display.woff2",
  variable: "--font-archivo",
  weight: "600 800",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "115% 125%" }],
});
const plex = localFont({
  src: [
    { path: "../fonts/ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex",
  display: "swap",
});
const plexMono = localFont({
  src: [
    { path: "../fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
  preload: false,
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const dict = getDictionary(hasLocale(lang) ? lang : "it");
  return {
    title: { default: dict.meta.title, template: `%s · ${dict.meta.title}` },
    description: dict.meta.description,
    robots: { index: false, follow: false },
    alternates: { languages: Object.fromEntries(locales.map((locale) => [locale, `/${locale}`])) },
  };
}

export const viewport: Viewport = { themeColor: "#004d45" };

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);

  return (
    <html lang={lang} className={`${archivo.variable} ${plex.variable} ${plexMono.variable}`}>
      <body>
        {/* Without JavaScript the scroll-in animations would leave content hidden. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <ConceptBanner text={dict.banner} />
        <Header lang={lang} dict={dict} />
        <MotionRoot>
          <main>{children}</main>
        </MotionRoot>
        <Footer lang={lang} dict={dict} />
      </body>
    </html>
  );
}
