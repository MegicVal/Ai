"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { fill } from "@/lib/i18n";

export interface CatalogItem {
  slug: string;
  name: string;
  summary: string;
  thumb: string;
  href: string;
  division: string;
  category: string;
  categoryName: string;
  processes: string[];
}

export interface CatalogGroup {
  id: string;
  name: string;
  categories: { id: string; name: string }[];
}

interface Labels {
  all: string;
  search: string;
  process: string;
  anyProcess: string;
  count: string;
  none: string;
  reset: string;
}

/** The whole range on one page, narrowed by division, family, process or name. */
export function CatalogBrowser({
  items,
  groups,
  labels,
  initialDivision = "",
  initialCategory = "",
}: {
  items: CatalogItem[];
  groups: CatalogGroup[];
  labels: Labels;
  initialDivision?: string;
  initialCategory?: string;
}) {
  const [division, setDivision] = useState(initialDivision);
  const [category, setCategory] = useState(initialCategory);
  const [process, setProcess] = useState("");
  const [query, setQuery] = useState("");

  const scoped = useMemo(() => items.filter((item) => !division || item.division === division), [items, division]);
  const processes = useMemo(() => [...new Set(scoped.flatMap((item) => item.processes))].sort((a, b) => a.localeCompare(b)), [scoped]);
  const shown = useMemo(() => {
    const text = query.trim().toLowerCase();
    return scoped.filter(
      (item) =>
        (!category || item.category === category) &&
        (!process || item.processes.includes(process)) &&
        (!text || `${item.name} ${item.summary} ${item.categoryName}`.toLowerCase().includes(text)),
    );
  }, [scoped, category, process, query]);

  const categories = groups.filter((group) => !division || group.id === division).flatMap((group) => group.categories);
  const reset = () => {
    setDivision("");
    setCategory("");
    setProcess("");
    setQuery("");
  };
  const tab = (active: boolean) =>
    `min-h-11 cursor-pointer rounded-xs border px-4 font-semibold transition-colors ${
      active ? "border-accent bg-accent text-white" : "border-line bg-white hover:border-accent hover:text-accent"
    }`;
  const chip = (active: boolean) =>
    `label min-h-9 cursor-pointer rounded-xs border px-3 transition-colors ${
      active ? "border-accent bg-mint text-accent" : "border-line bg-white text-ink-2 hover:border-accent hover:text-accent"
    }`;

  return (
    <div className="grid gap-8">
      <div className="grid gap-4 border-y border-line py-5">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={tab(!division)} aria-pressed={!division} onClick={() => { setDivision(""); setCategory(""); }}>
            {labels.all}
          </button>
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              className={tab(division === group.id)}
              aria-pressed={division === group.id}
              onClick={() => { setDivision(group.id); setCategory(""); setProcess(""); }}
            >
              {group.name}
            </button>
          ))}
          <label className="ml-auto flex min-w-0 flex-1 basis-56 items-center sm:max-w-xs">
            <span className="sr-only">{labels.search}</span>
            <input
              id="catalog-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={labels.search}
              className="min-h-11 w-full rounded-xs border border-line bg-white px-4 placeholder:text-ink-2 focus:border-accent"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((item) => (
            <button key={item.id} type="button" className={chip(category === item.id)} aria-pressed={category === item.id} onClick={() => setCategory(category === item.id ? "" : item.id)}>
              {item.name}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2">
            <span className="label text-ink-2">{labels.process}</span>
            <select
              id="catalog-process"
              value={process}
              onChange={(event) => setProcess(event.target.value)}
              className="min-h-9 rounded-xs border border-line bg-white px-2 text-sm"
            >
              <option value="">{labels.anyProcess}</option>
              {processes.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className="label text-ink-2" role="status">
        {fill(labels.count, { n: shown.length })}
      </p>

      {shown.length === 0 ? (
        <div className="grid justify-items-start gap-4 py-10">
          <p className="text-lg text-ink-2">{labels.none}</p>
          <button type="button" className="btn btn-ghost" onClick={reset}>
            {labels.reset}
          </button>
        </div>
      ) : (
        <ul className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((item) => (
            <li key={item.slug}>
              <Link href={item.href} className="group grid h-full content-start gap-3">
                <div className="photo aspect-[16/9] bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element -- remote demo imagery from FICEP's site */}
                  <img src={item.thumb} alt={item.name} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                </div>
                <span className="label text-accent-hi">{item.categoryName}</span>
                <strong className="display text-xl leading-tight font-bold transition-colors group-hover:text-accent">{item.name}</strong>
                <span className="text-[0.95rem] text-ink-2">{item.summary}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
