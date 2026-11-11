import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentPageView } from "@/components/ContentPageView";
import { getPage, pages, site } from "@/lib/content";
import { getDictionary, hasLocale, href, locales, tr, type Localized } from "@/lib/i18n";

/**
 * Every page without a dedicated route: text pages from content/pages.json, plus an
 * honest "coming soon" for the few that are not written yet (legal texts).
 */
const dedicated = ["/macchine/software"];
const upcoming: { path: string; label: Localized }[] = [...site.legal];

export function generateStaticParams() {
  const paths = [...pages.map((page) => page.path).filter((path) => !dedicated.includes(path)), ...upcoming.map((page) => page.path)];
  return locales.flatMap((lang) => paths.map((path) => ({ lang, slug: path.split("/").filter(Boolean) })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/[...slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const path = `/${slug.join("/")}`;
  const page = getPage(path);
  if (page) return { title: tr(page.title, lang), description: tr(page.lead, lang) };
  const label = upcoming.find((item) => item.path === path)?.label;
  return { title: label ? tr(label, lang) : undefined };
}

export default async function TextPage({ params }: PageProps<"/[lang]/[...slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const path = `/${slug.join("/")}`;
  const page = getPage(path);
  if (page) return <ContentPageView page={page} lang={lang} dict={dict} />;

  const label = upcoming.find((item) => item.path === path)?.label;
  if (!label) notFound();
  return (
    <section className="on-dark bg-ink text-paper">
      <div className="wrap grid min-h-[78svh] content-center gap-6 pt-40 pb-24">
        <span className="label text-accent-hi">{dict.soon.kicker}</span>
        <h1 className="display max-w-[16ch] text-[clamp(2.2rem,6vw,5rem)] leading-[0.95] font-extrabold">{tr(label, lang)}</h1>
        <p className="max-w-[52ch] text-lg text-fog">
          {dict.soon.title} {dict.soon.body}
        </p>
        <Link href={href(lang)} className="btn btn-solid justify-self-start">
          {dict.soon.back}
        </Link>
      </div>
    </section>
  );
}
