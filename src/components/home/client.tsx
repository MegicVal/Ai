"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

/**
 * Background film for the hero. The poster paints first; the video file is requested
 * only once the page has loaded, and never when the visitor asks for reduced motion.
 */
export function HeroVideo({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = () => {
      video.src = src;
      video.play().catch(() => {});
    };
    if (document.readyState === "complete") {
      const timer = window.setTimeout(start, 400);
      return () => window.clearTimeout(timer);
    }
    window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, [src]);

  return (
    <video
      ref={ref}
      className="absolute inset-0 -z-20 size-full bg-ink object-cover"
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}

export function NewsletterForm({ placeholder, cta, demo }: { placeholder: string; cta: string; demo: string }) {
  const [sent, setSent] = useState(false);
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSent(true);
  };
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <label htmlFor="newsletter-email" className="sr-only">
          {placeholder}
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          autoComplete="email"
          placeholder={placeholder}
          className="min-h-[46px] min-w-0 flex-1 basis-60 rounded-xs border border-ink bg-white px-4 placeholder:text-ink-2"
        />
        <button type="submit" className="btn btn-solid">
          {cta}
        </button>
      </div>
      <p role="status" className="min-h-5 text-sm text-ink-2">
        {sent ? demo : ""}
      </p>
    </form>
  );
}
