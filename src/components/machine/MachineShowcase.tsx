"use client";

import Link from "next/link";
import { useState } from "react";
import { MachineViewer } from "./MachineViewer";
import type { StagePart, ViewerLabels, ViewerSource } from "./types";

export interface ShowcaseItem {
  slug: string;
  name: string;
  family: string;
  summary: string;
  href: string;
  source: ViewerSource;
  parts: StagePart[];
}

/** Several machines in one viewer: pick a tab, the model changes. */
export function MachineShowcase({ items, labels, openLabel }: { items: ShowcaseItem[]; labels: ViewerLabels; openLabel: string }) {
  const [index, setIndex] = useState(0);
  const item = items[index];
  return (
    <div className="grid">
      <div role="tablist" aria-label={labels.components} className="wrap flex gap-2 overflow-x-auto pb-4 [scrollbar-width:none]">
        {items.map((entry, position) => (
          <button
            key={entry.slug}
            type="button"
            role="tab"
            id={`showcase-${entry.slug}`}
            aria-selected={position === index}
            onClick={() => setIndex(position)}
            className={`min-h-11 flex-none cursor-pointer rounded-sm border px-4 font-semibold whitespace-nowrap transition-colors ${
              position === index ? "border-accent bg-accent text-white" : "border-line bg-white text-ink-2 hover:border-accent hover:text-accent"
            }`}
          >
            {entry.name}
          </button>
        ))}
      </div>
      <MachineViewer key={item.slug} name={item.name} source={item.source} parts={item.parts} labels={labels} />
      <div className="wrap flex flex-wrap items-center justify-between gap-4 py-6">
        <p className="max-w-[60ch]">
          <span className="label mr-3 text-accent-hi">{item.family}</span>
          <span className="text-ink-2">{item.summary}</span>
        </p>
        <Link href={item.href} className="btn btn-ghost">
          {openLabel}: {item.name}
        </Link>
      </div>
    </div>
  );
}
