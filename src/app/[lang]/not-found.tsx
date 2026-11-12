import Link from "next/link";
import { PageHero } from "@/components/ui";

/**
 * Shown for any address that matches no page. It renders inside the site layout, so the
 * concept banner, header and footer stay. The language is not known here: both are offered.
 */
export default function NotFound() {
  return (
    <PageHero kicker="404" title="Pagina non trovata" lead="Questa pagina non esiste nel concept. · This page does not exist in the concept.">
      <div className="flex flex-wrap gap-3">
        <Link href="/it" className="btn btn-solid">
          Torna alla home
        </Link>
        <Link href="/en" className="btn btn-ghost">
          Back to home
        </Link>
      </div>
    </PageHero>
  );
}
