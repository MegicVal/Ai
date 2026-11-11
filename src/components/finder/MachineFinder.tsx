"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { fill } from "@/lib/i18n";

export interface FinderItem {
  slug: string;
  name: string;
  summary: string;
  thumb: string;
  href: string;
  division: string;
  family: string;
  works: string[];
  processes: string[];
}

export interface FinderLabels {
  step: string;
  division: string;
  works: string;
  processes: string;
  processesHint: string;
  any: string;
  result: string;
  resultHint: string;
  matches: string;
  none: string;
  reset: string;
  open: string;
  contact: string;
}

/** Three questions that narrow the range down to at most three machines, compared side by side. */
export function MachineFinder({
  items,
  divisions,
  labels,
  contactHref,
}: {
  items: FinderItem[];
  divisions: { id: string; name: string; text: string }[];
  labels: FinderLabels;
  contactHref: string;
}) {
  const [division, setDivision] = useState("");
  const [work, setWork] = useState("");
  const [wanted, setWanted] = useState<string[]>([]);

  const inDivision = useMemo(() => items.filter((item) => item.division === division), [items, division]);
  const works = useMemo(() => [...new Set(inDivision.flatMap((item) => item.works))].sort((a, b) => a.localeCompare(b)), [inDivision]);
  const candidates = useMemo(() => inDivision.filter((item) => !work || item.works.includes(work)), [inDivision, work]);
  const processes = useMemo(() => [...new Set(candidates.flatMap((item) => item.processes))].sort((a, b) => a.localeCompare(b)), [candidates]);
  const ranked = useMemo(
    () =>
      candidates
        .map((item) => ({ item, hits: wanted.filter((name) => item.processes.includes(name)).length }))
        .filter((entry) => wanted.length === 0 || entry.hits > 0)
        .sort((a, b) => b.hits - a.hits || a.item.processes.length - b.item.processes.length)
        .slice(0, 3),
    [candidates, wanted],
  );

  const choose = (active: boolean) =>
    `min-h-11 cursor-pointer rounded-xs border px-4 py-2 text-left font-semibold transition-colors ${
      active ? "border-accent bg-accent text-white" : "border-line bg-white hover:border-ink"
    }`;
  const toggle = (name: string) => setWanted((list) => (list.includes(name) ? list.filter((item) => item !== name) : [...list, name]));
  const reset = () => {
    setDivision("");
    setWork("");
    setWanted([]);
  };
  const heading = (number: number, text: string) => (
    <h2 className="flex items-baseline gap-4">
      <span className="font-mono text-xs text-accent tabular-nums">{fill(labels.step, { n: number })}</span>
      <span className="display text-[clamp(1.4rem,2.8vw,2.2rem)] leading-tight font-bold">{text}</span>
    </h2>
  );

  return (
    <div className="grid gap-12">
      <section className="grid gap-5">
        {heading(1, labels.division)}
        <div className="grid gap-3 sm:grid-cols-2">
          {divisions.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={division === item.id}
              className={`${choose(division === item.id)} grid gap-1 p-5`}
              onClick={() => {
                setDivision(item.id);
                setWork("");
                setWanted([]);
              }}
            >
              <span className="display text-2xl font-bold">{item.name}</span>
              <span className={`text-sm font-normal ${division === item.id ? "text-white/85" : "text-ink-2"}`}>{item.text}</span>
            </button>
          ))}
        </div>
      </section>

      {division && (
        <section className="grid gap-5">
          {heading(2, labels.works)}
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={!work} className={choose(!work)} onClick={() => { setWork(""); setWanted([]); }}>
              {labels.any}
            </button>
            {works.map((name) => (
              <button key={name} type="button" aria-pressed={work === name} className={choose(work === name)} onClick={() => { setWork(name); setWanted([]); }}>
                {name}
              </button>
            ))}
          </div>
        </section>
      )}

      {division && (
        <section className="grid gap-5">
          {heading(3, labels.processes)}
          <p className="text-ink-2">{labels.processesHint}</p>
          <div className="flex flex-wrap gap-2">
            {processes.map((name) => (
              <button key={name} type="button" aria-pressed={wanted.includes(name)} className={choose(wanted.includes(name))} onClick={() => toggle(name)}>
                {name}
              </button>
            ))}
          </div>
        </section>
      )}

      {division && (
        <section className="grid gap-6 border-t border-ink pt-10" aria-live="polite">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="grid gap-2">
              <h2 className="display text-[clamp(1.8rem,4vw,3rem)] leading-none font-extrabold">{labels.result}</h2>
              <p className="text-ink-2">{labels.resultHint}</p>
            </div>
            <button type="button" className="btn btn-ghost" onClick={reset}>
              {labels.reset}
            </button>
          </div>
          {ranked.length === 0 ? (
            <p className="text-lg text-ink-2">{labels.none}</p>
          ) : (
            <ul className="grid gap-5 lg:grid-cols-3">
              {ranked.map(({ item, hits }) => (
                <li key={item.slug} className="grid content-start gap-4 bg-white p-5">
                  <div className="photo aspect-[16/9]">
                    {/* eslint-disable-next-line @next/next/no-img-element -- remote demo imagery from FICEP's site */}
                    <img src={item.thumb} alt={item.name} loading="lazy" referrerPolicy="no-referrer" />
                  </div>
                  <span className="label text-accent">{item.family}</span>
                  <strong className="display text-2xl leading-tight font-bold">{item.name}</strong>
                  <p className="text-[0.95rem] text-ink-2">{item.summary}</p>
                  {wanted.length > 0 && <p className="label text-ink">{fill(labels.matches, { n: hits, total: wanted.length })}</p>}
                  <ul className="flex flex-wrap gap-1.5">
                    {item.processes.map((name) => (
                      <li
                        key={name}
                        className={`label border px-2 py-1 ${wanted.includes(name) ? "border-accent bg-accent text-white" : "border-line text-ink-2"}`}
                      >
                        {name}
                      </li>
                    ))}
                  </ul>
                  <Link href={item.href} className="btn btn-solid mt-2 justify-self-start">
                    {labels.open}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href={contactHref} className="group justify-self-start font-semibold hover:text-accent">
            {labels.contact} →
          </Link>
        </section>
      )}
    </div>
  );
}
