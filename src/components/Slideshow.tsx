"use client";

import { useEffect, useRef, useState } from "react";

interface SlideshowProps {
  images: string[];
  alt?: string;
  className?: string;
  /** Milliseconds each picture stays up. */
  interval?: number;
  /** First picture is above the fold: load it eagerly and with priority. */
  priority?: boolean;
  /** Show arrows and thumbnails (gallery) instead of the discreet progress bars (hero). */
  controls?: boolean;
  labels?: { previous: string; next: string; show: string };
}

/**
 * Pictures that follow one another like a film: slow zoom, soft cross-fade.
 * Runs only while on screen; with "reduce motion" it stays on the first picture
 * and changes only when asked. Later pictures are requested just before their turn.
 */
export function Slideshow({ images, alt = "", className = "", interval = 5200, priority = false, controls = false, labels }: SlideshowProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(1);
  const [playing, setPlaying] = useState(false);
  const count = images.length;

  useEffect(() => {
    const root = rootRef.current;
    if (!root || count < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(([entry]) => setPlaying(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(root);
    return () => observer.disconnect();
  }, [count]);

  useEffect(() => {
    if (!playing) return;
    // fetch the next picture early, then switch to it
    const preload = window.setTimeout(() => setLoaded((value) => Math.min(count, Math.max(value, index + 2))), interval * 0.45);
    const advance = window.setTimeout(() => setIndex((value) => (value + 1) % count), interval);
    return () => {
      window.clearTimeout(preload);
      window.clearTimeout(advance);
    };
  }, [playing, index, interval, count]);

  const go = (next: number) => {
    const target = (next + count) % count;
    setLoaded((value) => Math.max(value, target + 1));
    setIndex(target);
  };

  return (
    <div ref={rootRef} className={`slides ${className}`} data-playing={playing}>
      {images.slice(0, Math.max(loaded, index + 1)).map((src, position) => (
        // eslint-disable-next-line @next/next/no-img-element -- remote demo imagery from FICEP's site
        <img
          key={src}
          src={src}
          alt={position === index ? alt : ""}
          className="slide"
          data-on={position === index}
          data-pan={position % 2 ? "b" : "a"}
          loading={position === 0 && priority ? "eager" : "lazy"}
          fetchPriority={position === 0 && priority ? "high" : undefined}
          decoding="async"
          referrerPolicy="no-referrer"
        />
      ))}

      {count > 1 && !controls && (
        <div className="slide-bars" aria-hidden="true">
          {images.map((src, position) => (
            <span key={src} data-state={position < index ? "done" : position === index ? "on" : "todo"}>
              <i key={`${index}-${playing}`} style={{ animationDuration: `${interval}ms` }} />
            </span>
          ))}
        </div>
      )}

      {count > 1 && controls && labels && (
        <>
          <div className="slide-arrows">
            <button type="button" aria-label={labels.previous} onClick={() => go(index - 1)}>
              ←
            </button>
            <span className="label tabular-nums">
              {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
            </span>
            <button type="button" aria-label={labels.next} onClick={() => go(index + 1)}>
              →
            </button>
          </div>
          <ul className="slide-thumbs">
            {images.map((src, position) => (
              <li key={src}>
                <button type="button" aria-label={`${labels.show} ${position + 1}`} aria-pressed={position === index} onClick={() => go(position)}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- remote demo imagery from FICEP's site */}
                  <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
