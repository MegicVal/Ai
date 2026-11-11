"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { fill } from "@/lib/i18n";
import type { StageControl, StageLabels, StagePart } from "./types";

// three.js and the scene are a separate chunk, fetched on the visitor's first interaction.
const MachineCanvas = dynamic(() => import("./MachineCanvas"), { ssr: false });

interface HeroStageProps {
  id: string;
  slug: string;
  name: string;
  parts: StagePart[];
  labels: StageLabels;
  poster?: { landscape: string; portrait: string };
  /** Server-rendered text chapters that scroll over the pinned stage. */
  children: ReactNode;
}

type Status = "idle" | "loading" | "ready" | "unsupported";

export function HeroStage({ id, slug, name, parts, labels, poster, children }: HeroStageProps) {
  const stageRef = useRef<HTMLElement>(null);
  const control = useRef<StageControl>({
    goal: 0,
    zoom: 1,
    dragT: 0,
    dragP: 0,
    selected: null,
    reduce: false,
    balloons: [],
  });
  const drag = useRef<{ x: number; y: number; t: number; p: number } | null>(null);
  const [dark, setDark] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [inView, setInView] = useState(true);

  const select = useCallback((partId: string | null) => {
    control.current.selected = partId;
    setSelected(partId);
  }, []);

  /** Scroll distance over which the stage stays pinned, and where pinning starts. */
  const measure = useCallback(() => {
    const stage = stageRef.current;
    const sticky = stage?.firstElementChild as HTMLElement | null;
    if (!stage || !sticky) return null;
    const pinTop = parseFloat(getComputedStyle(sticky).top) || 0;
    return { top: stage.getBoundingClientRect().top - pinTop, span: Math.max(1, stage.offsetHeight - sticky.offsetHeight) };
  }, []);

  const scrollToExplode = useCallback(
    (open: boolean) => {
      const m = measure();
      if (!m) return;
      window.scrollTo({
        top: window.scrollY + m.top + m.span * (open ? 0.72 : 0),
        behavior: control.current.reduce ? "auto" : "smooth",
      });
    },
    [measure],
  );

  // Scroll drives the explosion: the stage turns dark and opens between 24% and 60% of its travel.
  useEffect(() => {
    const state = control.current;
    state.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let wasDark = false;
    const onScroll = () => {
      const m = measure();
      if (!m) return;
      const progress = Math.min(1, Math.max(0, -m.top / m.span));
      const x = Math.min(1, Math.max(0, (progress - 0.24) / 0.36));
      state.goal = x * x * (3 - 2 * x);
      const nowDark = state.goal > 0.5;
      if (nowDark === wasDark) return;
      wasDark = nowDark;
      setDark(nowDark);
      if (!nowDark) select(null);
      else if (!state.selected && window.innerWidth >= 900) select(parts[2]?.id ?? null);
    };
    const first = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(first);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [measure, parts, select]);

  // The poster is a still of the same model. The live scene (three.js, ~200 KB) is fetched at the
  // visitor's first sign of intent, so it never competes with the first paint.
  useEffect(() => {
    const intents = ["pointermove", "pointerdown", "touchstart", "keydown", "wheel", "scroll"] as const;
    const stop = () => intents.forEach((type) => window.removeEventListener(type, start));
    const start = () => {
      stop();
      const supported = !!document.createElement("canvas").getContext("webgl2");
      setStatus(supported ? "loading" : "unsupported");
    };
    intents.forEach((type) => window.addEventListener(type, start, { passive: true }));
    return stop;
  }, []);

  // Stop rendering when the stage is off screen.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "100px" });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const onPointerDown = (event: PointerEvent) => {
    drag.current = { x: event.clientX, y: event.clientY, t: control.current.dragT, p: control.current.dragP };
  };
  const onPointerMove = (event: PointerEvent) => {
    const start = drag.current;
    if (!start) return;
    control.current.dragT = start.t - (event.clientX - start.x) * 0.006;
    control.current.dragP = Math.max(-0.45, Math.min(0.5, start.p - (event.clientY - start.y) * 0.004));
  };
  const endDrag = () => {
    drag.current = null;
  };
  const zoomBy = (factor: number) => {
    control.current.zoom = Math.max(0.62, Math.min(1.5, control.current.zoom * factor));
  };
  const pickFromScene = useCallback(
    (partId: string) => {
      select(partId);
      if (control.current.goal < 0.5) scrollToExplode(true);
    },
    [scrollToExplode, select],
  );

  const active = parts.find((part) => part.id === selected);
  const activeIndex = active ? parts.indexOf(active) : -1;

  return (
    <section ref={stageRef} id={id} className="stage" data-dark={dark} aria-label={`${name} ${labels.region}`}>
      <div className="stage-sticky">
        <div className="stage-giant" aria-hidden="true">
          {name}
        </div>
        {poster && (
          <div className="stage-poster" style={{ opacity: status === "ready" ? 0 : 1 }} aria-hidden="true">
            <picture>
              <source media="(max-aspect-ratio: 85/100)" srcSet={poster.portrait} />
              <img src={poster.landscape} alt="" fetchPriority="high" decoding="sync" />
            </picture>
          </div>
        )}
        <div
          className="stage-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onPointerCancel={endDrag}
        >
          {(status === "loading" || status === "ready") && (
            <MachineCanvas
              slug={slug}
              parts={parts}
              control={control}
              active={inView}
              label={labels.canvas}
              onSelect={pickFromScene}
              onReady={() => setStatus("ready")}
            />
          )}
        </div>
        <p className="stage-tag label">{status === "unsupported" ? labels.noWebgl : labels.placeholder}</p>

        <div className="stage-balloons">
          {parts.map((part, index) => (
            <button
              key={part.id}
              ref={(element) => {
                control.current.balloons[index] = element;
              }}
              type="button"
              className="bal"
              tabIndex={-1}
              aria-label={part.name}
              aria-pressed={selected === part.id}
              onClick={() => select(selected === part.id ? null : part.id)}
            >
              {index + 1}
            </button>
          ))}
        </div>

        <ul className="stage-parts" aria-label={labels.components}>
          {parts.map((part, index) => (
            <li key={part.id}>
              <button
                type="button"
                aria-pressed={selected === part.id}
                onClick={() => select(selected === part.id ? null : part.id)}
              >
                <b>{index + 1}</b>
                <span>{part.name}</span>
              </button>
            </li>
          ))}
        </ul>

        {active && (
          <aside className="stage-card" aria-live="polite">
            <button
              type="button"
              className="absolute top-2 right-2 grid size-8 cursor-pointer place-items-center text-lg text-(--sfg2)"
              aria-label={labels.closeCard}
              onClick={() => select(null)}
            >
              ×
            </button>
            <span className="label text-hot">{fill(labels.componentOf, { n: activeIndex + 1, total: parts.length })}</span>
            <h3 className="display text-2xl leading-[1.1] font-semibold">{active.name}</h3>
            <p className="text-[0.95rem] text-(--sfg2)">{active.role}</p>
            <dl className="text-sm">
              {active.specs.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-(--sfg2)">{label}</dt>
                  <dd className="text-right font-mono text-[0.8rem]">{value}</dd>
                </div>
              ))}
            </dl>
            <small className="text-xs text-(--sfg2)">{labels.specNote}</small>
          </aside>
        )}

        <div className="stage-tools">
          <button type="button" className="zoom" aria-label={labels.zoomOut} onClick={() => zoomBy(1.15)}>
            −
          </button>
          <button type="button" className="zoom" aria-label={labels.zoomIn} onClick={() => zoomBy(0.87)}>
            +
          </button>
          <button type="button" onClick={() => scrollToExplode(!dark)}>
            {dark ? labels.assemble : labels.explode}
          </button>
        </div>
      </div>

      <div className="stage-chapters">{children}</div>
    </section>
  );
}
