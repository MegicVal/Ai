"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { fill } from "@/lib/i18n";
import type { StageControl, StagePart, ViewerLabels, ViewerSource } from "./types";

// three.js and the scene are a separate chunk, fetched when the viewer comes on screen.
const MachineCanvas = dynamic(() => import("./MachineCanvas"), { ssr: false });

interface MachineViewerProps {
  name: string;
  source: ViewerSource;
  parts: StagePart[];
  labels: ViewerLabels;
  className?: string;
}

type Status = "idle" | "loading" | "ready" | "unsupported";

/** Interactive 3D model: drag to rotate, zoom, explode into components, tap a component for its card. */
export function MachineViewer({ name, source, parts, labels, className = "" }: MachineViewerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const control = useRef<StageControl>({ goal: 0, zoom: 1, dragT: 0, dragP: 0, selected: null, reduce: false, balloons: [] });
  const drag = useRef<{ x: number; y: number; t: number; p: number } | null>(null);
  const [amount, setAmount] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [inView, setInView] = useState(false);

  const select = useCallback((partId: string | null) => {
    control.current.selected = partId;
    setSelected(partId);
  }, []);

  const explodeTo = useCallback((value: number) => {
    control.current.goal = value / 100;
    setAmount(value);
  }, []);

  // Load the scene the first time the viewer scrolls into view; pause it when off screen.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    control.current.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (!entry.isIntersecting) return;
        setStatus((current) => {
          if (current !== "idle") return current;
          return document.createElement("canvas").getContext("webgl2") ? "loading" : "unsupported";
        });
      },
      { rootMargin: "200px" },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const onPointerDown = (event: PointerEvent) => {
    drag.current = { x: event.clientX, y: event.clientY, t: control.current.dragT, p: control.current.dragP };
  };
  const onPointerMove = (event: PointerEvent) => {
    const start = drag.current;
    if (!start) return;
    control.current.dragT = start.t - (event.clientX - start.x) * 0.006;
    control.current.dragP = Math.max(-0.4, Math.min(0.7, start.p - (event.clientY - start.y) * 0.004));
  };
  const endDrag = () => {
    drag.current = null;
  };
  const zoomBy = (factor: number) => {
    control.current.zoom = Math.max(0.45, Math.min(1.6, control.current.zoom * factor));
  };
  // Pinch on a trackpad arrives as ctrl+wheel; plain wheel keeps scrolling the page.
  const onWheel = (event: WheelEvent) => {
    if (event.ctrlKey) zoomBy(event.deltaY > 0 ? 1.06 : 0.94);
  };
  const pick = useCallback(
    (partId: string) => {
      select(partId);
      if (control.current.goal < 0.5) explodeTo(100);
    },
    [explodeTo, select],
  );

  const active = parts.find((part) => part.id === selected);
  const activeIndex = active ? parts.indexOf(active) : -1;
  const open = amount > 50;

  return (
    <div ref={rootRef} className={`viewer ${className}`} data-open={open}>
      <div className="viewer-giant" aria-hidden="true">
        {name}
      </div>
      <div
        className="viewer-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
        onWheel={onWheel}
      >
        {(status === "loading" || status === "ready") && (
          <MachineCanvas
            key={`${source.archetype}-${source.variant}`}
            source={source}
            parts={parts}
            control={control}
            active={inView}
            label={`${name}. ${labels.canvas}`}
            onSelect={pick}
            onReady={() => setStatus("ready")}
          />
        )}
      </div>
      <p className="viewer-tag label">{status === "unsupported" ? labels.noWebgl : labels.placeholder}</p>
      {status !== "ready" && status !== "unsupported" && <p className="viewer-loading label">3D…</p>}

      <div className="viewer-balloons">
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

      <ul className="viewer-parts" aria-label={labels.components}>
        {parts.map((part, index) => (
          <li key={part.id}>
            <button type="button" aria-pressed={selected === part.id} onClick={() => (selected === part.id ? select(null) : pick(part.id))}>
              <b>{index + 1}</b>
              <span>{part.name}</span>
            </button>
          </li>
        ))}
      </ul>

      {active && (
        <aside className="viewer-card" aria-live="polite">
          <button
            type="button"
            className="absolute top-2 right-2 grid size-8 cursor-pointer place-items-center text-lg text-fog"
            aria-label={labels.closeCard}
            onClick={() => select(null)}
          >
            ×
          </button>
          <span className="label text-hot">{fill(labels.componentOf, { n: activeIndex + 1, total: parts.length })}</span>
          <h3 className="display text-2xl leading-[1.1] font-semibold">{active.name}</h3>
          <p className="text-[0.95rem] text-fog">{active.role}</p>
        </aside>
      )}

      <div className="viewer-tools">
        <label className="viewer-slider">
          <span className="sr-only">{labels.explodeAmount}</span>
          <input
            type="range"
            min={0}
            max={100}
            value={amount}
            onChange={(event) => explodeTo(Number(event.target.value))}
            aria-label={labels.explodeAmount}
          />
        </label>
        <button type="button" onClick={() => explodeTo(open ? 0 : 100)}>
          {open ? labels.assemble : labels.explode}
        </button>
        <button type="button" aria-label={labels.zoomOut} onClick={() => zoomBy(1.15)}>
          −
        </button>
        <button type="button" aria-label={labels.zoomIn} onClick={() => zoomBy(0.87)}>
          +
        </button>
      </div>
      <p className="viewer-hint label">{labels.hint}</p>
    </div>
  );
}
